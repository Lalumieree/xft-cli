import { cityCacheDir, defaultCityType, defaultTtlHours } from "../shared/constants";
import { refreshCityCache, renderCityRefresh } from "../app/city";
import { getArgValue, hasFlag, printJson, runCli } from "./common";
import { formatExample, formatOption, helpAnsi, indent, printHelpPage, style } from "./help";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (hasFlag(args, "--help") || hasFlag(args, "-h")) {
    printHelpPage([
      `${style("xft-refresh-city-cache", helpAnsi.bold, helpAnsi.cyan)} ${style("城市缓存刷新工具", helpAnsi.dim)}`,
      "",
      `${style("用法", helpAnsi.bold)}`,
      indent("xft-refresh-city-cache [--force] [--ttl-hours 168] [--cache-file file] [--city-type type] [--interface-name name] [--json]"),
      "",
      `${style("参数", helpAnsi.bold)}`,
      formatOption("--force", "忽略缓存有效期，强制通过 xft-gateway 刷新城市树。"),
      formatOption("--ttl-hours <hours>", "缓存有效期，默认 168 小时。"),
      formatOption("--cache-file <path>", "自定义缓存文件路径。"),
      formatOption("--city-type <type>", "城市树类型，默认 CITY_TREE_DOMESTIC。"),
      formatOption("--interface-name <name>", "xft-gateway 中的城市接口名。"),
      formatOption("--timeout <seconds>", "请求超时时间，默认 30 秒。"),
      formatOption("--json", "以 JSON 格式输出缓存状态。"),
      "",
      `${style("行为说明", helpAnsi.bold)}`,
      indent("命令会优先复用缓存；必要时才通过 xft-gateway 刷新。"),
      indent("若未配置网关 token 且已有缓存，会尽量复用旧缓存。"),
      indent(`默认缓存目录：${cityCacheDir}`),
      "",
      `${style("示例", helpAnsi.bold)}`,
      formatExample("刷新默认国内城市树", "xft-refresh-city-cache --force"),
      "",
      formatExample("输出 JSON 状态", "xft-refresh-city-cache --ttl-hours 24 --json"),
    ]);
    return;
  }
  const result = await refreshCityCache({
    force: hasFlag(args, "--force"),
    ttlHours: Number(getArgValue(args, "--ttl-hours") ?? String(defaultTtlHours)),
    cacheFile: getArgValue(args, "--cache-file"),
    cityType: getArgValue(args, "--city-type") ?? defaultCityType,
    interfaceName: getArgValue(args, "--interface-name"),
    timeoutSeconds: Number(getArgValue(args, "--timeout") ?? "30"),
  });
  if (hasFlag(args, "--json")) {
    printJson(result);
    return;
  }
  console.log(renderCityRefresh(result));
}

await runCli(main, "xft-refresh-city-cache");
