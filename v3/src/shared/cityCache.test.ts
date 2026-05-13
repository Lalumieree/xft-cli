import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchCityTree } from "./cityCache";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("cityCache", () => {
  it("refreshes city data through the gateway interface", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify([{ code: "73", name: "上海市" }]), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const payload = await fetchCityTree(
      { gatewayUrl: "http://localhost:3000", token: "secret-token" },
      "CITY_TREE_DOMESTIC",
      30_000,
      "查询所有城市信息",
    );

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/call-xft",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "Xft-gateway-token": "secret-token" }),
        body: JSON.stringify({
          interface_name: "查询所有城市信息",
          query: { type: "CITY_TREE_DOMESTIC" },
          body: {},
        }),
      }),
    );
    expect(payload).toEqual({
      cityType: "CITY_TREE_DOMESTIC",
      sourceInterfaceName: "查询所有城市信息",
      fetchedAt: expect.any(Number),
      nodeCount: 1,
      data: [{ code: "73", name: "上海市" }],
    });
  });
});
