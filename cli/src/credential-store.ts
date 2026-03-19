import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import { join } from "node:path";
import { getCredentialBackend } from "./credential-backend.js";

const CREDENTIAL_DIR_NAME = ".xft-openai-cli";
const CREDENTIAL_FILE_NAME = "credentials.enc.json";
const CREDENTIAL_FILE_VERSION = 1;
const CREDENTIAL_CIPHER = "aes-256-gcm";
const CREDENTIAL_KEY_SOURCE = "system-keyring";
const KEYRING_SERVICE = process.env.XFT_OPENAPI_CLI_KEYTAR_SERVICE ?? "xft-openapi-cli";

export interface StoredCredentials {
  appId: string;
  authoritySecret: string;
}

interface CredentialFileEnvelope {
  version: number;
  cipher: string;
  keySource: string;
  keyId: string;
  iv: string;
  authTag: string;
  ciphertext: string;
  updatedAt: string;
}

export class MissingStoredCredentialsError extends Error {
  constructor(message = 'No stored credentials found. Run "xft-openapi-cli auth" to configure them.') {
    super(message);
    this.name = "MissingStoredCredentialsError";
  }
}

export class InvalidStoredCredentialsError extends Error {
  constructor(message = 'Stored credentials are unavailable or invalid. Run "xft-openapi-cli auth" to recreate them.') {
    super(message);
    this.name = "InvalidStoredCredentialsError";
  }
}

function getHomeDirectory(): string {
  return process.env.XFT_OPENAPI_CLI_HOME_DIR ?? os.homedir();
}

