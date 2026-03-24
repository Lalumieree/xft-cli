import { resolve } from "node:path";
import { cityCacheDir, defaultCityType, defaultTtlHours } from "../shared/constants";
import { ensureCityCache } from "../shared/cityCache";
import { getNonSensitiveValue, loadNonSensitiveConfig, loadSensitiveCredentials, resolveSensitiveValue } from "../shared/configStore";
import type { XftCredentials } from "../shared/types";
import { getArgValue, getRepeatableArgValues, hasFlag, printJson, runCli } from "./common";
import { formatExample, formatOption, helpAnsi, indent, printHelpPage, style } from "./help";

const adminSuffixes = ["特别行政区", "自治州", "自治县", "自治区", "地区", "省", "市", "区", "县", "旗"];
const strongReasons = new Set(["exact-path", "exact-name", "simplified-exact-path", "simplified-exact-name", "simplified-path-suffix"]);

function normalizeText(text: string): string {
  return Array.from((text || "").trim().toLowerCase())
    .filter((char) => /[0-9a-z]/.test(char) || (char >= "一" && char <= "鿿"))
    .join("");
}

function simplifyText(text: string): string {
  let simplified = normalizeText((text || "").replaceAll("\\", "/").replaceAll("/", ""));
  for (const suffix of adminSuffixes) {
    simplified = simplified.replaceAll(normalizeText(suffix), "");
  }
  return simplified;
}

function makeNgrams(text: string, size: number): Set<string> {
  if (!text) return new Set();
  if (text.length < size) return new Set([text]);
  return new Set(Array.from({ length: text.length - size + 1 }, (_, index) => text.slice(index, index + size)));
}

function flattenCityNodes(payload: Record<string, unknown>): Array<Record<string, unknown>> {
  const items: Array<Record<string, unknown>> = [];
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!node || typeof node !== "object") {
      return;
    }
    const record = node as Record<string, unknown>;
    if (record.code !== undefined && record.name) {
      const pathName = String(record.pathName ?? record.name);
      items.push({
        code: String(record.code),
        name: String(record.name),
        pathName,
        type: String(record.type ?? ""),
        sourceCode: record.sourceCode,
        nameNorm: normalizeText(String(record.name)),
        pathNorm: normalizeText(pathName),
        nameSimple: simplifyText(String(record.name)),
        pathSimple: simplifyText(pathName),
        depth: pathName.split("/").filter(Boolean).length,
      });
    }
    for (const child of ((record.children as unknown[]) ?? [])) {
      visit(child);
    }
  };
  visit(payload.data);
  return items;
}

function intersectionSize<T>(left: Set<T>, right: Set<T>): number {
  let count = 0;
  for (const value of left) {
    if (right.has(value)) count += 1;
  }
  return count;
}

function scoreCandidate(query: string, item: Record<string, unknown>): [number, string[]] {
  const queryNorm = normalizeText(query);
  const querySimple = simplifyText(query);
  let score = 0;
  const reasons: string[] = [];
  const pathNorm = String(item.pathNorm);
  const nameNorm = String(item.nameNorm);
  const pathSimple = String(item.pathSimple);
  const nameSimple = String(item.nameSimple);
  if (queryNorm && queryNorm === pathNorm) {
    score += 260;
    reasons.push("exact-path");
  }
  if (queryNorm && queryNorm === nameNorm) {
    score += 220;
    reasons.push("exact-name");
  }
  if (querySimple && querySimple === pathSimple) {
    score += 240;
    reasons.push("simplified-exact-path");
  }
  if (querySimple && querySimple === nameSimple) {
    score += 210;
    reasons.push("simplified-exact-name");
  }
  if (querySimple && pathSimple.endsWith(querySimple)) {
    score += 190;
    reasons.push("simplified-path-suffix");
  }
  if (querySimple && nameSimple.endsWith(querySimple)) {
    score += 140;
    reasons.push("simplified-name-suffix");
  }
  if (querySimple && pathSimple.includes(querySimple)) {
    score += 90 + querySimple.length * 3;
    reasons.push("simplified-path-contains");
  }
  if (querySimple && nameSimple.includes(querySimple)) {
    score += 110 + querySimple.length * 4;
    reasons.push("simplified-name-contains");
  }
  const triOverlap = intersectionSize(makeNgrams(querySimple, 3), makeNgrams(pathSimple, 3));
  const biOverlap = intersectionSize(makeNgrams(querySimple, 2), makeNgrams(pathSimple, 2));
  if (triOverlap) {
    score += triOverlap * 12;
    reasons.push(`path-3gram:${triOverlap}`);
  }
  if (biOverlap) {
    score += biOverlap * 4;
    reasons.push(`path-2gram:${biOverlap}`);
  }
  score -= Math.max(Number(item.depth) - 1, 0);
  return [score, reasons];
}

function isAmbiguous(candidates: Array<Record<string, unknown>>): boolean {
  if (candidates.length <= 1) return false;
  const margin = Number(candidates[0].score) - Number(candidates[1].score);
  if (margin < 25) return true;
  if (Number(candidates[0].score) < 140 && !(candidates[0].reasons as string[]).some((reason) => strongReasons.has(reason))) return true;
  return false;
}

function confidenceLabel(candidates: Array<Record<string, unknown>>): string {
  if (!candidates.length) return "none";
  if ((candidates[0].reasons as string[]).some((reason) => strongReasons.has(reason))) return "high";
  if (Number(candidates[0].score) >= 140) return "medium";
  return "low";
}

