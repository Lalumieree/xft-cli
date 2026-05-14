import { resolve } from "node:path";
import { cityCacheDir, defaultCityType, defaultTtlHours } from "../shared/constants";
import { ensureCityCache } from "../shared/cityCache";
import { loadNonSensitiveConfig } from "../shared/configStore";
import { resolveGatewayCityInterfaceName, resolveGatewayCredentials } from "../shared/gatewayConfig";

type CityGatewayOptions = {
  interfaceName?: string;
};

type RefreshCityOptions = CityGatewayOptions & {
  cityType?: string;
  cacheFile?: string;
  ttlHours?: number;
  force?: boolean;
  timeoutSeconds?: number;
};

type ResolveCityOptions = CityGatewayOptions & {
  names?: string[];
  fromName?: string;
  toName?: string;
  top?: number;
  cacheFile?: string;
  ttlHours?: number;
  forceRefresh?: boolean;
  timeoutSeconds?: number;
};

const adminSuffixes = ["特别行政区", "自治州", "自治县", "自治区", "地区", "省", "市", "区", "县", "旗"];
const strongReasons = new Set(["exact-path", "exact-name", "simplified-exact-path", "simplified-exact-name", "simplified-path-suffix"]);

function normalizeText(text: string): string {
  return Array.from((text || "").trim().toLowerCase())
    .filter((char) => /[0-9a-z]/.test(char) || (char >= "一" && char <= "鿿"))
    .join("");
}

function simplifyText(text: string): string {
  let simplified = normalizeText((text || "").replaceAll("\\", "/").replaceAll("/", ""));
  for (const suffix of adminSuffixes) simplified = simplified.replaceAll(normalizeText(suffix), "");
  return simplified;
}

function makeNgrams(text: string, size: number): Set<string> {
  if (!text) return new Set();
  if (text.length < size) return new Set([text]);
  return new Set(Array.from({ length: text.length - size + 1 }, (_, index) => text.slice(index, index + size)));
}

function readCityValue(record: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }
  return undefined;
}

function flattenCityNodes(payload: Record<string, unknown>): Array<Record<string, unknown>> {
  const items: Array<Record<string, unknown>> = [];
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) return void node.forEach(visit);
    if (!node || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    const code = readCityValue(record, "code", "cityCode");
    const name = readCityValue(record, "name", "cityName");
    if (code && name) {
      const pathName = readCityValue(record, "pathName") ?? name;
      items.push({
        code,
        name,
        pathName,
        type: readCityValue(record, "type", "cityType") ?? "",
        sourceCode: record.sourceCode ?? record.cityPath,
        nameNorm: normalizeText(name),
        pathNorm: normalizeText(pathName),
        nameSimple: simplifyText(name),
        pathSimple: simplifyText(pathName),
        depth: pathName.split("/").filter(Boolean).length,
      });
    }
    for (const child of ((record.children as unknown[]) ?? [])) visit(child);
  };
  visit(payload.data);
  return items;
}

function intersectionSize<T>(left: Set<T>, right: Set<T>): number {
  let count = 0;
  for (const value of left) if (right.has(value)) count += 1;
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
  if (queryNorm && queryNorm === pathNorm) { score += 260; reasons.push("exact-path"); }
  if (queryNorm && queryNorm === nameNorm) { score += 220; reasons.push("exact-name"); }
  if (querySimple && querySimple === pathSimple) { score += 240; reasons.push("simplified-exact-path"); }
  if (querySimple && querySimple === nameSimple) { score += 210; reasons.push("simplified-exact-name"); }
  if (querySimple && pathSimple.endsWith(querySimple)) { score += 190; reasons.push("simplified-path-suffix"); }
  if (querySimple && nameSimple.endsWith(querySimple)) { score += 140; reasons.push("simplified-name-suffix"); }
  if (querySimple && pathSimple.includes(querySimple)) { score += 90 + querySimple.length * 3; reasons.push("simplified-path-contains"); }
  if (querySimple && nameSimple.includes(querySimple)) { score += 110 + querySimple.length * 4; reasons.push("simplified-name-contains"); }
  const triOverlap = intersectionSize(makeNgrams(querySimple, 3), makeNgrams(pathSimple, 3));
  const biOverlap = intersectionSize(makeNgrams(querySimple, 2), makeNgrams(pathSimple, 2));
  if (triOverlap) { score += triOverlap * 12; reasons.push(`path-3gram:${triOverlap}`); }
  if (biOverlap) { score += biOverlap * 4; reasons.push(`path-2gram:${biOverlap}`); }
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
  return { query: name, confidence: confidenceLabel(candidates), ambiguous, resolved: ambiguous || !candidates.length ? null : candidates[0], candidates };
}

