import { Command } from "@oclif/core";
import { configList } from "../../app/api";

export default class ConfigListCommand extends Command {
  static override id = "config:list";
  static override summary = "列出已保存的非敏感配置 key。";
  static override description = "输出当前 config.json 中的所有 key。";
  static override examples = ["<%= config.bin %> config list"];

  public async run(): Promise<void> {
    this.log(JSON.stringify(configList(), null, 2));
  }
}
