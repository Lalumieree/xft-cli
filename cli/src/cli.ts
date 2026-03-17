#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import {
  XftOpenApiReqClient,
  XftVerifySignClient,
  XftVerifyTokenClient,
  sm4DecryptEcb,
  sm4EncryptEcb,
} from "./index.js";
import type { BaseReqInf, QueryParams } from "./types.js";

type CliOptions = Record<string, string | boolean>;

type FeatureDefinition = {
  id?: string;
  name?: string;
  description?: string;
  method?: "GET" | "POST" | string;
  url?: string;
  encryptBody?: boolean;
  decryptResponse?: boolean;
  requestMode?: "json" | "upload" | "none" | string;
  responseMode?: "json" | "text" | "binary" | string;
  useOriginalName?: boolean;
};

const DEFAULT_CONFIG_PATH = resolve(process.cwd(), "local-config.json");

function parseArgs(argv: string[]): { command: string; options: CliOptions } {
  const [command, ...rest] = argv;
  if (!command || command === "--help" || command === "-h") {
    return { command: "help", options: {} };
  }

  const options: CliOptions = {};
  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (!token.startsWith("--")) {
      throw new Error(`unexpected argument: ${token}`);
    }

    const key = token.slice(2);
    const next = rest[i + 1];
    if (next === undefined || next.startsWith("--")) {
      options[key] = true;
    } else {
      options[key] = next;
      i += 1;
    }
  }

  return { command, options };
}

function helpText(): string {
  return `Usage: xft-cli <command> [options]

Primary commands:
  feature-call

Legacy compatibility commands:
  post
  get
  upload
  download-get
  download-post

Internal integration commands:
  verify-token
  verify-sign

Crypto helpers:
  sm4-encrypt
  sm4-decrypt`;
}

function requireOption(options: CliOptions, key: string): string {
  const value = options[key];
  if (value === undefined || value === true || value === "") {
    throw new Error(`missing required option --${key}`);
  }
  return String(value);
}

async function loadJsonFile(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8")) as unknown;
}

async function loadLocalConfig(options: CliOptions): Promise<CliOptions> {
  const configPath = options.config ? String(options.config) : DEFAULT_CONFIG_PATH;
  try {
    const config = await loadJsonFile(configPath);
    return isRecord(config) ? toCliOptions(config) : {};
  } catch {
    return {};
  }
}

async function loadFeatureDefinition(options: CliOptions): Promise<FeatureDefinition> {
  if (options["feature-json"]) {
    const parsed = JSON.parse(String(options["feature-json"])) as unknown;
    if (!isRecord(parsed)) {
      throw new Error("option --feature-json must be a JSON object");
    }
    return parsed as FeatureDefinition;
  }

  if (options["feature-file"]) {
    const parsed = await loadJsonFile(String(options["feature-file"]));
    if (!isRecord(parsed)) {
      throw new Error("option --feature-file must point to a JSON object");
    }
    return parsed as FeatureDefinition;
  }

  throw new Error("missing feature definition: provide --feature-json or --feature-file");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toCliOptions(value: Record<string, unknown>): CliOptions {
  const result: CliOptions = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string" || typeof entry === "boolean") {
      result[key] = entry;
    } else if (entry !== null && entry !== undefined) {
      result[key] = String(entry);
    }
  }
  return result;
}

function getOption(options: CliOptions, config: CliOptions, key: string): string | undefined {
  const cliKey = options[key];
  if (cliKey !== undefined && cliKey !== true && cliKey !== "") {
    return String(cliKey);
  }

  const configKey = config[key];
  if (configKey !== undefined && configKey !== true && configKey !== "") {
    return String(configKey);
  }

  return undefined;
}

function getReqInf(options: CliOptions, config: CliOptions): BaseReqInf {
  const appId = getOption(options, config, "app-id");
  const authoritySecret = getOption(options, config, "authority-secret");
  if (!appId) {
    throw new Error("missing required option --app-id and no local config value found");
  }
  if (!authoritySecret) {
    throw new Error("missing required option --authority-secret and no local config value found");
  }

  return {
    appId,
    authoritySecret,
    companyId: getOption(options, config, "company-id"),
    edsCompanyId: getCliOnlyOption(options, "eds-company-id"),
    usrUid: getCliOnlyOption(options, "usr-uid"),
    usrNbr: getCliOnlyOption(options, "usr-nbr"),
    whrService: Boolean(options["whr-service"]),
  };
}

