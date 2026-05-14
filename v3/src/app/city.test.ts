import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { renderCityRefresh, renderCityResolve, resolveCityCodes } from "./city";

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "xft-city-test-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true });
  }
});

describe("city app", () => {
  it("resolves gateway city records with cityCode and cityName fields", async () => {
    const cacheFile = resolve(makeTempDir(), "city_tree_domestic.json");
    writeFileSync(
      cacheFile,
      JSON.stringify({
        cityType: "CITY_TREE_DOMESTIC",
        fetchedAt: 1710000000,
        nodeCount: 2,
        data: [
          { cityCode: "73", cityName: "上海市", cityPath: "CHN,73", pathName: "上海市" },
          { cityCode: "114", cityName: "福州市", cityPath: "CHN,PROVINCE_35,114", pathName: "福建省/福州市" },
        ],
      }),
      "utf-8",
    );

    const payload = await resolveCityCodes({
      fromName: "福州市",
      toName: "上海市",
      cacheFile,
      ttlHours: 24,
    });

    expect(payload.refreshed).toBe(false);
    expect(payload.results.from.resolved).toMatchObject({ code: "114", pathName: "福建省/福州市" });
    expect(payload.results.to.resolved).toMatchObject({ code: "73", pathName: "上海市" });
  });

  it("renders cache refresh status in the expected key=value format", () => {
    const output = renderCityRefresh({
      cacheFile: "E:/mock/cache.json",
      cityType: "CITY_TREE_DOMESTIC",
      cityInterfaceName: "查询所有城市信息",
      nodeCount: 123,
      fetchedAt: 1710000000,
      refreshed: true,
    });

    expect(output).toContain("cache_file=E:/mock/cache.json");
    expect(output).toContain("city_type=CITY_TREE_DOMESTIC");
    expect(output).toContain("city_interface_name=查询所有城市信息");
    expect(output).toContain("node_count=123");
    expect(output).toContain("refreshed=true");
  });

  it("renders resolved city candidates and ambiguous state", () => {
    const output = renderCityResolve({
      cacheFile: "E:/mock/cache.json",
      cityType: "CITY_TREE_DOMESTIC",
      cityInterfaceName: "查询所有城市信息",
      refreshed: false,
      results: {
        from: {
          query: "上海市",
          confidence: "high",
          ambiguous: false,
          resolved: {
            code: "73",
            pathName: "中国/上海市",
            type: "CITY",
          },
          candidates: [],
        },
        to: {
          query: "福州",
          confidence: "low",
          ambiguous: true,
          resolved: null,
          candidates: [],
        },
      },
    });

    expect(output).toContain("cache_file=E:/mock/cache.json");
    expect(output).toContain("[from] query=上海市 confidence=high ambiguous=false");
    expect(output).toContain("resolved: 73 中国/上海市 (CITY)");
    expect(output).toContain("[to] query=福州 confidence=low ambiguous=true");
  });
});
