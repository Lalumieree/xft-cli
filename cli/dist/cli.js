#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { executeFeatureCall, validateFeatureDefinition } from "./index.js";
const DEFAULT_CONFIG_PATH = resolve(process.cwd(), "local-config.json");
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
        }
        else {
            options[key] = next;
            i += 1;
        }
    }
    return { command, options };
}
function helpText() {
    return `Usage: xft-cli <command> [options]

Primary commands:
  feature-call

Common feature-call options:
  --config <path>
  --feature-file <path>
  --feature-json <json>
  --query-json <json>
  --body-json <json>
  --body-file <path>
  --file <path>
  --output <path>`;
}
function requireOption(options, key) {
    const value = options[key];
    if (value === undefined || value === true || value === "") {
        throw new Error(`missing required option --${key}`);
    }
    return String(value);
}
async function loadJsonFile(path) {
    return JSON.parse(await readFile(path, "utf8"));
}
async function loadLocalConfig(options) {
    if (options["config-json"]) {
        throw new Error('unsupported option --config-json. Pass sensitive configuration via --config <path> or local-config.json instead.');
    }
    const configPath = options.config ? String(options.config) : DEFAULT_CONFIG_PATH;
    try {
        const config = await loadJsonFile(configPath);
        return isRecord(config) ? toCliOptions(config) : {};
    }
    catch {
        return {};
    }
}
async function loadFeatureDefinition(options) {
    if (options["feature-json"]) {
        const parsed = JSON.parse(String(options["feature-json"]));
        return validateFeatureDefinition(parsed);
    }
    if (options["feature-file"]) {
        const parsed = await loadJsonFile(String(options["feature-file"]));
        return validateFeatureDefinition(parsed);
    }
    throw new Error("missing feature definition: provide --feature-json or --feature-file");
}
function isRecord(value) {
    return typeof value === "object" && value !== null;
}
function toCliOptions(value) {
    const result = {};
    for (const [key, entry] of Object.entries(value)) {
        if (typeof entry === "string" || typeof entry === "boolean") {
            result[key] = entry;
        }
        else if (entry !== null && entry !== undefined) {
            result[key] = String(entry);
        }
    }
    return result;
}
function getOption(options, config, key) {
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
        edsCompanyId: getCliOnlyOption(options, "eds-company-id"),
        usrUid: getCliOnlyOption(options, "usr-uid"),
        usrNbr: getCliOnlyOption(options, "usr-nbr"),
        whrService: Boolean(options["whr-service"]),
    };
}
function getCliOnlyOption(options, key) {
    const value = options[key];
    if (value !== undefined && value !== true && value !== "") {
        return String(value);
    }
    return undefined;
}
function parseJsonOption(options, key) {
    if (!options[key]) {
        return undefined;
    }
    const parsed = JSON.parse(String(options[key]));
    if (!isRecord(parsed)) {
        throw new Error(`option --${key} must be a JSON object`);
    }
    const queryParams = {};
    for (const [entryKey, entryValue] of Object.entries(parsed)) {
        if (typeof entryValue === "string" ||
            typeof entryValue === "number" ||
            typeof entryValue === "boolean" ||
            entryValue === null ||
            entryValue === undefined) {
            queryParams[entryKey] = entryValue;
            continue;
        }
        throw new Error(`option --${key} contains unsupported value for "${entryKey}"`);
    }
    return queryParams;
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
async function main() {
    const { command, options } = parseArgs(process.argv.slice(2));
    if (command === "help") {
        process.stdout.write(`${helpText()}\n`);
        return;
    }
    const config = await loadLocalConfig(options);
    if (command === "feature-call") {
        const reqInf = getReqInf(options, config);
        const feature = await loadFeatureDefinition(options);
        const result = await executeFeatureCall(reqInf, {
            feature,
            queryParams: parseJsonOption(options, "query-json"),
            bodyText: await loadBody(options),
            filePath: options.file ? String(options.file) : undefined,
            outputPath: options.output ? String(options.output) : undefined,
            useOriginalName: Boolean(options["use-original-name"]),
        });
        printJson(result);
        return;
    }
    throw new Error(`unsupported command: ${command}. xft-cli only exposes "feature-call".`);
}
main().catch((error) => {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    process.stderr.write(`${JSON.stringify({
        error: String(normalizedError),
        message: normalizedError.message,
        cause: normalizedError.cause ? String(normalizedError.cause) : undefined,
        stack: normalizedError.stack,
    }, null, 2)}\n`);
    process.exit(1);
});
