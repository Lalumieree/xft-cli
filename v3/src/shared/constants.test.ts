import { describe, expect, it } from "vitest";
import { defaultGatewayCityInterfaceName, docsCacheDir } from "./constants";

describe("shared constants", () => {
  it("defines cache and gateway defaults", () => {
    expect(docsCacheDir).toContain("xft_docs");
    expect(defaultGatewayCityInterfaceName).toBe("查询所有城市信息");
  });
});
