import { afterEach, describe, expect, it, vi } from "vitest";
import { callApi, listInterfaces } from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("api app", () => {
  it("rejects deprecated direct-call URL options before fetching", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(callApi({ interfaceName: "查询组织列表", url: "https://example.com/demo" })).rejects.toThrow(
      "不再支持本地直连参数 --url",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns only gateway response body data for interface listings", async () => {
    vi.stubEnv("XFT_GATEWAY_BASE_URL", "http://localhost:3000");
    vi.stubEnv("XFT_GATEWAY_TOKEN", "secret-token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: [
              {
                id: "1",
                name: "查询组织列表",
                docid: 12509,
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    await expect(listInterfaces()).resolves.toEqual([
      {
        id: "1",
        name: "查询组织列表",
        docid: 12509,
      },
    ]);
  });
});
