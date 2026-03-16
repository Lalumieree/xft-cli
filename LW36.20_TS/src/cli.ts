#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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
};

type FeatureCatalog = {
  catalogPath: string;
  features: FeatureDefinition[];
};

const DIST_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = dirname(DIST_DIR);
const DEFAULT_CONFIG_PATH = resolve(process.cwd(), "local-config.json");
const DEFAULT_FEATURE_CATALOG_PATH = resolve(PACKAGE_ROOT, "references/feature-catalog.json");

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

Commands:
  list-features
  show-feature
  feature-call
  post
  get
  upload
  download-get
  download-post
  verify-token
  verify-sign
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

async function loadFeatureCatalog(options: CliOptions): Promise<FeatureCatalog> {
  const catalogPath = options.catalog ? String(options.catalog) : DEFAULT_FEATURE_CATALOG_PATH;
  const parsed = await loadJsonFile(catalogPath);
  const features =
    isRecord(parsed) && Array.isArray(parsed.features)
      ? parsed.features.filter(isRecord).map((feature) => feature as FeatureDefinition)
      : [];
  return { catalogPath, features };
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

function getFeatureById(features: FeatureDefinition[], featureId: string): FeatureDefinition {
  const feature = features.find((item) => item.id === featureId || item.name === featureId);
  if (!feature) {
    throw new Error(`feature not found: ${featureId}`);
  }
  return feature;
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
    edsCompanyId: getOption(options, config, "eds-company-id"),
    usrUid: getOption(options, config, "usr-uid"),
    usrNbr: getOption(options, config, "usr-nbr"),
    whrService: Boolean(options["whr-service"]),
  };
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

async function main(): Promise<void> {
  const { command, options } = parseArgs(process.argv.slice(2));
  if (command === "help") {
    process.stdout.write(`${helpText()}\n`);
    return;
  }

  const config = await loadLocalConfig(options);

  if (command === "list-features") {
    const catalog = await loadFeatureCatalog(options);
    printJson({
      catalogPath: catalog.catalogPath,
      features: catalog.features.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        method: item.method,
        url: item.url,
      })),
    });
    return;
  }

  if (command === "show-feature") {
    const catalog = await loadFeatureCatalog(options);
    const feature = getFeatureById(catalog.features, requireOption(options, "feature"));
    printJson(feature);
    return;
  }

  if (command === "feature-call") {
    const reqInf = getReqInf(options, config);
    const catalog = await loadFeatureCatalog(options);
    const feature = getFeatureById(catalog.features, requireOption(options, "feature"));
    const plainBody = await loadBody(options);
    const query = parseJsonOption(options, "query-json");
    const requestBody = feature.encryptBody
      ? JSON.stringify({
          secretMsg: sm4EncryptEcb(reqInf.authoritySecret.slice(0, 32), plainBody),
        })
      : plainBody;

    let result;
    if (feature.method === "GET") {
      result = await XftOpenApiReqClient.doCommonGetReq(reqInf, requireFeatureUrl(feature), query);
    } else if (feature.method === "POST") {
      result = await XftOpenApiReqClient.doCommonPostReq(reqInf, requireFeatureUrl(feature), query, requestBody);
    } else {
      throw new Error(`unsupported feature method: ${feature.method}`);
    }

    const decryptedBody = feature.decryptResponse ? tryDecryptBody(reqInf.authoritySecret, result.body) : undefined;
    printJson({
      feature,
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
