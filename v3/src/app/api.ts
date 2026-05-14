import { readFileSync } from "node:fs";
import {
  getNonSensitiveValue,
  loadNonSensitiveConfig,
  parseJsonValue,
  promptText,
  saveGatewayToken,
  setNonSensitiveValue,
} from "../shared/configStore";
import { GatewayClient } from "../shared/gatewayClient";
import { requireGatewayCredentials, resolveGatewayUrl } from "../shared/gatewayConfig";

type ApiOptions = {
  interfaceName?: string;
  queryEntries?: string[];
  bodyEntries?: string[];
  payloadFile?: string;
  timeoutSeconds?: number;
  dryRun?: boolean;
  url?: string;
  method?: "GET" | "POST";
  signContentMode?: "raw-body" | "digest-header";
  appid?: string;
  authoritySecret?: string;
  cscappuid?: string;
  cscprjcod?: string;
  cscusrnbr?: string;
  cscusruid?: string;
};

type ListInterfacesOptions = {
  timeoutSeconds?: number;
};

function parseKvPair(text: string): [string, unknown] {
  const index = text.indexOf("=");
  if (index === -1) throw new Error(`参数格式错误: ${text}，应为 key=value`);
  return [text.slice(0, index).trim(), parseJsonValue(text.slice(index + 1).trim())];
}

function parseKvPairs(values: string[] = []): Record<string, unknown> {
  return Object.fromEntries(values.map(parseKvPair));
}

function loadJsonFile(path?: string): Record<string, unknown> {
  if (!path) return {};
  const payload = JSON.parse(readFileSync(path, "utf-8"));
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new Error(`JSON 文件内容必须是对象: ${path}`);
  }
  return payload;
}

function assertNoDeprecatedDirectOptions(options: ApiOptions): void {
  const deprecated = [
    ["--url", options.url],
    ["--method", options.method],
    ["--sign-content-mode", options.signContentMode],
    ["--appid", options.appid],
    ["--authority-secret", options.authoritySecret],
    ["--cscappuid", options.cscappuid],
    ["--cscprjcod", options.cscprjcod],
    ["--cscusrnbr", options.cscusrnbr],
    ["--cscusruid", options.cscusruid],
  ]
    .filter(([, value]) => value !== undefined)
    .map(([flag]) => flag);

  if (deprecated.length) {
    throw new Error(
      `不再支持本地直连参数 ${deprecated.join(", ")}。请先在 xft-gateway 配置接口目录，然后使用 --interface-name <接口名> 通过网关调用。`,
    );
  }
}

export async function saveAuthCredentials(): Promise<void> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("交互式认证需要在终端中运行，请直接执行 xft-cli auth");
  }
  const config = loadNonSensitiveConfig();
  const currentGatewayUrl = resolveGatewayUrl(config) ?? "";
  const gatewayUrl =
    (await promptText(`请输入 gatewayUrl${currentGatewayUrl ? ` [${currentGatewayUrl}]` : ""}: `)).trim() ||
    currentGatewayUrl;
  if (!gatewayUrl) {
    throw new Error("gatewayUrl 不能为空");
  }
  const email = (await promptText("请输入网关登录邮箱: ")).trim();
  if (!email) {
    throw new Error("邮箱不能为空");
  }
  const password = (await promptText("请输入网关登录密码: ")).trim();
  if (!password) {
    throw new Error("密码不能为空");
  }
  const auth = await GatewayClient.authenticate(gatewayUrl, email, password);
  setNonSensitiveValue("gatewayUrl", auth.gatewayUrl);
  await saveGatewayToken(auth.token);
}

export function configSet(key: string, value: string): void {
  setNonSensitiveValue(key, parseJsonValue(value));
}

export function configGet(key?: string): unknown {
  const config = loadNonSensitiveConfig();
  return key ? getNonSensitiveValue(config, key) : config;
}

export function configList(): string[] {
  return Object.keys(loadNonSensitiveConfig()).sort();
}

export async function callApi(options: ApiOptions): Promise<unknown> {
  assertNoDeprecatedDirectOptions(options);
  const config = loadNonSensitiveConfig();
  const interfaceName = options.interfaceName?.trim();
  if (!interfaceName) {
    throw new Error("缺少 --interface-name。可先执行 xft-cli api interfaces 查看当前账号可调用的接口名。");
  }
  const credentials = await requireGatewayCredentials(config);
  const body = { ...loadJsonFile(options.payloadFile), ...parseKvPairs(options.bodyEntries) };
  const query = parseKvPairs(options.queryEntries);
  const client = new GatewayClient(credentials, (options.timeoutSeconds ?? 30) * 1000);
  if (options.dryRun) {
    return client.prepareCall({ interfaceName, query, body }, true);
  }
  return client.callXft({ interfaceName, query, body });
}

export async function listInterfaces(options: ListInterfacesOptions = {}): Promise<unknown> {
  const config = loadNonSensitiveConfig();
  const credentials = await requireGatewayCredentials(config);
  const client = new GatewayClient(credentials, (options.timeoutSeconds ?? 30) * 1000);
  return (await client.listInterfaces()).data;
}
