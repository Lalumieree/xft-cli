import { Command } from "@oclif/core";
import { saveAuthCredentials } from "../app/api";

export default class AuthCommand extends Command {
  static override id = "auth";
  static override summary = "交互式保存敏感凭证。";
  static override description = "将 app-id 与 authority-secret 保存到加密凭证文件，并通过 keytar 保存主密钥。";
  static override examples = ["<%= config.bin %> auth"];

  public async run(): Promise<void> {
    await saveAuthCredentials();
    this.log("ok");
  }
}
