#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { pathToFileURL } from "node:url";
import { executeFeatureCall, validateFeatureDefinition } from "./index.js";
import { loadStoredCredentials, saveStoredCredentials, type StoredCredentials } from "./credential-store.js";
import type { BaseReqInf, FeatureDefinition, QueryParams } from "./types.js";

type CliOptions = Record<string, string | boolean>;

interface PromptProvider {
  close?(): void | Promise<void>;
  promptSecret(message: string): Promise<string>;
  promptText(message: string): Promise<string>;
}

class MutableOutput extends Writable {
  muted = false;

  _write(chunk: Buffer | string, encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    if (!this.muted) {
      process.stdout.write(chunk, encoding);
    }
    callback();
  }
}

export function parseArgs(argv: string[]): { command: string; options: CliOptions } {
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

export function helpText(): string {
  return `Usage: xft-openapi-cli <command> [options]

Primary commands:
  auth
  feature-call

auth options:
  --app-id <value>
  --secret <value>

feature-call options:
  --feature <path-or-json>
  --query-json <json>
  --body-json <json>
  --body-file <path>
  --file <path>
  --output <path>

Run "xft-openapi-cli auth" first to store app credentials securely in your user home.`;
}

async function loadJsonFile(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8")) as unknown;
}

function parseInlineJson(raw: string, optionName: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`option --${optionName} must be valid JSON or a readable JSON file path: ${message}`);
  }
}

async function loadJsonValueOrFile(rawValue: string, optionName: string): Promise<unknown> {
  const trimmed = rawValue.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return parseInlineJson(trimmed, optionName);
  }

  try {
    return await loadJsonFile(rawValue);
  } catch {
    return parseInlineJson(rawValue, optionName);
  }
}

async function loadFeatureDefinition(options: CliOptions): Promise<FeatureDefinition> {
  if (options.feature) {
    const parsed = await loadJsonValueOrFile(String(options.feature), "feature");
    return validateFeatureDefinition(parsed);
  }

  throw new Error("missing feature definition: provide --feature");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getStringOption(options: CliOptions, key: string): string | undefined {
  const value = options[key];
  if (value !== undefined && value !== true && value !== "") {
    return String(value);
  }
  return undefined;
}

function createPromptProvider(): PromptProvider {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Interactive auth requires a TTY. Provide both "--app-id" and "--secret" explicitly.');
  }

  const output = new MutableOutput();
  const rl = createInterface({
    input: process.stdin,
    output,
    terminal: true,
  });

  return {
    close(): void {
      rl.close();
    },
    async promptSecret(message: string): Promise<string> {
      process.stdout.write(message);
      output.muted = true;
      try {
        const answer = await rl.question("");
        process.stdout.write("\n");
        return answer.trim();
      } finally {
        output.muted = false;
      }
    },
    async promptText(message: string): Promise<string> {
      const answer = await rl.question(message);
      return answer.trim();
    },
  };
}

function assertNoLegacyCredentialOptions(options: CliOptions): void {
  if (options.config) {
    throw new Error('feature-call no longer supports "--config". Run "xft-openapi-cli auth" and pass non-sensitive options explicitly.');
  }
  if (options["app-id"] || options["authority-secret"] || options.secret) {
    throw new Error(
      'feature-call no longer accepts credential flags. Run "xft-openapi-cli auth" to store credentials, then retry without "--app-id", "--authority-secret", or "--secret".',
    );
  }
}

export async function buildFeatureCallReqInf(options: CliOptions): Promise<BaseReqInf> {
  assertNoLegacyCredentialOptions(options);
  const credentials = await loadStoredCredentials();
  return {
    appId: credentials.appId,
    authoritySecret: credentials.authoritySecret,
    companyId: getStringOption(options, "company-id"),
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

async function resolveAuthCredentials(options: CliOptions, promptProvider?: PromptProvider): Promise<StoredCredentials> {
  let managedPromptProvider = promptProvider;
  try {
    let appId = getStringOption(options, "app-id");
    let authoritySecret = getStringOption(options, "secret");

    if (!appId) {
      managedPromptProvider ??= createPromptProvider();
      appId = await managedPromptProvider.promptText("App ID: ");
    }
    if (!authoritySecret) {
      managedPromptProvider ??= createPromptProvider();
      authoritySecret = await managedPromptProvider.promptSecret("Secret: ");
    }

    if (!appId) {
      throw new Error('Auth requires a non-empty app id. Provide "--app-id" or enter it interactively.');
    }
    if (!authoritySecret) {
      throw new Error('Auth requires a non-empty secret. Provide "--secret" or enter it interactively.');
    }

    return {
      appId,
      authoritySecret,
    };
  } finally {
    await managedPromptProvider?.close?.();
  }
}

export async function executeAuthCommand(options: CliOptions, promptProvider?: PromptProvider): Promise<void> {
  if (getStringOption(options, "secret")) {
    process.stderr.write(
      'Warning: passing "--secret" on the command line can expose it via shell history or process inspection.\n',
    );
  }

  const credentials = await resolveAuthCredentials(options, promptProvider);
  const savedPath = await saveStoredCredentials(credentials);
  process.stdout.write(`Credentials saved to ${savedPath}\n`);
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const { command, options } = parseArgs(argv);
  if (command === "help") {
    process.stdout.write(`${helpText()}\n`);
    return;
  }

  if (command === "auth") {
    await executeAuthCommand(options);
    return;
  }

  if (command === "feature-call") {
    const reqInf = await buildFeatureCallReqInf(options);
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

  throw new Error(`unsupported command: ${command}. xft-openapi-cli only exposes "auth" and "feature-call".`);
}

function isDirectExecution(): boolean {
  return Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isDirectExecution()) {
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
}
