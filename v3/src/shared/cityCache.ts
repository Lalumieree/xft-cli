import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { defaultCityType, defaultGatewayCityInterfaceName, defaultTtlHours } from "./constants";
import { GatewayClient } from "./gatewayClient";
import type { GatewayCredentials } from "./types";

export function cacheIsFresh(cacheFile: string, ttlHours: number): boolean {
  if (!existsSync(cacheFile)) {
    return false;
  }
  const maxAge = Math.max(ttlHours, 0) * 3600 * 1000;
  if (!maxAge) {
    return false;
  }
  return Date.now() - statSync(cacheFile).mtimeMs <= maxAge;
}

export function countCityNodes(node: unknown): number {
  if (Array.isArray(node)) {
    return node.reduce<number>((sum, item) => sum + countCityNodes(item), 0);
  }
  if (!node || typeof node !== "object") {
    return 0;
  }
  const record = node as Record<string, unknown>;
  const current = record.code !== undefined ? 1 : 0;
  const children = Array.isArray(record.children) ? record.children : [];
  return current + children.reduce<number>((sum, item) => sum + countCityNodes(item), 0);
}

export async function fetchCityTree(
  credentials: GatewayCredentials,
  cityType: string,
  timeout: number,
  interfaceName = defaultGatewayCityInterfaceName,
): Promise<Record<string, unknown>> {
  const client = new GatewayClient(credentials, timeout);
  const result = await client.callXft({ interfaceName, query: { type: cityType }, body: {} });
  const response = result.response as Record<string, unknown>;
  if (response.status_code !== 200) {
    throw new Error(`获取城市树失败，HTTP ${response.status_code}: ${JSON.stringify(response.body)}`);
  }
  return {
    cityType,
    sourceInterfaceName: interfaceName,
    fetchedAt: Math.floor(Date.now() / 1000),
    nodeCount: countCityNodes(response.body),
    data: response.body,
  };
}

export function saveCachePayload(cacheFile: string, payload: Record<string, unknown>): void {
  mkdirSync(dirname(cacheFile), { recursive: true });
  writeFileSync(cacheFile, JSON.stringify(payload, null, 2), "utf-8");
}

export function loadCachePayload(cacheFile: string): Record<string, unknown> {
  return JSON.parse(readFileSync(cacheFile, "utf-8"));
}

export async function ensureCityCache(options: {
  cacheFile: string;
  cityType?: string;
  ttlHours?: number;
  forceRefresh?: boolean;
  credentials?: GatewayCredentials;
  cityInterfaceName?: string;
  timeout?: number;
  allowStale?: boolean;
}): Promise<[Record<string, unknown>, boolean]> {
  const {
    cacheFile,
    cityType = defaultCityType,
    ttlHours = defaultTtlHours,
    forceRefresh = false,
    credentials,
    cityInterfaceName = defaultGatewayCityInterfaceName,
    timeout = 30_000,
    allowStale = true,
  } = options;
  const cachedPayload = existsSync(cacheFile) ? loadCachePayload(cacheFile) : null;
  if (cachedPayload && !forceRefresh && cacheIsFresh(cacheFile, ttlHours)) {
    return [cachedPayload, false];
  }
  if (!credentials) {
    if (cachedPayload && allowStale) {
      return [cachedPayload, false];
    }
    throw new Error("缓存不存在或已过期，且未配置网关 token；请先执行 xft-cli auth");
  }
  const payload = await fetchCityTree(credentials, cityType, timeout, cityInterfaceName);
  saveCachePayload(cacheFile, payload);
  return [payload, true];
}
