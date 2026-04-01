import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { defaultMenuFile, docsCacheDir, fetchApi, origin, referer } from "../shared/constants";
import { flattenNodes, loadMenuTree } from "../shared/menu";
import { markdownToHtml, normalizeDocMarkdown, safeName } from "../shared/utils";
import { getArgValue, getRepeatableArgValues, hasFlag, runCli } from "./common";
import { formatExample, formatOption, helpAnsi, indent, printHelpPage, style } from "./help";

const cacheTtlMs = 7 * 24 * 60 * 60 * 1000;

function parseIds(values: string[]): Set<number> {
  const result = new Set<number>();
  for (const value of values) {
    for (const part of value.split(",")) {
      const trimmed = part.trim();
      if (!trimmed) {
        continue;
      }
      if (!/^\d+$/.test(trimmed)) {
        throw new Error(`无效 id: ${trimmed}，仅支持数字`);
      }
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
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (hasFlag(args, "--help") || hasFlag(args, "-h")) {
    printHelpPage([
      `${style("xft-fetch-docs", helpAnsi.bold, helpAnsi.cyan)} ${style("XFT 文档抓取与缓存工具", helpAnsi.dim)}`,
      "",
      `${style("用法", helpAnsi.bold)}`,
      indent("xft-fetch-docs [--docid 1,2] [--menuid 10] [--menu-file file] [--force] [--html] [--raw]"),
      "",
      `${style("参数", helpAnsi.bold)}`,
      formatOption("--docid <id[,id...]>", "按文档 menuId 抓取；可重复传入，也可用逗号分隔多个 id。"),
      formatOption("--menuid <id[,id...]>", "按菜单路径上的 menuId 抓取；可重复传入，也可用逗号分隔多个 id。"),
      formatOption("--menu-file <path>", "指定自定义菜单索引文件，默认使用包内 references/文档目录.json。"),
      formatOption("--force", "忽略 7 天缓存有效期，强制重新从接口抓取文档。"),
      formatOption("--html", "额外生成 HTML 产物。"),
      formatOption("--raw", "额外生成接口原始 JSON 产物。"),
      "",
      `${style("缓存规则", helpAnsi.bold)}`,
      indent("Markdown 默认缓存到 ~/.xft_config/xft_docs。"),
      indent("若 Markdown 存在且 7 天内未过期，则直接复用。"),
      indent("命令输出只打印文档所在的 markdown 目录路径。"),
      "",
      `${style("示例", helpAnsi.bold)}`,
      formatExample("抓取单个文档", "xft-fetch-docs --docid 12509"),
      "",
      formatExample("强制刷新并生成 HTML", "xft-fetch-docs --docid 12509 --force --html"),
      "",
      formatExample("按菜单 id 抓取", "xft-fetch-docs --menuid 13404"),
    ]);
    return;
  }
  const docIds = parseIds(getRepeatableArgValues(args, "--docid"));
  const menuIds = parseIds(getRepeatableArgValues(args, "--menuid"));
  const menuFile = resolve(getArgValue(args, "--menu-file") ?? defaultMenuFile);
  const forceRefresh = hasFlag(args, "--force");
  const wantHtml = hasFlag(args, "--html");
  const wantRaw = hasFlag(args, "--raw");
  const tree = loadMenuTree(menuFile);
  const outputDirs = new Set<string>();

  for (const topNode of ((tree.body as unknown[]) ?? [])) {
    const nodes: Array<{ menuId?: number | string; menuName: string; menuType?: number | string; restDocFlag?: string; eventDocFlag?: string; pathNames: string[]; pathIds?: Array<number | string>; }> = [];
    flattenNodes(topNode as never, nodes as never[]);
    for (const item of nodes) {
      if (item.menuId === undefined || String(item.menuType ?? "") === "1") {
        continue;
      }
      const menuId = Number(item.menuId);
      if (docIds.size && !docIds.has(menuId)) {
        continue;
      }
      if (menuIds.size && !(item.pathIds ?? []).some((id) => menuIds.has(Number(id)))) {
        continue;
      }
      const { rawPath, mdPath, htmlPath } = buildDocPaths(item.pathNames, item.menuName, menuId);
      const hasFreshMarkdown = !forceRefresh && isFresh(mdPath);
      let cacheHit = hasFreshMarkdown;
      let refreshed = false;
      let payload: Record<string, unknown> | undefined;
      let markdown = hasFreshMarkdown ? readFileSync(mdPath, "utf-8") : undefined;

      if (!hasFreshMarkdown || (wantRaw && !existsSync(rawPath))) {
        payload = await fetchDoc(menuId);
        markdown = markdownFromPayload(payload, item.menuName);
        ensureDirFor(mdPath);
        writeFileSync(mdPath, markdown, "utf-8");
        refreshed = true;
        cacheHit = false;
      }

      if (wantRaw && payload) {
        ensureDirFor(rawPath);
        writeFileSync(rawPath, JSON.stringify(payload, null, 2), "utf-8");
      }

      if (wantHtml && markdown) {
        ensureDirFor(htmlPath);
        writeFileSync(htmlPath, markdownToHtml(markdown, htmlTitleFromMarkdown(markdown, item.menuName)), "utf-8");
      }

      outputDirs.add(dirname(mdPath));
    }
  }

  for (const outputDir of outputDirs) {
    console.log(outputDir);
  }
}

await runCli(main, "xft-fetch-docs");
