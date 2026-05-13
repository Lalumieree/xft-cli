import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import keytar from "keytar";
import smCrypto from "sm-crypto";
import { configDir, configFile, credentialAccount, credentialService, credentialsFile, sensitiveConfigKeys } from "./constants";
import { compactJson, parseJsonValue, prettyJson } from "./utils";

export function ensureConfigDir(): void {
  mkdirSync(configDir, { recursive: true });
}

export function loadNonSensitiveConfig(): Record<string, unknown> {
  if (!existsSync(configFile)) {
    return {};
  }
  const payload = JSON.parse(readFileSync(configFile, "utf-8"));
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new Error(`配置文件内容必须是 JSON 对象: ${configFile}`);
  }
  return Object.fromEntries(Object.entries(payload).filter(([key]) => !sensitiveConfigKeys.has(key)));
}

export function saveNonSensitiveConfig(config: Record<string, unknown>): void {
  ensureConfigDir();
  const sanitized = Object.fromEntries(Object.entries(config).filter(([key]) => !sensitiveConfigKeys.has(key)));
  writeFileSync(configFile, prettyJson(sanitized), "utf-8");
}

export function getNonSensitiveValue(config: Record<string, unknown>, ...keys: Array<string | undefined>): unknown {
  for (const key of keys) {
    if (!key || sensitiveConfigKeys.has(key)) {
      continue;
    }
    const value = config[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return undefined;
}

export function setNonSensitiveValue(key: string, value: unknown): void {
  if (sensitiveConfigKeys.has(key)) {
    throw new Error("敏感字段不能写入 config.json，请使用 xft-cli auth 管理网关 token");
  }
  const config = loadNonSensitiveConfig();
  config[key] = value;
  saveNonSensitiveConfig(config);
}

async function getMasterKey(): Promise<string | null> {
  return keytar.getPassword(credentialService, credentialAccount);
}

async function ensureMasterKey(): Promise<string> {
  const secret = await getMasterKey();
  if (secret) {
    return secret;
  }
  const generated = randomBytes(16).toString("hex");
  await keytar.setPassword(credentialService, credentialAccount, generated);
  return generated;
}

function sm4EncryptEcbHex(keyHex: string, plainText: string): string {
  return sm4.encrypt(plainText, keyHex, { mode: "ecb", padding: "pkcs#7", output: "string" });
}

function sm4DecryptEcbHex(keyHex: string, cipherHex: string): string {
  return sm4.decrypt(cipherHex, keyHex, { mode: "ecb", padding: "pkcs#7", output: "string" });
}

export async function loadSensitiveCredentials(): Promise<Record<string, string>> {
  if (!existsSync(credentialsFile)) {
    return {};
  }
  const masterKey = await getMasterKey();
  if (!masterKey) {
    throw new Error("检测到敏感凭证文件，但系统钥匙串中缺少解密主密钥，请重新执行 xft-cli auth");
  }
  const decrypted = sm4DecryptEcbHex(masterKey, readFileSync(credentialsFile, "utf-8").trim());
  const payload = JSON.parse(decrypted);
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new Error(`敏感凭证文件内容必须是 JSON 对象: ${credentialsFile}`);
  }
  const result: Record<string, string> = {};
  for (const key of ["gateway-token"]) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) {
      result[key] = value.trim();
    }
  }
  return result;
}

export async function saveGatewayToken(token: string): Promise<void> {
  ensureConfigDir();
  const masterKey = await ensureMasterKey();
  const payload = compactJson({ "gateway-token": token.trim() });
  writeFileSync(credentialsFile, sm4EncryptEcbHex(masterKey, payload), "utf-8");
}

export function promptText(message: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(message);
    process.stdin.resume();
    process.stdin.once("data", (data) => {
      process.stdin.pause();
      resolve(String(data));
    });
  });
}

export { parseJsonValue };
const { sm4 } = smCrypto;
