import { Command, Flags } from "@oclif/core";
import { fetchDocs } from "../../app/doc";

export default class DocFetchCommand extends Command {
  static override id = "doc:fetch";
  static override summary = "抓取并缓存 XFT 文档。";
  static override description = "抓取指定文档并缓存为 markdown，可选生成 HTML 与原始 JSON。";
  static override examples = [
    "<%= config.bin %> doc fetch --docid 12509",
    "<%= config.bin %> doc fetch --docid 12509 --force --html",
    "<%= config.bin %> doc fetch --menuid 13404",
  ];
  static override flags = {
    docid: Flags.string({ multiple: true, description: "按文档 menuId 抓取，可重复传入或逗号分隔。" }),
    menuid: Flags.string({ multiple: true, description: "按菜单路径上的 menuId 抓取，可重复传入或逗号分隔。" }),
    "menu-file": Flags.string({ description: "指定自定义菜单索引文件。" }),
    force: Flags.boolean({ description: "忽略 7 天缓存有效期，强制重新抓取。" }),
    html: Flags.boolean({ description: "额外生成 HTML 产物。" }),
    raw: Flags.boolean({ description: "额外生成接口原始 JSON 产物。" }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(DocFetchCommand);
    const payload = await fetchDocs({
      docIds: flags.docid,
      menuIds: flags.menuid,
      menuFile: flags["menu-file"],
      force: flags.force,
      html: flags.html,
      raw: flags.raw,
    });
    for (const outputDir of payload.outputDirs) this.log(outputDir);
  }
}
