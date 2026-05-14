import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { docsCacheDir, fetchApi, origin, referer } from "../shared/constants";
import { markdownToHtml, normalizeDocMarkdown } from "../shared/utils";

const cacheTtlMs = 7 * 24 * 60 * 60 * 1000;

type FetchDocsOptions = {
  docIds?: string[];
  force?: boolean;
  html?: boolean;
  raw?: boolean;
  outputRoot?: string;
};

export function parseDocIds(values: string[] = []): number[] {
  const result = new Set<number>();
  for (const value of values) {
    for (const part of value.split(",")) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      if (!/^\d+$/.test(trimmed)) throw new Error(`无效 docid: ${trimmed}，仅支持数字`);
      result.add(Number(trimmed));
    }
  }
  return [...result];
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

export function buildDocPaths(docId: number, outputRoot = docsCacheDir): { rawPath: string; mdPath: string; htmlPath: string } {
  return {
    rawPath: resolve(outputRoot, "raw", `${docId}.json`),
    mdPath: resolve(outputRoot, "markdown", `${docId}.md`),
    htmlPath: resolve(outputRoot, "html", `${docId}.html`),
  };
}

async function fetchDoc(docId: number | string): Promise<Record<string, unknown>> {
  const response = await fetch(fetchApi, {
    method: "POST",
    headers: {
      accept: "application/json, text/plain, */*",
      "content-type": "application/json",
      Referer: referer,
      Origin: origin,
    },
    body: JSON.stringify({ menuId: String(docId) }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

export async function fetchDocs(options: FetchDocsOptions) {
  const docIds = parseDocIds(options.docIds);
  if (!docIds.length) {
    throw new Error("请至少通过 --docid 传入一个文档编号；docid 来自 xft-cli api interfaces 返回结果");
  }

  const outputRoot = resolve(options.outputRoot ?? docsCacheDir);
  const outputDirs = new Set<string>();

  for (const docId of docIds) {
    const fallbackName = `doc-${docId}`;
    const { rawPath, mdPath, htmlPath } = buildDocPaths(docId, outputRoot);
    const hasFreshMarkdown = !options.force && isFresh(mdPath);
    let payload: Record<string, unknown> | undefined;
    let markdown = hasFreshMarkdown ? readFileSync(mdPath, "utf-8") : undefined;

    if (!hasFreshMarkdown || (options.raw && !existsSync(rawPath))) {
      payload = await fetchDoc(docId);
      markdown = markdownFromPayload(payload, fallbackName);
      ensureDirFor(mdPath);
      writeFileSync(mdPath, markdown, "utf-8");
    }

    if (options.raw && payload) {
      ensureDirFor(rawPath);
      writeFileSync(rawPath, JSON.stringify(payload, null, 2), "utf-8");
    }

    if (options.html && markdown) {
      ensureDirFor(htmlPath);
      writeFileSync(htmlPath, markdownToHtml(markdown, htmlTitleFromMarkdown(markdown, fallbackName)), "utf-8");
    }

    outputDirs.add(dirname(mdPath));
  }

  return { outputRoot, outputDirs: [...outputDirs] };
}
