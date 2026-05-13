import { Command } from "@oclif/core";
import { saveAuthCredentials } from "../app/api";

export default class AuthCommand extends Command {
  static override id = "auth";
  static override summary = "登录 xft-gateway 并保存 token。";
  static override description = "交互式输入 gatewayUrl、邮箱和密码，调用网关 /auth 后仅保存返回的 Xft-gateway-token。";
  static override examples = ["<%= config.bin %> auth"];

  public async run(): Promise<void> {
    await saveAuthCredentials();
    this.log("ok");
  }
}
