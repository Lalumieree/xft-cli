import { readFileSync } from "node:fs";
import {
  getNonSensitiveValue,
  loadNonSensitiveConfig,
  loadSensitiveCredentials,
  parseJsonValue,
  promptAndSaveSensitiveCredentials,
  resolveSensitiveValue,
  setNonSensitiveValue,
} from "../shared/configStore";
import type { XftCredentials } from "../shared/types";
import { XftClient } from "../shared/xftClient";

type ApiOptions = {
  url?: string;
  method?: "GET" | "POST";
  queryEntries?: string[];
  bodyEntries?: string[];
  payloadFile?: string;
  timeoutSeconds?: number;
  dryRun?: boolean;
  signContentMode?: "raw-body" | "digest-header";
  appid?: string;
  authoritySecret?: string;
  cscappuid?: string;
  cscprjcod?: string;
  cscusrnbr?: string;
  cscusruid?: string;
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

async function resolveApiCredentials(options: ApiOptions, config: Record<string, unknown>): Promise<XftCredentials> {
  const storedCredentials = await loadSensitiveCredentials().catch(() => ({}));
  const appid = resolveSensitiveValue(storedCredentials, "app-id", options.appid, "XFT_APPID");
  const authoritySecret = resolveSensitiveValue(storedCredentials, "authority-secret", options.authoritySecret, "XFT_AUTHORITY_SECRET");
  const cscappuid =
    options.cscappuid ??
    (getNonSensitiveValue(config, "cscappuid", "csc-app-uid", "cscAppUid") as string | undefined) ??
    process.env.XFT_CSCAPPUID ??
    appid;
  if (!appid || !authoritySecret) {
    throw new Error("未找到凭证，请先执行 xft-cli auth，或通过 --appid/--authority-secret 临时传入");
  }
  if (!cscappuid) {
    throw new Error("缺少 cscappuid，请通过 --cscappuid、~/.xft_config/config.json 或 XFT_CSCAPPUID 提供");
  }
  return {
    appid,
    authoritySecret,
    cscappuid,
    cscprjcod: (options.cscprjcod ?? getNonSensitiveValue(config, "cscprjcod", "csc-prjcod", "cscPrjCod") ?? process.env.XFT_CSCPRJCOD) as string | undefined,
    cscusrnbr: (options.cscusrnbr ?? getNonSensitiveValue(config, "cscusrnbr", "csc-usrnbr", "cscUsrNbr") ?? process.env.XFT_CSCUSRNBR) as string | undefined,
    cscusruid: (options.cscusruid ?? getNonSensitiveValue(config, "cscusruid", "csc-usruid", "cscUsrUid") ?? process.env.XFT_CSCUSRUID) as string | undefined,
    encryptBody: true,
    signContentMode: options.signContentMode ?? "raw-body",
  };
}

export async function saveAuthCredentials(): Promise<void> {
  await promptAndSaveSensitiveCredentials();
}

export function configSet(key: string, value: string): void {
  setNonSensitiveValue(key, parseJsonValue(value));
}

export function configGet(key?: string): unknown {
  const config = loadNonSensitiveConfig();
  return key ? config[key] : config;
}

export function configList(): string[] {
  return Object.keys(loadNonSensitiveConfig()).sort();
}

export async function callApi(options: ApiOptions): Promise<unknown> {
  const config = loadNonSensitiveConfig();
  const credentials = await resolveApiCredentials(options, config);
  const body = { ...loadJsonFile(options.payloadFile), ...parseKvPairs(options.bodyEntries) };
  const query = parseKvPairs(options.queryEntries);
  const method = (options.method ?? "GET").toUpperCase() as "GET" | "POST";
  const url = options.url ?? (getNonSensitiveValue(config, "url") as string | undefined);
  if (!url) throw new Error("缺少 --url");
  const timeout = (options.timeoutSeconds ?? 30) * 1000;
  const client = new XftClient(credentials, timeout);
  if (options.dryRun) return client.prepareRequest(method, url, body, query);
  return client.request(method, url, body, query);
}
