import { Command, Flags } from "@oclif/core";
import { defaultMenuFile } from "../../shared/constants";
import { findDocs, renderDocSearch } from "../../app/doc";

export default class DocFindCommand extends Command {
  static override id = "doc:find";
  static override summary = "匹配 XFT OpenAPI 文档。";
  static override description = "根据自然语言查询匹配最相关的 XFT 文档条目。";
  static override enableJsonFlag = true;
  static override examples = [
    '<%= config.bin %> doc find --query "创建差旅申请单" --top 5',
    '<%= config.bin %> doc find --query "获取组织列表" --top 3 --json',
  ];
  static override flags = {
    query: Flags.string({ required: true, description: "输入自然语言查询。" }),
    top: Flags.integer({ default: 5, description: "返回候选结果数量。" }),
    "menu-file": Flags.string({ description: "指定自定义菜单索引文件。", default: defaultMenuFile }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(DocFindCommand);
    const payload = findDocs(flags.query, flags.top, flags["menu-file"]);
    if (this.jsonEnabled()) {
      this.logJson(payload);
      return;
    }
    this.log(renderDocSearch(payload));
  }
}
