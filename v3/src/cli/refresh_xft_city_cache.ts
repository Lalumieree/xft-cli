import { resolve } from "node:path";
import { cityCacheDir, defaultCityType, defaultTtlHours } from "../shared/constants";
import { ensureCityCache } from "../shared/cityCache";
import { getNonSensitiveValue, loadNonSensitiveConfig, loadSensitiveCredentials, resolveSensitiveValue } from "../shared/configStore";
import type { XftCredentials } from "../shared/types";
import { getArgValue, hasFlag, printJson, runCli } from "./common";
import { formatExample, formatOption, helpAnsi, indent, printHelpPage, style } from "./help";

async function resolveCredentials(args: string[], config: Record<string, unknown>): Promise<XftCredentials | undefined> {
  try {
    const storedCredentials = await loadSensitiveCredentials();
    const appid = resolveSensitiveValue(storedCredentials, "app-id", getArgValue(args, "--appid"), "XFT_APPID");
    const authoritySecret = resolveSensitiveValue(storedCredentials, "authority-secret", getArgValue(args, "--authority-secret"), "XFT_AUTHORITY_SECRET");
    const cscappuid =
      getArgValue(args, "--cscappuid") ??
      (getNonSensitiveValue(config, "cscappuid", "csc-app-uid", "cscAppUid") as string | undefined) ??
      process.env.XFT_CSCAPPUID ??
      appid;
    if (!appid || !authoritySecret || !cscappuid) {
      return undefined;
    }
    return {
      appid,
      authoritySecret,
      cscappuid,
      cscprjcod: (getNonSensitiveValue(config, "cscprjcod", "csc-prjcod", "cscPrjCod") ?? process.env.XFT_CSCPRJCOD) as string | undefined,
      cscusrnbr: (getNonSensitiveValue(config, "cscusrnbr", "csc-usrnbr", "cscUsrNbr") ?? process.env.XFT_CSCUSRNBR) as string | undefined,
      cscusruid: (getNonSensitiveValue(config, "cscusruid", "csc-usruid", "cscUsrUid") ?? process.env.XFT_CSCUSRUID) as string | undefined,
      encryptBody: Boolean(getNonSensitiveValue(config, "encryptBody", "encrypt-body") ?? true),
      signContentMode: ((getNonSensitiveValue(config, "signContentMode", "sign-content-mode") as "raw-body" | "digest-header" | undefined) ?? "raw-body"),
    };
  } catch {
    return undefined;
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (hasFlag(args, "--help") || hasFlag(args, "-h")) {
    printHelpPage([
      `${style("xft-refresh-city-cache", helpAnsi.bold, helpAnsi.cyan)} ${style("城市缓存刷新工具", helpAnsi.dim)}`,
      "",
      `${style("用法", helpAnsi.bold)}`,
      indent("xft-refresh-city-cache [--force] [--ttl-hours 168] [--cache-file file] [--city-type type] [--json]"),
      "",
      `${style("参数", helpAnsi.bold)}`,
      formatOption("--force", "忽略缓存有效期，强制刷新城市树。"),
      formatOption("--ttl-hours <hours>", "缓存有效期，默认 168 小时。"),
      formatOption("--cache-file <path>", "自定义缓存文件路径。"),
      formatOption("--city-type <type>", "城市树类型，默认 CITY_TREE_DOMESTIC。"),
      formatOption("--timeout <seconds>", "请求超时时间，默认 30 秒。"),
      formatOption("--json", "以 JSON 格式输出缓存状态。"),
      "",
      `${style("行为说明", helpAnsi.bold)}`,
      indent("命令会优先复用缓存；必要时才通过 XFT 接口刷新。"),
      indent("若未配置凭证且已有缓存，会尽量复用旧缓存。"),
      indent(`默认缓存目录：${cityCacheDir}`),
      "",
      `${style("示例", helpAnsi.bold)}`,
      formatExample("刷新默认国内城市树", "xft-refresh-city-cache --force"),
      "",
      formatExample("输出 JSON 状态", "xft-refresh-city-cache --ttl-hours 24 --json"),
    ]);
    return;
  }
  const config = loadNonSensitiveConfig();
  const credentials = await resolveCredentials(args, config);
  const cityType = getArgValue(args, "--city-type") ?? defaultCityType;
  const cacheFile = resolve(getArgValue(args, "--cache-file") ?? resolve(cityCacheDir, `${cityType.toLowerCase()}.json`));
  const [payload, refreshed] = await ensureCityCache({
    cacheFile,
    cityType,
    ttlHours: Number(getArgValue(args, "--ttl-hours") ?? String(defaultTtlHours)),
    forceRefresh: hasFlag(args, "--force"),
    credentials,
    timeout: Number(getArgValue(args, "--timeout") ?? "30") * 1000,
    allowStale: true,
  });
  const result = {
    cacheFile,
    cityType: payload.cityType,
    nodeCount: payload.nodeCount,
    fetchedAt: payload.fetchedAt,
    refreshed,
  };
  if (hasFlag(args, "--json")) {
    printJson(result);
    return;
  }
  console.log(`cache_file=${result.cacheFile}`);
  console.log(`city_type=${result.cityType}`);
  console.log(`node_count=${result.nodeCount}`);
  console.log(`fetched_at=${result.fetchedAt}`);
  console.log(`refreshed=${String(result.refreshed).toLowerCase()}`);
}

await runCli(main, "xft-refresh-city-cache");
