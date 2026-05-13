import { callApi, configGet, configList, configSet, saveAuthCredentials } from "../app/api";
import { getArgValue, getRepeatableArgValues, hasFlag, printJson, runCli } from "./common";
import { formatExample, formatOption, helpAnsi, indent, printHelpPage, style } from "./help";

function printHelp(): void {
  const sections = [
    `${style("xft-call-api", helpAnsi.bold, helpAnsi.cyan)} ${style("XFT 网关调用工具", helpAnsi.dim)}`,
    "",
    `${style("用法", helpAnsi.bold)}`,
    indent("xft-call-api -auth"),
    indent("xft-call-api config set <key> <value>"),
    indent("xft-call-api config get [key]"),
    indent("xft-call-api config list"),
    indent("xft-call-api --interface-name <name> [--query k=v] [--body k=v] [--payload-file file]"),
    "",
    `${style("认证与配置", helpAnsi.bold)}`,
    formatOption("-auth", "交互式登录 xft-gateway，并保存返回的 Xft-gateway-token。"),
    formatOption("config set <key> <value>", "写入非敏感配置到 ~/.xft_config/config.json。"),
    formatOption("config get [key]", "读取单个配置；不传 key 时输出整个非敏感配置对象。"),
    formatOption("config list", "列出所有已保存的非敏感配置 key。"),
    "",
    `${style("调用参数", helpAnsi.bold)}`,
    formatOption("--interface-name <name>", "xft-gateway 中配置的接口名。"),
    formatOption("--query <key=value>", "追加查询参数；可重复传入多次。"),
    formatOption("--body <key=value>", "追加请求体字段；可重复传入多次。"),
    formatOption("--payload-file <file>", "从 JSON 文件读取请求体对象，再与 --body 合并。"),
    formatOption("--timeout <seconds>", "请求超时时间，默认 30 秒。"),
    formatOption("--dry-run", "仅输出网关请求预览，不真正发起调用。"),
    "",
    `${style("常用环境变量", helpAnsi.bold)}`,
    indent("XFT_GATEWAY_BASE_URL, XFT_GATEWAY_TOKEN"),
    "",
    `${style("示例", helpAnsi.bold)}`,
    formatExample("保存网关 token", "xft-call-api -auth"),
    "",
    formatExample("设置默认网关地址", "xft-call-api config set gatewayUrl \"http://localhost:3000\""),
    "",
    formatExample("预览网关请求", "xft-call-api --interface-name 表单配置列表查询 --body start=0 --body limit=20 --dry-run"),
    "",
    formatExample("通过 payload 文件调用接口", "xft-call-api --interface-name 新建差旅申请单 --payload-file payload.json --timeout 60"),
  ];
  printHelpPage(sections);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (hasFlag(args, "--help") || hasFlag(args, "-h")) {
    printHelp();
    return;
  }
  if (hasFlag(args, "-auth")) {
    await saveAuthCredentials();
    console.log("ok");
    return;
  }
  if (args[0] === "config" && args[1] === "set") {
    const key = args[2];
    const value = args[3];
    if (!key || value === undefined) {
      throw new Error("Usage: config set <key> <value>");
    }
    configSet(key, value);
    console.log("ok");
    return;
  }
  if (args[0] === "config" && args[1] === "get") {
    printJson(configGet(args[2]));
    return;
  }
  if (args[0] === "config" && args[1] === "list") {
    printJson(configList());
    return;
  }

  const result = await callApi({
    interfaceName: getArgValue(args, "--interface-name"),
    queryEntries: getRepeatableArgValues(args, "--query"),
    bodyEntries: getRepeatableArgValues(args, "--body"),
    payloadFile: getArgValue(args, "--payload-file"),
    timeoutSeconds: Number(getArgValue(args, "--timeout") ?? "30"),
    dryRun: hasFlag(args, "--dry-run"),
    url: getArgValue(args, "--url"),
    method: getArgValue(args, "--method") as "GET" | "POST" | undefined,
    signContentMode: getArgValue(args, "--sign-content-mode") as "raw-body" | "digest-header" | undefined,
    appid: getArgValue(args, "--appid"),
    authoritySecret: getArgValue(args, "--authority-secret"),
    cscappuid: getArgValue(args, "--cscappuid"),
    cscprjcod: getArgValue(args, "--cscprjcod"),
    cscusrnbr: getArgValue(args, "--cscusrnbr"),
    cscusruid: getArgValue(args, "--cscusruid"),
  });
  printJson(result);
}

await runCli(main, "xft-call-api");
