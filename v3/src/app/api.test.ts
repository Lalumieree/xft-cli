import { afterEach, describe, expect, it, vi } from "vitest";
import { callApi } from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
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
});
