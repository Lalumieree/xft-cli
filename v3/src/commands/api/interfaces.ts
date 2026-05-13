import { Command, Flags } from "@oclif/core";
import { listInterfaces } from "../../app/api";

export default class ApiInterfacesCommand extends Command {
  static override id = "api:interfaces";
  static override summary = "列出网关可调用接口。";
  static override description = "通过 xft-gateway 查询当前 token 有权限调用的接口名。";
  static override examples = ["<%= config.bin %> api interfaces"];
  static override flags = {
    timeout: Flags.integer({ default: 30, description: "请求超时时间，单位秒。" }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(ApiInterfacesCommand);
    const result = await listInterfaces({ timeoutSeconds: flags.timeout });
    this.log(JSON.stringify(result, null, 2));
  }
}
