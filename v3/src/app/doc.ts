import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { defaultMenuFile, docsCacheDir, fetchApi, origin, referer } from "../shared/constants";
import { normalizeQuery, searchDocs } from "../shared/docMatcher";
import { flattenNodes, loadMenuTree } from "../shared/menu";
import { markdownToHtml, normalizeDocMarkdown, safeName } from "../shared/utils";

const cacheTtlMs = 7 * 24 * 60 * 60 * 1000;

type FetchDocsOptions = {
  docIds?: string[];
  menuIds?: string[];
  menuFile?: string;
  force?: boolean;
  html?: boolean;
  raw?: boolean;
};

export function findDocs(query: string, top = 5, menuFile = defaultMenuFile) {
  return {
    query,
    normalizedQuery: normalizeQuery(query),
    menuFile,
    results: searchDocs(query, menuFile, top),
  };
}

export function renderDocSearch(payload: ReturnType<typeof findDocs>): string {
  const lines = [`query=${payload.query}`, `menu_file=${payload.menuFile}`];
  for (const [index, item] of payload.results.entries()) {
    lines.push(`${index + 1}. [${item.menuId}] ${item.menuName} | score=${item.score} | rest=${item.restDocFlag} | event=${item.eventDocFlag}`);
    lines.push(`   path: ${item.path}`);
    lines.push(`   reasons: ${item.reasons.join(", ")}`);
  }
  return lines.join("\n");
}

function parseIds(values: string[] = []): Set<number> {
  const result = new Set<number>();
  for (const value of values) {
    for (const part of value.split(",")) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      if (!/^\d+$/.test(trimmed)) throw new Error(`无效 id: ${trimmed}，仅支持数字`);
      result.add(Number(trimmed));
    }
  }
  return result;
}

function markdownFromPayload(payload: Record<string, unknown>, fallbackName: string): string {
  const docBody = ((payload.body as Record<string, unknown>) ?? {});
  const docName = String(docBody.docName ?? fallbackName);
  const docCnt = docBody.docCnt;
  return typeof docCnt === "string"
    ? `# ${docName}\n\n${normalizeDocMarkdown(docCnt)}`
    : `# ${docName}\n\n\`\`\`json\n${JSON.stringify(docCnt, null, 2)}\n\`\`\`\n`;
}

function htmlTitleFromMarkdown(markdown: string, fallbackName: string): string {
  const heading = markdown.match(/^#\s+(.+)$/m);
  return heading?.[1]?.trim() || fallbackName;
}

function isFresh(filePath: string): boolean {
  return existsSync(filePath) && Date.now() - statSync(filePath).mtimeMs <= cacheTtlMs;
}

function ensureDirFor(filePath: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
}

function buildDocPaths(pathNames: string[], menuName: string, menuId: number): { rawPath: string; mdPath: string; htmlPath: string } {
  const docParentDir = pathNames.slice(0, -1).reduce((dir, seg) => resolve(dir, safeName(seg)), docsCacheDir);
  const outputName = `${menuId}_${safeName(menuName)}`;
  return {
    rawPath: resolve(docParentDir, "raw", `${outputName}.json`),
    mdPath: resolve(docParentDir, "markdown", `${outputName}.md`),
    htmlPath: resolve(docParentDir, "html", `${outputName}.html`),
  };
}

async function fetchDoc(menuId: number | string): Promise<Record<string, unknown>> {
  const response = await fetch(fetchApi, {
    method: "POST",
    headers: {
      accept: "application/json, text/plain, */*",
      "content-type": "application/json",
      Referer: referer,
      Origin: origin,
    },
    body: JSON.stringify({ menuId: String(menuId) }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

export async function fetchDocs(options: FetchDocsOptions) {
  const docIds = parseIds(options.docIds);
  const menuIds = parseIds(options.menuIds);
  const menuFile = resolve(options.menuFile ?? defaultMenuFile);
  const tree = loadMenuTree(menuFile);
  const outputDirs = new Set<string>();

  for (const topNode of ((tree.body as unknown[]) ?? [])) {
    const nodes: Array<{ menuId?: number | string; menuName: string; menuType?: number | string; pathNames: string[]; pathIds?: Array<number | string>; }> = [];
    flattenNodes(topNode as never, nodes as never[]);
    for (const item of nodes) {
      if (item.menuId === undefined || String(item.menuType ?? "") === "1") continue;
      const menuId = Number(item.menuId);
      if (docIds.size && !docIds.has(menuId)) continue;
      if (menuIds.size && !(item.pathIds ?? []).some((id) => menuIds.has(Number(id)))) continue;

      const { rawPath, mdPath, htmlPath } = buildDocPaths(item.pathNames, item.menuName, menuId);
      const hasFreshMarkdown = !options.force && isFresh(mdPath);
      let payload: Record<string, unknown> | undefined;
      let markdown = hasFreshMarkdown ? readFileSync(mdPath, "utf-8") : undefined;

      if (!hasFreshMarkdown || (options.raw && !existsSync(rawPath))) {
        payload = await fetchDoc(menuId);
        markdown = markdownFromPayload(payload, item.menuName);
        ensureDirFor(mdPath);
        writeFileSync(mdPath, markdown, "utf-8");
      }

      if (options.raw && payload) {
        ensureDirFor(rawPath);
        writeFileSync(rawPath, JSON.stringify(payload, null, 2), "utf-8");
      }

      if (options.html && markdown) {
        ensureDirFor(htmlPath);
        writeFileSync(htmlPath, markdownToHtml(markdown, htmlTitleFromMarkdown(markdown, item.menuName)), "utf-8");
      }

      outputDirs.add(dirname(mdPath));
    }
  }

  return { menuFile, outputDirs: [...outputDirs] };
}