function getCliOnlyOption(options: CliOptions, key: string): string | undefined {
  const value = options[key];
  if (value !== undefined && value !== true && value !== "") {
    return String(value);
  }
  return undefined;
}

function parseJsonOption(options: CliOptions, key: string): QueryParams | undefined {
  if (!options[key]) {
    return undefined;
  }
  const parsed = JSON.parse(String(options[key])) as unknown;
  if (!isRecord(parsed)) {
    throw new Error(`option --${key} must be a JSON object`);
  }

  const queryParams: QueryParams = {};
  for (const [entryKey, entryValue] of Object.entries(parsed)) {
    if (
      typeof entryValue === "string" ||
      typeof entryValue === "number" ||
      typeof entryValue === "boolean" ||
      entryValue === null ||
      entryValue === undefined
    ) {
      queryParams[entryKey] = entryValue;
      continue;
    }
    throw new Error(`option --${key} contains unsupported value for "${entryKey}"`);
  }
  return queryParams;
}

async function loadBody(options: CliOptions): Promise<string> {
  if (options["body-file"]) {
    return await readFile(String(options["body-file"]), "utf8");
  }
  if (options["body-json"]) {
    return String(options["body-json"]);
  }
  return "{}";
}

function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function tryDecryptBody(authoritySecret: string, body: string): string | undefined {
  try {
    return sm4DecryptEcb(authoritySecret.slice(0, 32), body);
  } catch {
    return undefined;
  }
}

