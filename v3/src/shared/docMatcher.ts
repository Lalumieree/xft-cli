import { defaultMenuFile } from "./constants";
import { flattenNodes, loadMenuTree } from "./menu";
import { makeNgrams, normalizeText } from "./utils";

const synonymReplacements: Array<[string, string]> = [
  ["建立", "新建"],
  ["创建", "新建"],
  ["新增", "新建"],
  ["添加", "新建"],
  ["发起", "新建"],
  ["获取", "查询"],
  ["查看", "查询"],
  ["检索", "查询"],
  ["搜索", "查询"],
  ["出差", "差旅"],
  ["trip", "差旅"],
  ["travel", "差旅"],
  ["organization", "组织"],
  ["organisation", "组织"],
  ["org", "组织"],
];

const queryNoise = ["请帮我", "帮我", "请", "一下", "我想", "我要", "我需要", "希望", "能否", "可以", "一个", "please", "helpme"];

export interface SearchResult {
  menuId?: number | string;
  menuName: string;
  path: string;
  restDocFlag?: string;
  eventDocFlag?: string;
  score: number;
  reasons: string[];
}

function applySynonyms(text: string): string {
  let normalized = normalizeText(text);
  for (const [oldValue, newValue] of synonymReplacements) {
    normalized = normalized.replaceAll(normalizeText(oldValue), newValue);
  }
  return normalized;
}

export function normalizeQuery(text: string): string {
  let normalized = applySynonyms(text);
  for (const item of queryNoise) {
    normalized = normalized.replaceAll(normalizeText(item), "");
  }
  return normalized;
}

function intersectionSize<T>(left: Set<T>, right: Set<T>): number {
  let count = 0;
  for (const value of left) {
    if (right.has(value)) {
      count += 1;
    }
  }
  return count;
}

export function scoreCandidate(query: string, item: SearchResult): [number, string[]] {
  const rawQuery = normalizeText(query);
  const rawName = normalizeText(item.menuName);
  const rawPath = normalizeText(item.path);
  const nameNorm = applySynonyms(item.menuName);
  const pathNorm = applySynonyms(item.path);
  let score = 0;
  const reasons: string[] = [];
  if (rawQuery === rawName && rawQuery) {
    score += 12000;
    reasons.push("raw-exact-name");
  }
  if (rawQuery === rawPath && rawQuery) {
    score += 11000;
    reasons.push("raw-exact-path");
  }
  if (query === nameNorm && query) {
    score += 10000;
    reasons.push("exact-name");
  }
  if (query === pathNorm && query) {
    score += 9500;
    reasons.push("exact-path");
  }
  if (query && nameNorm.includes(query)) {
    score += 7000 + query.length * 5;
    reasons.push("name-contains-query");
  }
  if (query && pathNorm.includes(query)) {
    score += 5000 + query.length * 3;
    reasons.push("path-contains-query");
  }
  if (nameNorm && query.includes(nameNorm) && nameNorm.length >= 2) {
    score += 3000 + nameNorm.length * 3;
    reasons.push("query-contains-name");
  }
  const queryTrigrams = makeNgrams(query, 3);
  const queryBigrams = makeNgrams(query, 2);
  const nameTrigrams = makeNgrams(nameNorm, 3);
  const nameBigrams = makeNgrams(nameNorm, 2);
  const pathTrigrams = makeNgrams(pathNorm, 3);
  const pathBigrams = makeNgrams(pathNorm, 2);
  const triNameOverlap = intersectionSize(queryTrigrams, nameTrigrams);
  const triPathOverlap = intersectionSize(queryTrigrams, pathTrigrams);
  const biNameOverlap = intersectionSize(queryBigrams, nameBigrams);
  const biPathOverlap = intersectionSize(queryBigrams, pathBigrams);
  const charNameOverlap = intersectionSize(new Set(query.split("")), new Set(nameNorm.split("")));
  if (triNameOverlap) {
    score += triNameOverlap * 120;
    reasons.push(`name-3gram:${triNameOverlap}`);
  }
  if (triPathOverlap) {
    score += triPathOverlap * 60;
    reasons.push(`path-3gram:${triPathOverlap}`);
  }
  if (biNameOverlap) {
    score += biNameOverlap * 35;
    reasons.push(`name-2gram:${biNameOverlap}`);
  }
  if (biPathOverlap) {
    score += biPathOverlap * 15;
    reasons.push(`path-2gram:${biPathOverlap}`);
  }
  if (charNameOverlap) {
    score += charNameOverlap * 5;
  }
  if (item.restDocFlag === "Y") {
    score += 30;
    reasons.push("prefer-rest");
  }
  if (item.eventDocFlag === "Y" && item.restDocFlag !== "Y") {
    score -= 20;
    reasons.push("event-only");
  }
  return [score, reasons];
}

export function searchDocs(query: string, menuFile = defaultMenuFile, topN = 5): SearchResult[] {
  const tree = loadMenuTree(menuFile);
  const nodes: SearchResult[] = [];
  for (const root of ((tree.body as unknown[]) ?? [])) {
    const flattened: Array<{
      menuId?: number | string;
      menuName: string;
      menuType?: number | string;
      restDocFlag?: string;
      eventDocFlag?: string;
      pathNames: string[];
    }> = [];
    flattenNodes(root as never, flattened as never[]);
    for (const item of flattened) {
      if (String(item.menuType ?? "") === "1") {
        continue;
      }
      const result: SearchResult = {
        menuId: item.menuId,
        menuName: item.menuName,
        path: item.pathNames.join(" / "),
        restDocFlag: item.restDocFlag,
        eventDocFlag: item.eventDocFlag,
        score: 0,
        reasons: [],
      };
      const [score, reasons] = scoreCandidate(normalizeQuery(query), result);
      if (score <= 0) {
        continue;
      }
      result.score = score;
      result.reasons = reasons;
      nodes.push(result);
    }
  }
  nodes.sort((left, right) => right.score - left.score || left.path.length - right.path.length || Number(left.menuId ?? 0) - Number(right.menuId ?? 0));
  return nodes.slice(0, Math.max(topN, 1));
}
