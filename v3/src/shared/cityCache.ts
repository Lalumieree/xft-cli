import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { cityEndpoint, defaultCityType, defaultTtlHours } from "./constants";
import { XftClient } from "./xftClient";
import type { XftCredentials } from "./types";

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
    return node.reduce((sum, item) => sum + countCityNodes(item), 0);
  }
  if (!node || typeof node !== "object") {
    return 0;
  }
  const record = node as Record<string, unknown>;
  const current = record.code !== undefined ? 1 : 0;
  return current + ((record.children as unknown[]) ?? []).reduce((sum, item) => sum + countCityNodes(item), 0);
}

export async function fetchCityTree(credentials: XftCredentials, cityType: string, timeout: number): Promise<Record<string, unknown>> {
  const client = new XftClient(credentials, timeout);
  const result = await client.request("GET", cityEndpoint, {}, { type: cityType });
  const response = result.response as Record<string, unknown>;
  if (response.status_code !== 200) {
    throw new Error(`获取城市树失败，HTTP ${response.status_code}: ${JSON.stringify(response.decoded_body)}`);
  }
  return {
    cityType,
    sourceUrl: cityEndpoint,
    fetchedAt: Math.floor(Date.now() / 1000),
    nodeCount: countCityNodes(response.decoded_body),
    data: response.decoded_body,
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
  credentials?: XftCredentials;
  timeout?: number;
  allowStale?: boolean;
}): Promise<[Record<string, unknown>, boolean]> {
  const {
    cacheFile,
    cityType = defaultCityType,
    ttlHours = defaultTtlHours,
    forceRefresh = false,
    credentials,
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
    throw new Error("缓存不存在或已过期，且未提供可用于刷新的凭证");
  }
  const payload = await fetchCityTree(credentials, cityType, timeout);
  saveCachePayload(cacheFile, payload);
  return [payload, true];
}
