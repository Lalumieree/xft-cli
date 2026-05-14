import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildDocPaths, fetchDocs, parseDocIds } from "./doc";

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "xft-doc-fetch-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  vi.unstubAllGlobals();
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("doc app", () => {
  it("parses repeatable and comma-separated doc ids", () => {
    expect(parseDocIds(["12509, 12510", "12509"])).toEqual([12509, 12510]);
  });

  it("fetches docs directly by docid without a bundled menu index", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            body: {
              docName: "获取组织列表",
              docCnt: "## 请求参数\n\n无",
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );
    const outputRoot = makeTempDir();

    const result = await fetchDocs({ docIds: ["12509"], outputRoot, raw: true });
    const paths = buildDocPaths(12509, outputRoot);

    expect(result.outputDirs).toEqual([expect.stringContaining("markdown")]);
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ menuId: "12509" }),
      }),
    );
    expect(readFileSync(paths.mdPath, "utf-8")).toContain("# 获取组织列表");
    expect(readFileSync(paths.rawPath, "utf-8")).toContain("获取组织列表");
  });
});
