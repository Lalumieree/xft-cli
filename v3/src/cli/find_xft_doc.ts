import { defaultMenuFile } from "../shared/constants";
import { normalizeQuery, searchDocs } from "../shared/docMatcher";
import { getArgValue, hasFlag, printJson, runCli } from "./common";
import { formatExample, formatOption, helpAnsi, indent, printHelpPage, style } from "./help";

function printHelp(): void {
  printHelpPage([
    `${style("xft-find-doc", helpAnsi.bold, helpAnsi.cyan)} ${style("XFT 文档匹配工具", helpAnsi.dim)}`,
    "",
    `${style("用法", helpAnsi.bold)}`,
    indent("xft-find-doc --query <text> [--top 5] [--json] [--menu-file <path>]"),
    "",
    `${style("参数", helpAnsi.bold)}`,
    formatOption("--query <text>", "必填。输入自然语言查询，例如“创建差旅申请单”。"),
    formatOption("--top <number>", "返回候选结果数量，默认 5。"),
    formatOption("--json", "以 JSON 格式输出完整匹配结果。"),
    formatOption("--menu-file <path>", "指定自定义菜单索引文件，默认使用包内 references/文档目录.json。"),
    "",
    `${style("输出说明", helpAnsi.bold)}`,
    indent("默认输出为可读列表，包含 menuId、名称、路径、得分与匹配原因。"),
    indent("传入 --json 时会输出 query、normalizedQuery、menuFile 和 results。"),
    "",
    `${style("示例", helpAnsi.bold)}`,
    formatExample("按自然语言查找接口", 'xft-find-doc --query "创建旅申请单" --top 5'),
    "",
    formatExample("输出 JSON 结果", 'xft-find-doc --query "获取组织列表" --top 3 --json'),
  ]);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (hasFlag(args, "--help") || hasFlag(args, "-h")) {
    printHelp();
    return;
  }
  const query = getArgValue(args, "--query");
  if (!query) {
    throw new Error("--query is required");
  }
  const top = Number(getArgValue(args, "--top") ?? "5");
  const menuFile = getArgValue(args, "--menu-file") ?? defaultMenuFile;
  const results = searchDocs(query, menuFile, top);
  const payload = { query, normalizedQuery: normalizeQuery(query), menuFile, results };
  if (hasFlag(args, "--json")) {
    printJson(payload);
    return;
  }
  console.log(`query=${query}`);
  console.log(`menu_file=${menuFile}`);
  for (const [index, item] of results.entries()) {
    console.log(`${index + 1}. [${item.menuId}] ${item.menuName} | score=${item.score} | rest=${item.restDocFlag} | event=${item.eventDocFlag}`);
    console.log(`   path: ${item.path}`);
    console.log(`   reasons: ${item.reasons.join(", ")}`);
  }
}

await runCli(main, "xft-find-doc");
