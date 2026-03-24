import { createHash } from "node:crypto";
import smCrypto from "sm-crypto";
import type { XftCredentials } from "./types";
import { compactJson } from "./utils";

const { sm2, sm4, sm3 } = smCrypto;

export function normalizeHex(value: string, fieldName: string): string {
  const cleaned = value.trim().toLowerCase().replace(/^0x/, "");
  if (!/^[0-9a-f]+$/.test(cleaned)) {
    throw new Error(`${fieldName} 必须是十六进制字符串`);
  }
  if (cleaned.length < 64) {
    throw new Error(`${fieldName} 长度至少需要 64 个十六进制字符`);
  }
  return cleaned;
}

export function sm3Hex(text: string): string {
  if (typeof sm3 === "function") {
    return sm3(text);
  }
  return createHash("sha256").update(text, "utf-8").digest("hex");
}

function sm4EncryptEcbHex(keyHex: string, plainText: string): string {
  return sm4.encrypt(plainText, keyHex, { mode: "ecb", padding: "pkcs#7", output: "string" });
}

function sm4DecryptEcbHex(keyHex: string, cipherHex: string): string {
  return sm4.decrypt(cipherHex, keyHex, { mode: "ecb", padding: "pkcs#7", output: "string" });
}

export function maybeJsonLoads(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function decodeResponseBody(rawText: string, keyHex: string, encrypted: boolean): unknown {
  const parsed = maybeJsonLoads(rawText);
  if (!encrypted) {
    return parsed;
  }
  const candidates: string[] = [];
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && typeof (parsed as Record<string, unknown>).secretMsg === "string") {
    candidates.push((parsed as Record<string, string>).secretMsg);
  } else if (typeof parsed === "string") {
    candidates.push(parsed.trim().replace(/^"|"$/g, ""));
  }
  for (const candidate of candidates) {
    if (!candidate || candidate.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(candidate)) {
      continue;
    }
    try {
      return maybeJsonLoads(sm4DecryptEcbHex(keyHex, candidate));
    } catch {
      continue;
    }
  }
  return parsed;
}

export class XftClient {
  private readonly authoritySecret: string;
  private readonly encryptKeyHex: string;
  private readonly publicKey: string;

  public constructor(private readonly credentials: XftCredentials, private readonly timeout = 30_000) {
    this.authoritySecret = normalizeHex(credentials.authoritySecret, "authority_secret");
    this.encryptKeyHex = this.authoritySecret.slice(0, 32);
    this.publicKey = sm2.getPublicKeyFromPrivateKey(this.authoritySecret);
  }

  public buildQueryParams(extraQuery: Record<string, unknown> = {}): URLSearchParams {
    const query = new URLSearchParams({
      CSCAPPUID: this.credentials.cscappuid,
      CSCREQTIM: String(Date.now()),
    });
    for (const [key, value] of [
      ["CSCPRJCOD", this.credentials.cscprjcod],
      ["CSCUSRNBR", this.credentials.cscusrnbr],
      ["CSCUSRUID", this.credentials.cscusruid],
    ]) {
      if (value !== undefined && value !== null && value !== "") {
        query.set(key, String(value));
      }
    }
    for (const [key, value] of Object.entries(extraQuery)) {
      if (value !== undefined && value !== null && value !== "") {
        query.set(key, String(value));
      }
    }
    return query;
  }

  public prepareRequest(method: "GET" | "POST", url: string, body: unknown = {}, extraQuery: Record<string, unknown> = {}): Record<string, unknown> {
    const queryString = this.buildQueryParams(extraQuery).toString();
    const fullUrl = `${url}?${queryString}`;
    let requestBody = "";
    if (method === "POST") {
      const serializedBody = compactJson(body ?? {});
      requestBody = this.credentials.encryptBody ? compactJson({ secretMsg: sm4EncryptEcbHex(this.encryptKeyHex, serializedBody) }) : serializedBody;
    }
    const timestamp = String(Math.floor(Date.now() / 1000));
    const urlObject = new URL(fullUrl);
    const pathWithQuery = `${urlObject.pathname}${urlObject.search}`;
    const headers: Record<string, string> = {
      appid: this.credentials.appid,
      "x-alb-timestamp": timestamp,
      "x-alb-verify": "sm3withsm2",
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    const signLines = [`${method} ${pathWithQuery}`];
    if (method === "POST") {
      headers["x-alb-digest"] = sm3Hex(requestBody);
      const signValue = this.credentials.signContentMode === "raw-body" ? requestBody : headers["x-alb-digest"];
      signLines.push(`x-alb-digest: ${signValue}`);
    }
    signLines.push(`x-alb-timestamp: ${timestamp}`);
    const signStr = signLines.join("\n");
    headers.apisign = sm2.doSignature(signStr, this.authoritySecret, { hash: true, publicKey: this.publicKey });
    return { method, url: fullUrl, headers, body: requestBody, signStr };
  }

  public async request(method: "GET" | "POST", url: string, body: unknown = {}, extraQuery: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    const prepared = this.prepareRequest(method, url, body, extraQuery);
    const response = await fetch(String(prepared.url), {
      method,
      headers: prepared.headers as HeadersInit,
      body: method === "POST" ? String(prepared.body) : undefined,
      signal: AbortSignal.timeout(this.timeout),
    });
    const rawText = await response.text();
    return {
      request: prepared,
      response: {
        status_code: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        raw_text: rawText,
        decoded_body: decodeResponseBody(rawText, this.encryptKeyHex, this.credentials.encryptBody),
      },
    };
  }
}