function parseJsonIfPossible(value: string | undefined): unknown {
  if (!value) {
    return undefined;
  }
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

function getFeatureRequestMode(feature: FeatureDefinition): "json" | "upload" | "none" {
  if (feature.requestMode === "upload") {
    return "upload";
  }
  if (feature.requestMode === "none") {
    return "none";
  }
  return "json";
}

function getFeatureResponseMode(feature: FeatureDefinition): "json" | "text" | "binary" {
  if (feature.responseMode === "binary") {
    return "binary";
  }
  if (feature.responseMode === "text") {
    return "text";
  }
  return "json";
}

async function main(): Promise<void> {
  const { command, options } = parseArgs(process.argv.slice(2));
  if (command === "help") {
    process.stdout.write(`${helpText()}\n`);
    return;
  }

  const config = await loadLocalConfig(options);

  if (command === "feature-call") {
    const reqInf = getReqInf(options, config);
    const feature = await loadFeatureDefinition(options);
    const query = parseJsonOption(options, "query-json");
    const requestMode = getFeatureRequestMode(feature);
    const responseMode = getFeatureResponseMode(feature);
    const url = requireFeatureUrl(feature);

    if (requestMode === "upload") {
      const filePath = requireOption(options, "file");
      const result =
        feature.useOriginalName || options["use-original-name"]
          ? await XftOpenApiReqClient.doFileUploadByFileWithOriginalName(reqInf, url, query, filePath)
          : await XftOpenApiReqClient.doFileUploadByFileReq(reqInf, url, query, filePath);
      printJson({
        feature,
        requestMode,
        responseMode,
        filePath,
        ...result,
      });
      return;
    }

    if (responseMode === "binary") {
      const output = requireOption(options, "output");
      if (feature.method === "GET") {
        await XftOpenApiReqClient.downloadGetFileToPath(reqInf, url, query, output);
      } else if (feature.method === "POST") {
        const plainBody = requestMode === "none" ? "{}" : await loadBody(options);
        await XftOpenApiReqClient.downloadPostFileToPath(reqInf, url, query, plainBody, output);
      } else {
        throw new Error(`unsupported feature method: ${feature.method}`);
      }
      printJson({
        feature,
        requestMode,
        responseMode,
        outputPath: output,
        fileName: basename(output),
      });
      return;
    }

    const plainBody = requestMode === "none" ? "{}" : await loadBody(options);
    const requestBody = feature.encryptBody
      ? JSON.stringify({
          secretMsg: sm4EncryptEcb(reqInf.authoritySecret.slice(0, 32), plainBody),
        })
      : plainBody;

    let result;
    if (feature.method === "GET") {
      result = await XftOpenApiReqClient.doCommonGetReq(reqInf, url, query);
    } else if (feature.method === "POST") {
      result = await XftOpenApiReqClient.doCommonPostReq(reqInf, url, query, requestBody);
    } else {
      throw new Error(`unsupported feature method: ${feature.method}`);
    }

    const decryptedBody = feature.decryptResponse ? tryDecryptBody(reqInf.authoritySecret, result.body) : undefined;
    printJson({
      feature,
      requestMode,
      responseMode,
      plainBody,
      requestBody,
      ...result,
      decryptedBody,
      parsedDecryptedBody: parseJsonIfPossible(decryptedBody),
    });
    return;
  }

  if (command === "post") {
    const reqInf = getReqInf(options, config);
    let body = await loadBody(options);
    if (options["encrypt-body"]) {
      body = JSON.stringify({
        secretMsg: sm4EncryptEcb(reqInf.authoritySecret.slice(0, 32), body),
      });
    }
    const result = await XftOpenApiReqClient.doCommonPostReq(
      reqInf,
      requireOption(options, "url"),
      parseJsonOption(options, "query-json"),
      body,
    );
    printJson(result);
    return;
  }

  if (command === "get") {
    const result = await XftOpenApiReqClient.doCommonGetReq(
      getReqInf(options, config),
      requireOption(options, "url"),
      parseJsonOption(options, "query-json"),
    );
    printJson(result);
    return;
  }

  if (command === "upload") {
    const reqInf = getReqInf(options, config);
    const url = requireOption(options, "url");
    const query = parseJsonOption(options, "query-json");
    const filePath = requireOption(options, "file");
    const result = options["use-original-name"]
      ? await XftOpenApiReqClient.doFileUploadByFileWithOriginalName(reqInf, url, query, filePath)
      : await XftOpenApiReqClient.doFileUploadByFileReq(reqInf, url, query, filePath);
    printJson(result);
    return;
  }

  if (command === "download-get") {
    const reqInf = getReqInf(options, config);
    const output = requireOption(options, "output");
    await XftOpenApiReqClient.downloadGetFileToPath(
      reqInf,
      requireOption(options, "url"),
      parseJsonOption(options, "query-json"),
      output,
    );
    printJson({ outputPath: output, fileName: basename(output) });
    return;
  }

  if (command === "download-post") {
    const reqInf = getReqInf(options, config);
    const output = requireOption(options, "output");
    await XftOpenApiReqClient.downloadPostFileToPath(
      reqInf,
      requireOption(options, "url"),
      parseJsonOption(options, "query-json"),
      await loadBody(options),
      output,
    );
    printJson({ outputPath: output, fileName: basename(output) });
    return;
  }

  if (command === "verify-token") {
    const client = new XftVerifyTokenClient(
      getReqInf(options, config),
      requireOption(options, "access-token-url"),
      options["login-user-url"] ? String(options["login-user-url"]) : undefined,
    );
    const data = requireOption(options, "data");
    const sign = requireOption(options, "sign");
    const result = options["login-user-url"]
      ? await client.getLoginInfo(data, sign)
      : await client.verifyToken(data, sign);
    printJson(result);
    return;
  }

  if (command === "verify-sign") {
    const client = new XftVerifySignClient(getReqInf(options, config), requireOption(options, "url"));
    if (options["valid-minute"]) {
      client.setValidMinute(Number(options["valid-minute"]));
    }
    const result = await client.verifySign(requireOption(options, "data"), requireOption(options, "sign"));
    printJson(result);
    return;
  }

  if (command === "sm4-encrypt") {
    const authoritySecret = getOption(options, config, "authority-secret");
    if (!authoritySecret) {
      throw new Error("missing required option --authority-secret and no local config value found");
    }
    const body = await loadBody(options);
    printJson({ secretMsg: sm4EncryptEcb(authoritySecret.slice(0, 32), body) });
    return;
  }

  if (command === "sm4-decrypt") {
    const authoritySecret = getOption(options, config, "authority-secret");
    if (!authoritySecret) {
      throw new Error("missing required option --authority-secret and no local config value found");
    }
    printJson({
      body: sm4DecryptEcb(authoritySecret.slice(0, 32), requireOption(options, "ciphertext")),
    });
    return;
  }

  throw new Error(`unsupported command: ${command}`);
}

function requireFeatureUrl(feature: FeatureDefinition): string {
  if (!feature.url) {
    throw new Error(`feature is missing url: ${feature.id ?? feature.name ?? "unknown"}`);
  }
  return feature.url;
}

main().catch((error: unknown) => {
  const normalizedError = error instanceof Error ? error : new Error(String(error));
  process.stderr.write(
    `${JSON.stringify(
      {
        error: String(normalizedError),
        message: normalizedError.message,
        cause: normalizedError.cause ? String(normalizedError.cause) : undefined,
        stack: normalizedError.stack,
      },
      null,
      2,
    )}\n`,
  );
  process.exit(1);
});