function resolveName(name: string, nodes: Array<Record<string, unknown>>, top: number): Record<string, unknown> {
  const candidates = nodes
    .map((node) => {
      const [score, reasons] = scoreCandidate(name, node);
      return score > 0 ? { code: node.code, name: node.name, pathName: node.pathName, type: node.type, sourceCode: node.sourceCode, score, reasons } : undefined;
    })
    .filter(Boolean)
    .sort((left, right) => Number((right as Record<string, unknown>).score) - Number((left as Record<string, unknown>).score))
    .slice(0, Math.max(top, 1)) as Array<Record<string, unknown>>;
  const ambiguous = !candidates.length || isAmbiguous(candidates);
  return {
    query: name,
    confidence: confidenceLabel(candidates),
    ambiguous,
    resolved: ambiguous || !candidates.length ? null : candidates[0],
    candidates,
  };
}

async function resolveCredentials(args: string[], config: Record<string, unknown>): Promise<XftCredentials | undefined> {
  try {
    const storedCredentials = await loadSensitiveCredentials();
    const appid = resolveSensitiveValue(storedCredentials, "app-id", getArgValue(args, "--appid"), "XFT_APPID");
    const authoritySecret = resolveSensitiveValue(storedCredentials, "authority-secret", getArgValue(args, "--authority-secret"), "XFT_AUTHORITY_SECRET");
    const cscappuid =
      getArgValue(args, "--cscappuid") ??
      (getNonSensitiveValue(config, "cscappuid", "csc-app-uid", "cscAppUid") as string | undefined) ??
      process.env.XFT_CSCAPPUID ??
      appid;
    if (!appid || !authoritySecret || !cscappuid) {
      return undefined;
    }
    return { appid, authoritySecret, cscappuid, encryptBody: true, signContentMode: "raw-body" };
  } catch {
    return undefined;
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (hasFlag(args, "--help") || hasFlag(args, "-h")) {
    printHelpPage([
      `${style("xft-resolve-city-code", helpAnsi.bold, helpAnsi.cyan)} ${style("城市名称转 XFT 城市编码工具", helpAnsi.dim)}`,
      "",
      `${style("用法", helpAnsi.bold)}`,
      indent("xft-resolve-city-code [--name xxx] [--from-name xxx] [--to-name xxx] [--top 5] [--json]"),
      "",
      `${style("参数", helpAnsi.bold)}`,
      formatOption("--name <text>", "解析单个地名；可重复传入多次。"),
      formatOption("--from-name <text>", "解析出发地名称。"),
      formatOption("--to-name <text>", "解析目的地名称。"),
      formatOption("--top <number>", "每个查询返回的候选数量，默认 5。"),
      formatOption("--cache-file <path>", "自定义城市缓存文件路径。"),
      formatOption("--ttl-hours <hours>", "缓存有效期，默认 168 小时。"),
      formatOption("--force-refresh", "忽略缓存有效期并尝试刷新城市树。"),
      formatOption("--timeout <seconds>", "请求超时时间，默认 30 秒。"),
      formatOption("--json", "以 JSON 格式输出解析结果。"),
      "",
      `${style("结果说明", helpAnsi.bold)}`,
      indent("每个查询会返回 confidence、ambiguous、resolved 和 candidates。"),
      indent("若命中结果不明确，resolved 为 null，请从 candidates 中人工确认。"),
      indent(`默认缓存目录：${cityCacheDir}`),
      "",
      `${style("示例", helpAnsi.bold)}`,
      formatExample("解析单个城市", 'xft-resolve-city-code --name "福州市鼓楼区" --json'),
      "",
      formatExample("同时解析出发地和目的地", 'xft-resolve-city-code --from-name "上海市" --to-name "北京市"'),
    ]);
    return;
  }
  const config = loadNonSensitiveConfig();
  const credentials = await resolveCredentials(args, config);
  const cacheFile = resolve(getArgValue(args, "--cache-file") ?? resolve(cityCacheDir, `${defaultCityType.toLowerCase()}.json`));
  const [cachePayload, refreshed] = await ensureCityCache({
    cacheFile,
    cityType: defaultCityType,
    ttlHours: Number(getArgValue(args, "--ttl-hours") ?? String(defaultTtlHours)),
    forceRefresh: hasFlag(args, "--force-refresh"),
    credentials,
    timeout: Number(getArgValue(args, "--timeout") ?? "30") * 1000,
    allowStale: true,
  });
  const queries = [
    ...getRepeatableArgValues(args, "--name").map((value, index) => [`name${index + 1}`, value] as const),
    ...(getArgValue(args, "--from-name") ? [["from", getArgValue(args, "--from-name") as string] as const] : []),
    ...(getArgValue(args, "--to-name") ? [["to", getArgValue(args, "--to-name") as string] as const] : []),
  ];
  if (!queries.length) {
    throw new Error("请至少通过 --name、--from-name 或 --to-name 传入一个地名");
  }
  const nodes = flattenCityNodes(cachePayload);
  const results = Object.fromEntries(queries.map(([label, value]) => [label, resolveName(value, nodes, Number(getArgValue(args, "--top") ?? "5"))]));
  const payload = { cacheFile, cityType: cachePayload.cityType ?? defaultCityType, refreshed, results };
  if (hasFlag(args, "--json")) {
    printJson(payload);
    return;
  }
  console.log(`cache_file=${cacheFile}`);
  console.log(`city_type=${String(payload.cityType)}`);
  for (const [label, item] of Object.entries(results)) {
    const value = item as Record<string, unknown>;
    console.log(`[${label}] query=${value.query} confidence=${value.confidence} ambiguous=${String(value.ambiguous).toLowerCase()}`);
    if (value.resolved) {
      const resolved = value.resolved as Record<string, unknown>;
      console.log(`  resolved: ${resolved.code} ${resolved.pathName} (${resolved.type})`);
    }
  }
}

await runCli(main, "xft-resolve-city-code");
