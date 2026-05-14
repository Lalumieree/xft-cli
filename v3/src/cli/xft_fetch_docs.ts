import { fetchDocs } from "../app/doc";
import { getRepeatableArgValues, hasFlag, runCli } from "./common";
import { formatExample, formatOption, helpAnsi, indent, printHelpPage, style } from "./help";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (hasFlag(args, "--help") || hasFlag(args, "-h")) {
    printHelpPage([
      `${style("xft-fetch-docs", helpAnsi.bold, helpAnsi.cyan)} ${style("XFT 文档抓取与缓存工具", helpAnsi.dim)}`,
      "",
      `${style("用法", helpAnsi.bold)}`,
      indent("xft-fetch-docs --docid 1,2 [--force] [--html] [--raw]"),
      "",
      `${style("参数", helpAnsi.bold)}`,
      formatOption("--docid <id[,id...]>", "按 xft-cli api interfaces 返回的 docid 抓取；可重复传入，也可用逗号分隔多个 id。"),
      formatOption("--force", "忽略 7 天缓存有效期，强制重新从接口抓取文档。"),
      formatOption("--html", "额外生成 HTML 产物。"),
      formatOption("--raw", "额外生成接口原始 JSON 产物。"),
      "",
      `${style("缓存规则", helpAnsi.bold)}`,
      indent("Markdown 默认缓存到 ~/.xft_config/xft_docs/markdown。"),
      indent("若 Markdown 存在且 7 天内未过期，则直接复用。"),
      indent("命令输出只打印文档所在的 markdown 目录路径。"),
      "",
      `${style("示例", helpAnsi.bold)}`,
      formatExample("抓取单个文档", "xft-fetch-docs --docid 12509"),
      "",
      formatExample("强制刷新并生成 HTML", "xft-fetch-docs --docid 12509 --force --html"),
    ]);
    return;
  }

  const payload = await fetchDocs({
    docIds: getRepeatableArgValues(args, "--docid"),
    force: hasFlag(args, "--force"),
    html: hasFlag(args, "--html"),
    raw: hasFlag(args, "--raw"),
  });

  for (const outputDir of payload.outputDirs) {
    console.log(outputDir);
  }
}

await runCli(main, "xft-fetch-docs");
