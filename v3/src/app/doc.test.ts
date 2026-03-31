import { describe, expect, it } from "vitest";
import { findDocs, renderDocSearch } from "./doc";

describe("doc app", () => {
  it("finds known menu entries from the bundled menu file", () => {
    const payload = findDocs("获取组织列表", 1);

    expect(payload.normalizedQuery).toBe("查询组织列表");
    expect(payload.results).toHaveLength(1);
    expect(payload.results[0]?.menuName).toBe("获取组织列表");
    expect(payload.results[0]?.path).toContain("组织机构");
  });

  it("renders a readable search result list", () => {
    const output = renderDocSearch({
      query: "获取组织列表",
      normalizedQuery: "查询组织列表",
      menuFile: "E:/mock/menu.json",
      results: [
        {
          menuId: 13264,
          menuName: "获取组织列表",
          path: "组织管理 / 组织机构 / 获取组织列表",
          restDocFlag: "Y",
          eventDocFlag: "N",
          score: 26096,
          reasons: ["exact-name", "prefer-rest"],
        },
      ],
    });

    expect(output).toContain("query=获取组织列表");
    expect(output).toContain("menu_file=E:/mock/menu.json");
    expect(output).toContain("1. [13264] 获取组织列表");
    expect(output).toContain("reasons: exact-name, prefer-rest");
  });
});
