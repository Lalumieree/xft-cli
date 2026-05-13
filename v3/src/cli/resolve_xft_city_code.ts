import { cityCacheDir, defaultTtlHours } from "../shared/constants";
import { renderCityResolve, resolveCityCodes } from "../app/city";
import { getArgValue, getRepeatableArgValues, hasFlag, printJson, runCli } from "./common";
import { formatExample, formatOption, helpAnsi, indent, printHelpPage, style } from "./help";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (hasFlag(args, "--help") || hasFlag(args, "-h")) {
    printHelpPage([
      `${style("xft-resolve-city-code", helpAnsi.bold, helpAnsi.cyan)} ${style("城市名称转 XFT 城市编码工具", helpAnsi.dim)}`,
      "",
      `${style("用法", helpAnsi.bold)}`,
      indent("xft-resolve-city-code [--name xxx] [--from-name xxx] [--to-name xxx] [--top 5] [--json]"),
      "",
      `${style("参数", helpAnsi.bold)}`,
      formatOption("--name <text>", "解析单个地名；可重复传入多次。"),
      formatOption("--from-name <text>", "解析出发地名称。"),
      formatOption("--to-name <text>", "解析目的地名称。"),
      formatOption("--top <number>", "每个查询返回的候选数量，默认 5。"),
      formatOption("--cache-file <path>", "自定义城市缓存文件路径。"),
      formatOption("--ttl-hours <hours>", "缓存有效期，默认 168 小时。"),
      formatOption("--force-refresh", "忽略缓存有效期并尝试通过 xft-gateway 刷新城市树。"),
      formatOption("--interface-name <name>", "xft-gateway 中的城市接口名。"),
      formatOption("--timeout <seconds>", "请求超时时间，默认 30 秒。"),
      formatOption("--json", "以 JSON 格式输出解析结果。"),
      "",
      `${style("结果说明", helpAnsi.bold)}`,
      indent("每个查询会返回 confidence、ambiguous、resolved 和 candidates。"),
      indent("若命中结果不明确，resolved 为 null，请从 candidates 中人工确认。"),
      indent(`默认缓存目录：${cityCacheDir}`),
      "",
      `${style("示例", helpAnsi.bold)}`,
      formatExample("解析单个城市", 'xft-resolve-city-code --name "福州市鼓楼区" --json'),
      "",
      formatExample("同时解析出发地和目的地", 'xft-resolve-city-code --from-name "上海市" --to-name "北京市"'),
    ]);
    return;
  }
  const payload = await resolveCityCodes({
    names: getRepeatableArgValues(args, "--name"),
    fromName: getArgValue(args, "--from-name"),
    toName: getArgValue(args, "--to-name"),
    top: Number(getArgValue(args, "--top") ?? "5"),
    cacheFile: getArgValue(args, "--cache-file"),
    ttlHours: Number(getArgValue(args, "--ttl-hours") ?? String(defaultTtlHours)),
    forceRefresh: hasFlag(args, "--force-refresh"),
    interfaceName: getArgValue(args, "--interface-name"),
    timeoutSeconds: Number(getArgValue(args, "--timeout") ?? "30"),
  });
  if (hasFlag(args, "--json")) {
    printJson(payload);
    return;
  }
  console.log(renderCityResolve(payload));
}

await runCli(main, "xft-resolve-city-code");
