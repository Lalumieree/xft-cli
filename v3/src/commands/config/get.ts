import { Args, Command } from "@oclif/core";
import { configGet } from "../../app/api";

export default class ConfigGetCommand extends Command {
  static override id = "config:get";
  static override summary = "读取配置。";
  static override description = "读取单个配置或整个非敏感配置对象。";
  static override examples = ["<%= config.bin %> config get", "<%= config.bin %> config get gatewayUrl"];
  static override args = {
    key: Args.string({ required: false, description: "配置 key" }),
  };

  public async run(): Promise<void> {
    const { args } = await this.parse(ConfigGetCommand);
    this.log(JSON.stringify(configGet(args.key), null, 2));
  }
}
