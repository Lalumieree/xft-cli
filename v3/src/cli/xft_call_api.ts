import { readFileSync } from "node:fs";
import { getNonSensitiveValue, loadNonSensitiveConfig, loadSensitiveCredentials, parseJsonValue, promptAndSaveSensitiveCredentials, resolveSensitiveValue, setNonSensitiveValue } from "../shared/configStore";
import { XftClient } from "../shared/xftClient";
import type { XftCredentials } from "../shared/types";
import { getArgValue, getRepeatableArgValues, hasFlag, printJson, runCli } from "./common";
import { formatExample, formatOption, helpAnsi, indent, printHelpPage, style } from "./help";

function printHelp(): void {
  const sections = [
    `${style("xft-call-api", helpAnsi.bold, helpAnsi.cyan)} ${style("XFT API 调用与配置工具", helpAnsi.dim)}`,
    "",
    `${style("用法", helpAnsi.bold)}`,
    indent("xft-call-api -auth"),
    indent("xft-call-api config set <key> <value>"),
    indent("xft-call-api config get [key]"),
    indent("xft-call-api config list"),
    indent("xft-call-api --url <url> [--method GET|POST] [--query k=v] [--body k=v] [--payload-file file]"),
    "",
    `${style("认证与配置", helpAnsi.bold)}`,
    formatOption("-auth", "交互式保存敏感凭证到 ~/.xft_config/credentials.json.enc，并通过 keytar 保存主密钥。"),
    formatOption("config set <key> <value>", "写入非敏感配置到 ~/.xft_config/config.json。"),
    formatOption("config get [key]", "读取单个配置；不传 key 时输出整个非敏感配置对象。"),
    formatOption("config list", "列出所有已保存的非敏感配置 key。"),
    "",
    `${style("调用参数", helpAnsi.bold)}`,
    formatOption("--url <url>", "目标接口地址；未传时尝试读取 config.json 中的 url。"),
    formatOption("--method <GET|POST>", "HTTP 方法，默认 GET。"),
    formatOption("--query <key=value>", "追加查询参数；可重复传入多次。"),
    formatOption("--body <key=value>", "追加请求体字段；可重复传入多次。"),
    formatOption("--payload-file <file>", "从 JSON 文件读取请求体对象，再与 --body 合并。"),
    formatOption("--timeout <seconds>", "请求超时时间，默认 30 秒。"),
    formatOption("--dry-run", "仅输出组装后的请求，不真正发起调用。"),
    formatOption("--sign-content-mode <mode>", "签名内容模式：raw-body 或 digest-header，默认 raw-body。"),
    "",
    `${style("凭证参数", helpAnsi.bold)}`,
    formatOption("--appid <value>", "临时指定 app-id。"),
    formatOption("--authority-secret <value>", "临时指定 authority-secret。"),
    formatOption("--cscappuid <value>", "临时指定 CSCAPPUID；缺失时默认回退到 appid。"),
    formatOption("--cscprjcod <value>", "临时指定 CSCPRJCOD。"),
    formatOption("--cscusrnbr <value>", "临时指定 CSCUSRNBR。"),
    formatOption("--cscusruid <value>", "临时指定 CSCUSRUID。"),
    "",
    `${style("参数来源优先级", helpAnsi.bold)}`,
    indent("敏感凭证：~/.xft_config > CLI 显式参数 > 环境变量"),
    indent("非敏感配置：CLI 显式参数 > ~/.xft_config/config.json > 环境变量"),
    indent("敏感字段只包括 app-id 和 authority-secret；不要写入 config.json。"),
    "",
    `${style("常用环境变量", helpAnsi.bold)}`,
    indent("XFT_APPID, XFT_AUTHORITY_SECRET, XFT_CSCAPPUID, XFT_CSCPRJCOD, XFT_CSCUSRNBR, XFT_CSCUSRUID"),
    "",
    `${style("示例", helpAnsi.bold)}`,
    formatExample("保存敏感凭证", "xft-call-api -auth"),
    "",
    formatExample("设置默认 cscappuid", "xft-call-api config set cscappuid \"your-app-id\""),
    "",
    formatExample("查看所有配置 key", "xft-call-api config list"),
    "",
    formatExample(
      "预览请求组装结果",
      "xft-call-api --url https://api.example.com/demo --method POST --body billNo=2026032335272513 --dry-run",
    ),
    "",
    formatExample(
      "通过 payload 文件调用接口",
      "xft-call-api --url https://api.example.com/demo --method POST --payload-file payload.json --timeout 60",
    ),
  ];
  printHelpPage(sections);
}

