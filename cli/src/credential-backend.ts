import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import keytar from "keytar";

export interface CredentialBackend {
  deletePassword(service: string, account: string): Promise<boolean>;
  getPassword(service: string, account: string): Promise<string | null>;
  setPassword(service: string, account: string, password: string): Promise<void>;
}

interface FileBackendState {
  passwords: Record<string, string>;
}

function buildStateKey(service: string, account: string): string {
  return `${service}::${account}`;
}

class FileCredentialBackend implements CredentialBackend {
  constructor(private readonly filePath: string) {}

  async deletePassword(service: string, account: string): Promise<boolean> {
    const state = await this.readState();
    const stateKey = buildStateKey(service, account);
    if (!(stateKey in state.passwords)) {
      return false;
    }

    delete state.passwords[stateKey];
    await this.writeState(state);
    return true;
  }

  async getPassword(service: string, account: string): Promise<string | null> {
    const state = await this.readState();
    return state.passwords[buildStateKey(service, account)] ?? null;
  }

  async setPassword(service: string, account: string, password: string): Promise<void> {
    const state = await this.readState();
    state.passwords[buildStateKey(service, account)] = password;
    await this.writeState(state);
  }

  private async readState(): Promise<FileBackendState> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "passwords" in parsed &&
        typeof parsed.passwords === "object" &&
        parsed.passwords !== null
      ) {
        const passwords: Record<string, string> = {};
        for (const [key, value] of Object.entries(parsed.passwords)) {
          if (typeof value === "string") {
            passwords[key] = value;
          }
        }
        return { passwords };
      }
    } catch (error) {
      const code = error instanceof Error && "code" in error ? String(error.code) : undefined;
      if (code === "ENOENT") {
        return { passwords: {} };
      }
    }

    return { passwords: {} };
  }

  private async writeState(state: FileBackendState): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(state, null, 2), "utf8");
  }
}

export function getCredentialBackend(): CredentialBackend {
  const testKeyringFile = process.env.XFT_OPENAPI_CLI_TEST_KEYRING_FILE;
  if (testKeyringFile) {
    return new FileCredentialBackend(testKeyringFile);
  }
  return keytar;
}
