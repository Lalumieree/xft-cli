import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import { join } from "node:path";
import { buildFeatureCallReqInf, executeAuthCommand, helpText } from "../dist/cli.js";
import {
  getCredentialFilePath,
  loadStoredCredentials,
  saveStoredCredentials,
} from "../dist/index.js";

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

async function withTestEnv(run) {
  const tempRoot = await mkdtemp(join(os.tmpdir(), "xft-cli-test-"));
  const previousHomeDir = process.env.XFT_OPENAPI_CLI_HOME_DIR;
  const previousKeyringFile = process.env.XFT_OPENAPI_CLI_TEST_KEYRING_FILE;
  const homeDir = join(tempRoot, "home");
  const keyringFile = join(tempRoot, "keyring.json");
  process.env.XFT_OPENAPI_CLI_HOME_DIR = homeDir;
  process.env.XFT_OPENAPI_CLI_TEST_KEYRING_FILE = keyringFile;

  try {
    return await run({ homeDir, keyringFile, tempRoot });
  } finally {
    if (previousHomeDir === undefined) {
      delete process.env.XFT_OPENAPI_CLI_HOME_DIR;
    } else {
      process.env.XFT_OPENAPI_CLI_HOME_DIR = previousHomeDir;
    }
    if (previousKeyringFile === undefined) {
      delete process.env.XFT_OPENAPI_CLI_TEST_KEYRING_FILE;
    } else {
      process.env.XFT_OPENAPI_CLI_TEST_KEYRING_FILE = previousKeyringFile;
    }
    await rm(tempRoot, { force: true, recursive: true });
  }
}

async function captureStreams(run) {
  const writes = {
    stderr: "",
    stdout: "",
  };
  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  const originalStderrWrite = process.stderr.write.bind(process.stderr);

  process.stdout.write = ((chunk, encoding, callback) => {
    writes.stdout += String(chunk);
    if (typeof encoding === "function") {
      encoding();
    } else if (typeof callback === "function") {
      callback();
    }
    return true;
  });

  process.stderr.write = ((chunk, encoding, callback) => {
    writes.stderr += String(chunk);
    if (typeof encoding === "function") {
      encoding();
    } else if (typeof callback === "function") {
      callback();
    }
    return true;
  });

  try {
    await run();
    return writes;
  } finally {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
  }
}

function createPromptProvider({ appId, secret }) {
  const calls = [];
  return {
    calls,
    provider: {
      async promptSecret(message) {
        calls.push({ kind: "secret", message });
        return secret;
      },
      async promptText(message) {
        calls.push({ kind: "text", message });
        return appId;
      },
    },
  };
}

test("auth saves credentials non-interactively and warns about cli secret usage", async () => {
  await withTestEnv(async () => {
    const { stderr, stdout } = await captureStreams(async () => {
      await executeAuthCommand({
        "app-id": "app-inline",
        secret: "secret-inline",
      });
    });

    assert.match(stderr, /Warning: passing "--secret"/);
    assert.match(stdout, /Credentials saved to/);

    const credentials = await loadStoredCredentials();
    assert.deepEqual(credentials, {
      appId: "app-inline",
      authoritySecret: "secret-inline",
    });

    const envelope = JSON.parse(await readFile(getCredentialFilePath(), "utf8"));
    assert.equal(envelope.version, 1);
    assert.equal(envelope.cipher, "aes-256-gcm");
    assert.equal(envelope.keySource, "system-keyring");
    assert.ok(typeof envelope.keyId === "string" && envelope.keyId.length > 0);
    assert.ok(typeof envelope.iv === "string" && envelope.iv.length > 0);
    assert.ok(typeof envelope.authTag === "string" && envelope.authTag.length > 0);
    assert.ok(typeof envelope.ciphertext === "string" && envelope.ciphertext.length > 0);
  });
});

