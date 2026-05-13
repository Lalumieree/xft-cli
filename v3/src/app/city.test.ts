import { describe, expect, it } from "vitest";
import { renderCityRefresh, renderCityResolve } from "./city";

describe("city app", () => {
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
