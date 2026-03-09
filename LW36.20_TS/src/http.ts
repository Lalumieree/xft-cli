import { readFile } from "node:fs/promises";
import { basename, parse } from "node:path";
import { Constants } from "./constants.js";
import type { HttpResponseData } from "./types.js";

function timeoutSignal(timeoutMs: number): AbortSignal {
  return AbortSignal.timeout(timeoutMs);
}

function normalizeHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

export async function sendTextRequest(
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: string,
  timeoutMs = 120000,
): Promise<HttpResponseData> {
  const response = await fetch(url, {
    method,
    headers,
    body,
    signal: timeoutSignal(timeoutMs),
  });
  return {
    body: await response.text(),
    httpStatusCode: response.status,
    headers: normalizeHeaders(response.headers),
  };
}

export async function sendBinaryRequest(
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: string,
  timeoutMs = 120000,
): Promise<{ response: HttpResponseData; bytes: Uint8Array }> {
  const result = await fetch(url, {
    method,
    headers,
    body,
    signal: timeoutSignal(timeoutMs),
  });
  const bytes = new Uint8Array(await result.arrayBuffer());
  return {
    response: {
      body: Buffer.from(bytes).toString("latin1"),
      httpStatusCode: result.status,
      headers: normalizeHeaders(result.headers),
    },
    bytes,
  };
}

export async function uploadFileRequest(
  url: string,
  headers: Record<string, string>,
  filePath: string,
  useOriginalName: boolean,
  timeoutMs = 120000,
): Promise<HttpResponseData> {
  const data = await readFile(filePath);
  if (data.byteLength > 20 * 1024 * 1024) {
    throw new Error("文件内容过大");
  }
  const fileName = useOriginalName ? basename(filePath) : parse(filePath).name;
  const form = new FormData();
  form.set("file", new Blob([data]), fileName);
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: form,
    signal: timeoutSignal(timeoutMs),
  });
  return {
    body: await response.text(),
    httpStatusCode: response.status,
    headers: normalizeHeaders(response.headers),
  };
}
