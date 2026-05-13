import { Args, Command } from "@oclif/core";
import { configSet } from "../../app/api";

export default class ConfigSetCommand extends Command {
  static override id = "config:set";
  static override summary = "写入非敏感配置。";
  static override description = "将非敏感配置写入 ~/.xft_config/config.json。";
  static override examples = ["<%= config.bin %> config set gatewayUrl http://localhost:3000"];
  static override args = {
    key: Args.string({ required: true, description: "配置 key" }),
    value: Args.string({ required: true, description: "配置 value" }),
  };

  public async run(): Promise<void> {
    const { args } = await this.parse(ConfigSetCommand);
    configSet(args.key, args.value);
    this.log("ok");
  }
}
