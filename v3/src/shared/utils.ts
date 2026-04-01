import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { marked } from "marked";

export function compactJson(value: unknown): string {
  return JSON.stringify(value, null, 0);
}

export function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function parseJsonValue(rawValue: string): unknown {
  try {
    return JSON.parse(rawValue);
  } catch {
    return rawValue;
  }
}

export function ensureParentDir(filePath: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
}

export function readJsonFile<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

export function writeText(filePath: string, content: string): void {
  ensureParentDir(filePath);
  writeFileSync(filePath, content, "utf-8");
}

export function normalizeText(text: string): string {
  return (text || "")
    .trim()
    .toLowerCase()
    .replace(/[\s\u3000]+/g, "")
    .replace(/[^0-9a-z\u4e00-\u9fff]/g, "");
}

export function safeName(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, "_").trim().slice(0, 120) || "unnamed";
}

export function makeNgrams(text: string, size: number): Set<string> {
  if (!text) {
    return new Set();
  }
  if (text.length < size) {
    return new Set([text]);
  }
  return new Set(Array.from({ length: text.length - size + 1 }, (_, index) => text.slice(index, index + size)));
}

export function markdownToHtml(markdown: string, title: string): string {
  const body = marked.parse(markdown) as string;
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>body{font-family:Segoe UI,Helvetica,Arial,sans-serif;line-height:1.6;max-width:1100px;margin:24px auto;padding:0 12px;}table{border-collapse:collapse;width:100%;margin:12px 0;}th,td{border:1px solid #ddd;padding:6px;vertical-align:top;}pre{background:#f6f8fa;padding:12px;overflow:auto;}code{font-family:Consolas,monospace;}</style>
</head>
<body>
${body}
</body>
</html>
`;
}

export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function decodeText(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }
  try {
    return decodeURIComponent(String(value));
  } catch {
    return String(value);
  }
}

function cleanText(value: unknown): string {
  return decodeText(value)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/\\([\[\]().])/g, "$1")
    .replace(/\\"/g, '"')
    .replace(/\\n/g, "\n")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function htmlFragmentToText(fragment: string): string {
  const text = fragment.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "");
  return cleanText(text).replace(/\n/g, "<br>");
}

function htmlTableToMarkdown(tableHtml: string): string {
  const rowMatches = Array.from(tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi));
  const rows = rowMatches
    .map((match) => {
      const cellMatches = Array.from(match[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi));
      return cellMatches.map((cell) => htmlFragmentToText(cell[1]).replace(/\|/g, "\\|"));
    })
    .filter((row) => row.length > 0);

  if (!rows.length) {
    return tableHtml;
  }

  const maxCols = Math.max(...rows.map((row) => row.length));
  for (const row of rows) {
    while (row.length < maxCols) {
      row.push("");
    }
  }

  const [header, ...body] = rows;
  return [
    `| ${header.join(" | ")} |`,
    `| ${Array.from({ length: maxCols }, () => "---").join(" | ")} |`,
    ...body.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");
}

function flattenParamRows(items: unknown, rows: Array<Record<string, unknown>>, parent = ""): void {
  for (const item of (Array.isArray(items) ? items : [])) {
    const element = (item as Record<string, unknown>).elementData as Record<string, unknown> | undefined;
    const name = cleanText(element?.name ?? "");
    const paramName = parent && name ? `${parent}.${name}` : name || parent;
    rows.push({
      name: paramName,
      type: cleanText(element?.type ?? ""),
      required: element?.required,
      label: cleanText(element?.label ?? ""),
      desc: cleanText(element?.desc ?? ""),
      example: cleanText(element?.exampleValue ?? ""),
    });
    const children = (item as Record<string, unknown>).children;
    if (children) {
      flattenParamRows(children, rows, paramName);
    }
  }
}

function restTableToMarkdown(jsonText: string): string {
  try {
    const payload = JSON.parse(jsonText);
    const rows: Array<Record<string, unknown>> = [];
    flattenParamRows(payload, rows);
    if (!rows.length) {
      return "";
    }
    return [
      "| 参数 | 类型 | 必填 | 说明 | 示例 |",
      "|---|---|---|---|---|",
      ...rows.map((row) => {
        const required = row.required === true ? "是" : row.required === false ? "否" : "";
        const desc = String(row.desc || row.label || "").replace(/\n/g, "<br>").replace(/\|/g, "\\|");
        const example = String(row.example || "").replace(/\n/g, "<br>").replace(/\|/g, "\\|");
        const name = String(row.name || "").replace(/\|/g, "\\|");
        const type = String(row.type || "").replace(/\|/g, "\\|");
        return `| ${name} | ${type} | ${required} | ${desc} | ${example} |`;
      }),
    ].join("\n");
  } catch {
    return `\`\`\`text\n${jsonText.trim()}\n\`\`\``;
  }
}

export function normalizeDocMarkdown(docContent: string): string {
  let text = docContent || "";
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  text = text.replace(/<restparamstable>([\s\S]*?)<\/restparamstable>/gi, (_, inner: string) => `\n${restTableToMarkdown(inner)}\n`);
  text = text.replace(/<table[^>]*>[\s\S]*?<\/table>/gi, (table: string) => `\n${htmlTableToMarkdown(table)}\n`);
  text = text
    .replace(/\u00a0/g, " ")
    .replace(/\\([\[\]().])/g, "$1")
    .replace(/^(#{1,6})([^\s#])/gm, "$1 $2")
    .replace(/^\s*#{3,6}请求报文/gm, "### 请求报文")
    .replace(/^\s*#{3,6}响应报文/gm, "### 响应报文")
    .replace(/\n{3,}/g, "\n\n");
  return `${text.trim()}\n`;
}