export async function refreshCityCache(options: RefreshCityOptions) {
  const config = loadNonSensitiveConfig();
  const credentials = await resolveGatewayCredentials(config);
  const cityInterfaceName = resolveGatewayCityInterfaceName(config, options.interfaceName);
  const cityType = options.cityType ?? defaultCityType;
  const cacheFile = resolve(options.cacheFile ?? resolve(cityCacheDir, `${cityType.toLowerCase()}.json`));
  const [payload, refreshed] = await ensureCityCache({
    cacheFile,
    cityType,
    ttlHours: options.ttlHours ?? defaultTtlHours,
    forceRefresh: options.force ?? false,
    credentials,
    cityInterfaceName,
    timeout: (options.timeoutSeconds ?? 30) * 1000,
    allowStale: true,
  });
  return { cacheFile, cityType: payload.cityType, cityInterfaceName, nodeCount: payload.nodeCount, fetchedAt: payload.fetchedAt, refreshed };
}

export async function resolveCityCodes(options: ResolveCityOptions) {
  const config = loadNonSensitiveConfig();
  const credentials = await resolveGatewayCredentials(config);
  const cityInterfaceName = resolveGatewayCityInterfaceName(config, options.interfaceName);
  const cacheFile = resolve(options.cacheFile ?? resolve(cityCacheDir, `${defaultCityType.toLowerCase()}.json`));
  const [cachePayload, refreshed] = await ensureCityCache({
    cacheFile,
    cityType: defaultCityType,
    ttlHours: options.ttlHours ?? defaultTtlHours,
    forceRefresh: options.forceRefresh ?? false,
    credentials,
    cityInterfaceName,
    timeout: (options.timeoutSeconds ?? 30) * 1000,
    allowStale: true,
  });
  const queries = [
    ...(options.names ?? []).map((value, index) => [`name${index + 1}`, value] as const),
    ...(options.fromName ? [["from", options.fromName] as const] : []),
    ...(options.toName ? [["to", options.toName] as const] : []),
  ];
  if (!queries.length) throw new Error("请至少通过 --name、--from-name 或 --to-name 传入一个地名");
  const nodes = flattenCityNodes(cachePayload);
  const results = Object.fromEntries(queries.map(([label, value]) => [label, resolveName(value, nodes, options.top ?? 5)]));
  return { cacheFile, cityType: cachePayload.cityType ?? defaultCityType, cityInterfaceName, refreshed, results };
}

export function renderCityRefresh(payload: Awaited<ReturnType<typeof refreshCityCache>>): string {
  return [
    `cache_file=${payload.cacheFile}`,
    `city_type=${payload.cityType}`,
    `city_interface_name=${payload.cityInterfaceName}`,
    `node_count=${payload.nodeCount}`,
    `fetched_at=${payload.fetchedAt}`,
    `refreshed=${String(payload.refreshed).toLowerCase()}`,
  ].join("\n");
}

export function renderCityResolve(payload: Awaited<ReturnType<typeof resolveCityCodes>>): string {
  const lines = [`cache_file=${payload.cacheFile}`, `city_type=${String(payload.cityType)}`, `city_interface_name=${payload.cityInterfaceName}`];
  for (const [label, item] of Object.entries(payload.results)) {
    const value = item as Record<string, unknown>;
    lines.push(`[${label}] query=${value.query} confidence=${value.confidence} ambiguous=${String(value.ambiguous).toLowerCase()}`);
    if (value.resolved) {
      const resolved = value.resolved as Record<string, unknown>;
      lines.push(`  resolved: ${resolved.code} ${resolved.pathName} (${resolved.type})`);
    }
  }
  return lines.join("\n");
}
