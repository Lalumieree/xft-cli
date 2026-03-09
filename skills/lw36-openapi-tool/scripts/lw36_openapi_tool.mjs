#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  XftOpenApiReqClient,
  XftVerifySignClient,
  XftVerifyTokenClient,
  sm4DecryptEcb,
  sm4EncryptEcb,
} from "/Users/nateshen/Documents/xft-tool/LW36.20_TS/dist/index.js";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_CONFIG_PATH = `${dirname(SCRIPT_DIR)}/local-config.json`;
const DEFAULT_FEATURE_CATALOG_PATH = `${dirname(SCRIPT_DIR)}/references/feature-catalog.json`;

function parseArgs(argv) {
  const [command, ...rest] = argv;
  if (!command || command === "--help" || command === "-h") {
    return { command: "help", options: {} };
  }
  const options = {};
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

function helpText() {
  return `Usage: node lw36_openapi_tool.mjs <command> [options]

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

function requireOption(options, key) {
  const value = options[key];
  if (value === undefined || value === true || value === "") {
    throw new Error(`missing required option --${key}`);
  }
  return String(value);
}

async function loadLocalConfig(options) {
  const configPath = options["config"] ? String(options["config"]) : DEFAULT_CONFIG_PATH;
  try {
    return JSON.parse(await readFile(configPath, "utf8"));
  } catch {
    return {};
  }
}

async function loadFeatureCatalog(options) {
  const catalogPath = options["catalog"] ? String(options["catalog"]) : DEFAULT_FEATURE_CATALOG_PATH;
  const parsed = JSON.parse(await readFile(catalogPath, "utf8"));
  return {
    catalogPath,
    features: Array.isArray(parsed.features) ? parsed.features : [],
  };
}

function getFeatureById(features, featureId) {
  const feature = features.find((item) => item.id === featureId || item.name === featureId);
  if (!feature) {
    throw new Error(`feature not found: ${featureId}`);
  }
  return feature;
}

function getOption(options, config, key) {
  const cliKey = options[key];
  if (cliKey !== undefined && cliKey !== true && cliKey !== "") {
    return String(cliKey);
  }
  const configKey = config[key];
  if (configKey !== undefined && configKey !== null && configKey !== "") {
    return String(configKey);
  }
  return undefined;
}

function getReqInf(options, config) {
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

function parseJsonOption(options, key) {
  if (!options[key]) {
    return undefined;
  }
  return JSON.parse(String(options[key]));
}

async function loadBody(options) {
  if (options["body-file"]) {
    return await readFile(String(options["body-file"]), "utf8");
  }
  if (options["body-json"]) {
    return String(options["body-json"]);
  }
  return "{}";
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function tryDecryptBody(authoritySecret, body) {
  try {
    return sm4DecryptEcb(authoritySecret.slice(0, 32), body);
  } catch {
    return undefined;
  }
}

async function main() {
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
      result = await XftOpenApiReqClient.doCommonGetReq(reqInf, feature.url, query);
    } else if (feature.method === "POST") {
      result = await XftOpenApiReqClient.doCommonPostReq(reqInf, feature.url, query, requestBody);
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
      parsedDecryptedBody: decryptedBody ? JSON.parse(decryptedBody) : undefined,
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

main().catch((error) => {
  process.stderr.write(
    `${JSON.stringify(
      {
        error: String(error),
        message: error?.message,
        cause: error?.cause ? String(error.cause) : undefined,
        stack: error?.stack,
      },
      null,
      2,
    )}\n`,
  );
  process.exit(1);
});