function parseKvPair(text: string): [string, unknown] {
  const index = text.indexOf("=");
  if (index === -1) {
    throw new Error(`参数格式错误: ${text}，应为 key=value`);
  }
  return [text.slice(0, index).trim(), parseJsonValue(text.slice(index + 1).trim())];
}

function parseKvPairs(values: string[]): Record<string, unknown> {
  return Object.fromEntries(values.map(parseKvPair));
}

function loadJsonFile(path?: string): Record<string, unknown> {
  if (!path) {
    return {};
  }
  const payload = JSON.parse(readFileSync(path, "utf-8"));
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new Error(`JSON 文件内容必须是对象: ${path}`);
  }
  return payload;
}

async function resolveCredentials(args: string[], config: Record<string, unknown>): Promise<XftCredentials> {
  const storedCredentials = await loadSensitiveCredentials().catch(() => ({}));
  const appid = resolveSensitiveValue(storedCredentials, "app-id", getArgValue(args, "--appid"), "XFT_APPID");
  const authoritySecret = resolveSensitiveValue(storedCredentials, "authority-secret", getArgValue(args, "--authority-secret"), "XFT_AUTHORITY_SECRET");
  const cscappuid =
    getArgValue(args, "--cscappuid") ??
    (getNonSensitiveValue(config, "cscappuid", "csc-app-uid", "cscAppUid") as string | undefined) ??
    process.env.XFT_CSCAPPUID ??
    appid;
  if (!appid || !authoritySecret) {
    throw new Error("未找到凭证，请先执行 xft-call-api -auth，或通过 --appid/--authority-secret 临时传入");
  }
  if (!cscappuid) {
    throw new Error("缺少 cscappuid，请通过 --cscappuid、~/.xft_config/config.json 或 XFT_CSCAPPUID 提供");
  }
  return {
    appid,
    authoritySecret,
    cscappuid,
    cscprjcod: (getArgValue(args, "--cscprjcod") ?? getNonSensitiveValue(config, "cscprjcod", "csc-prjcod", "cscPrjCod") ?? process.env.XFT_CSCPRJCOD) as string | undefined,
    cscusrnbr: (getArgValue(args, "--cscusrnbr") ?? getNonSensitiveValue(config, "cscusrnbr", "csc-usrnbr", "cscUsrNbr") ?? process.env.XFT_CSCUSRNBR) as string | undefined,
    cscusruid: (getArgValue(args, "--cscusruid") ?? getNonSensitiveValue(config, "cscusruid", "csc-usruid", "cscUsrUid") ?? process.env.XFT_CSCUSRUID) as string | undefined,
    encryptBody: true,
    signContentMode: (getArgValue(args, "--sign-content-mode") as "raw-body" | "digest-header" | undefined) ?? "raw-body",
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (hasFlag(args, "--help") || hasFlag(args, "-h")) {
    printHelp();
    return;
  }
  if (hasFlag(args, "-auth")) {
    await promptAndSaveSensitiveCredentials();
    console.log("ok");
    return;
  }
  if (args[0] === "config" && args[1] === "set") {
    const key = args[2];
    const value = args[3];
    if (!key || value === undefined) {
      throw new Error("Usage: config set <key> <value>");
    }
    setNonSensitiveValue(key, parseJsonValue(value));
    console.log("ok");
    return;
  }
  if (args[0] === "config" && args[1] === "get") {
    const config = loadNonSensitiveConfig();
    const key = args[2];
    if (!key) {
      printJson(config);
      return;
    }
    printJson(config[key]);
    return;
  }
  if (args[0] === "config" && args[1] === "list") {
    const config = loadNonSensitiveConfig();
    printJson(Object.keys(config).sort());
    return;
  }

  const config = loadNonSensitiveConfig();
  const credentials = await resolveCredentials(args, config);
  const body = { ...loadJsonFile(getArgValue(args, "--payload-file")), ...parseKvPairs(getRepeatableArgValues(args, "--body")) };
  const query = parseKvPairs(getRepeatableArgValues(args, "--query"));
  const method = (getArgValue(args, "--method") ?? "GET").toUpperCase() as "GET" | "POST";
  const url = getArgValue(args, "--url") ?? (getNonSensitiveValue(config, "url") as string | undefined);
  if (!url) {
    throw new Error("缺少 --url");
  }
  const timeout = Number(getArgValue(args, "--timeout") ?? "30") * 1000;
  const client = new XftClient(credentials, timeout);
  if (hasFlag(args, "--dry-run")) {
    printJson(client.prepareRequest(method, url, body, query));
    return;
  }
  const result = await client.request(method, url, body, query);
  printJson(result);
}

await runCli(main, "xft-call-api");