test("auth prompts only for missing fields and stores the result", async () => {
  await withTestEnv(async () => {
    const { calls, provider } = createPromptProvider({ appId: "prompted-app", secret: "prompted-secret" });
    await executeAuthCommand({ "app-id": "provided-app" }, provider);

    assert.deepEqual(calls, [{ kind: "secret", message: "Secret: " }]);
    const credentials = await loadStoredCredentials();
    assert.deepEqual(credentials, {
      appId: "provided-app",
      authoritySecret: "prompted-secret",
    });
  });
});

test("re-running auth replaces the envelope key id and cleans up the previous key entry", async () => {
  await withTestEnv(async ({ keyringFile }) => {
    await executeAuthCommand({ "app-id": "first-app", secret: "first-secret" });
    const firstEnvelope = JSON.parse(await readFile(getCredentialFilePath(), "utf8"));

    await executeAuthCommand({ "app-id": "second-app", secret: "second-secret" });
    const secondEnvelope = JSON.parse(await readFile(getCredentialFilePath(), "utf8"));

    assert.notEqual(firstEnvelope.keyId, secondEnvelope.keyId);

    const keyringState = JSON.parse(await readFile(keyringFile, "utf8"));
    assert.equal(Object.keys(keyringState.passwords).length, 1);

    const credentials = await loadStoredCredentials();
    assert.deepEqual(credentials, {
      appId: "second-app",
      authoritySecret: "second-secret",
    });
  });
});

test("feature-call request info reads credentials only from the secure store", async () => {
  await withTestEnv(async () => {
    await saveStoredCredentials({
      appId: "stored-app",
      authoritySecret: "stored-secret",
    });

    const reqInf = await buildFeatureCallReqInf({
      "company-id": "company-1",
      "eds-company-id": "eds-1",
      "usr-nbr": "user-001",
      "usr-uid": "uid-001",
      "whr-service": true,
    });

    assert.deepEqual(reqInf, {
      appId: "stored-app",
      authoritySecret: "stored-secret",
      companyId: "company-1",
      edsCompanyId: "eds-1",
      usrNbr: "user-001",
      usrUid: "uid-001",
      whrService: true,
    });
  });
});

test("feature-call tells the user to run auth when no credentials are stored", async () => {
  await withTestEnv(async () => {
    await assert.rejects(() => buildFeatureCallReqInf({}), /Run "xft-openapi-cli auth" to configure them\./);
  });
});

test("invalid credential file or missing keyring entry tells the user to rerun auth", async () => {
  await withTestEnv(async ({ keyringFile }) => {
    await saveStoredCredentials({
      appId: "stored-app",
      authoritySecret: "stored-secret",
    });

    await writeFile(getCredentialFilePath(), "{not-json}", "utf8");
    await assert.rejects(() => loadStoredCredentials(), /recreate them/);

    await saveStoredCredentials({
      appId: "stored-app",
      authoritySecret: "stored-secret",
    });

    await writeFile(keyringFile, JSON.stringify({ passwords: {} }, null, 2), "utf8");
    await assert.rejects(() => loadStoredCredentials(), /key is unavailable/);
  });
});

test("legacy config and credential flags are rejected for feature-call", async () => {
  await withTestEnv(async () => {
    await assert.rejects(() => buildFeatureCallReqInf({ config: "./local-config.json" }), /no longer supports "--config"/);
    await assert.rejects(() => buildFeatureCallReqInf({ "app-id": "abc" }), /no longer accepts credential flags/);
  });
});

test("help text documents auth and removes config guidance", async () => {
  assert.match(helpText(), /Primary commands:\s+auth\s+feature-call/s);
  assert.doesNotMatch(helpText(), /--config/);
});

let passed = 0;
for (const entry of tests) {
  try {
    await entry.fn();
    process.stdout.write(`ok - ${entry.name}\n`);
    passed += 1;
  } catch (error) {
    process.stderr.write(`not ok - ${entry.name}\n`);
    if (error instanceof Error && error.stack) {
      process.stderr.write(`${error.stack}\n`);
    } else {
      process.stderr.write(`${String(error)}\n`);
    }
    process.exitCode = 1;
    break;
  }
}

if (process.exitCode !== 1) {
  process.stdout.write(`${passed} tests passed\n`);
}