function getKeyringAccount(keyId: string): string {
  return `credentials-key:${keyId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function assertNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new InvalidStoredCredentialsError(
      `Stored credentials ${fieldName} is invalid. Run "xft-openapi-cli auth" to recreate them.`,
    );
  }
  return value;
}

function encodeBuffer(buffer: Buffer): string {
  return buffer.toString("base64");
}

function decodeBuffer(value: string, fieldName: string): Buffer {
  try {
    return Buffer.from(value, "base64");
  } catch {
    throw new InvalidStoredCredentialsError(`Stored credentials ${fieldName} is invalid. Run "xft-openapi-cli auth" to recreate them.`);
  }
}

function validateEnvelope(value: unknown): CredentialFileEnvelope {
  if (!isRecord(value)) {
    throw new InvalidStoredCredentialsError();
  }

  return {
    version: Number(value.version),
    cipher: assertNonEmptyString(value.cipher, "cipher"),
    keySource: assertNonEmptyString(value.keySource, "keySource"),
    keyId: assertNonEmptyString(value.keyId, "keyId"),
    iv: assertNonEmptyString(value.iv, "iv"),
    authTag: assertNonEmptyString(value.authTag, "authTag"),
    ciphertext: assertNonEmptyString(value.ciphertext, "ciphertext"),
    updatedAt: assertNonEmptyString(value.updatedAt, "updatedAt"),
  };
}

function validateStoredCredentials(value: unknown): StoredCredentials {
  if (!isRecord(value)) {
    throw new InvalidStoredCredentialsError();
  }

  return {
    appId: assertNonEmptyString(value.appId, "appId"),
    authoritySecret: assertNonEmptyString(value.authoritySecret, "authoritySecret"),
  };
}

async function readEnvelope(): Promise<CredentialFileEnvelope> {
  let raw: string;
  try {
    raw = await readFile(getCredentialFilePath(), "utf8");
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String(error.code) : undefined;
    if (code === "ENOENT") {
      throw new MissingStoredCredentialsError();
    }
    throw error;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    const envelope = validateEnvelope(parsed);
    if (envelope.version !== CREDENTIAL_FILE_VERSION) {
      throw new InvalidStoredCredentialsError(
        `Stored credentials version ${String(envelope.version)} is unsupported. Run "xft-openapi-cli auth" to recreate them.`,
      );
    }
    if (envelope.cipher !== CREDENTIAL_CIPHER || envelope.keySource !== CREDENTIAL_KEY_SOURCE) {
      throw new InvalidStoredCredentialsError();
    }
    return envelope;
  } catch (error) {
    if (error instanceof InvalidStoredCredentialsError) {
      throw error;
    }
    throw new InvalidStoredCredentialsError();
  }
}

async function writeEnvelope(envelope: CredentialFileEnvelope): Promise<void> {
  const credentialDir = getCredentialDirectoryPath();
  const targetPath = getCredentialFilePath();
  const tempPath = `${targetPath}.${process.pid}.${Date.now()}.tmp`;

  await mkdir(credentialDir, { recursive: true });
  try {
    await writeFile(tempPath, `${JSON.stringify(envelope, null, 2)}\n`, "utf8");
    if (process.platform !== "win32") {
      await chmod(tempPath, 0o600).catch(() => undefined);
    }
    await rename(tempPath, targetPath);
  } catch (error) {
    await unlink(tempPath).catch(() => undefined);
    throw error;
  }
}

export function getCredentialDirectoryPath(): string {
  return join(getHomeDirectory(), CREDENTIAL_DIR_NAME);
}

export function getCredentialFilePath(): string {
  return join(getCredentialDirectoryPath(), CREDENTIAL_FILE_NAME);
}

export async function loadStoredCredentials(): Promise<StoredCredentials> {
  const backend = getCredentialBackend();
  const envelope = await readEnvelope();
  const encodedKey = await backend.getPassword(KEYRING_SERVICE, getKeyringAccount(envelope.keyId));
  if (!encodedKey) {
    throw new InvalidStoredCredentialsError(
      'Stored credentials key is unavailable. Run "xft-openapi-cli auth" to recreate them.',
    );
  }

  const key = decodeBuffer(encodedKey, "key");
  if (key.length !== 32) {
    throw new InvalidStoredCredentialsError(
      'Stored credentials key length is invalid. Run "xft-openapi-cli auth" to recreate them.',
    );
  }

  try {
    const decipher = createDecipheriv(CREDENTIAL_CIPHER, key, decodeBuffer(envelope.iv, "iv"));
    decipher.setAuthTag(decodeBuffer(envelope.authTag, "authTag"));
    const plaintext = Buffer.concat([
      decipher.update(decodeBuffer(envelope.ciphertext, "ciphertext")),
      decipher.final(),
    ]).toString("utf8");
    const payload = JSON.parse(plaintext) as unknown;
    return validateStoredCredentials(payload);
  } catch (error) {
    if (error instanceof InvalidStoredCredentialsError) {
      throw error;
    }
    throw new InvalidStoredCredentialsError();
  }
}

export async function saveStoredCredentials(credentials: StoredCredentials): Promise<string> {
  const payload = validateStoredCredentials(credentials);
  const backend = getCredentialBackend();

  let previousKeyId: string | undefined;
  try {
    previousKeyId = (await readEnvelope()).keyId;
  } catch (error) {
    if (!(error instanceof MissingStoredCredentialsError)) {
      previousKeyId = undefined;
    }
  }

  const keyId = randomUUID();
  const key = randomBytes(32);
  const iv = randomBytes(12);
  const cipher = createCipheriv(CREDENTIAL_CIPHER, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  await backend.setPassword(KEYRING_SERVICE, getKeyringAccount(keyId), encodeBuffer(key));

  try {
    await writeEnvelope({
      version: CREDENTIAL_FILE_VERSION,
      cipher: CREDENTIAL_CIPHER,
      keySource: CREDENTIAL_KEY_SOURCE,
      keyId,
      iv: encodeBuffer(iv),
      authTag: encodeBuffer(authTag),
      ciphertext: encodeBuffer(ciphertext),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    await backend.deletePassword(KEYRING_SERVICE, getKeyringAccount(keyId)).catch(() => undefined);
    throw error;
  }

  if (previousKeyId && previousKeyId !== keyId) {
    await backend.deletePassword(KEYRING_SERVICE, getKeyringAccount(previousKeyId)).catch(() => undefined);
  }

  return getCredentialFilePath();
}
