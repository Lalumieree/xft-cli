import { Command, Flags } from "@oclif/core";
import { callApi } from "../../app/api";

export default class ApiCallCommand extends Command {
  static override id = "api:call";
  static override summary = "通过网关调用 XFT API。";
  static override description = "使用 xft-gateway 的接口名、查询参数和请求体调用 XFT API。";
  static override examples = [
    '<%= config.bin %> api call --interface-name 表单配置列表查询 --body start=0 --body limit=20 --dry-run',
    '<%= config.bin %> api call --interface-name 新建差旅申请单 --payload-file payload.json --timeout 60',
  ];
  static override flags = {
    "interface-name": Flags.string({ description: "xft-gateway 中配置的接口名。" }),
    query: Flags.string({ multiple: true, description: "追加查询参数，格式为 key=value。" }),
    body: Flags.string({ multiple: true, description: "追加请求体字段，格式为 key=value。" }),
    "payload-file": Flags.string({ description: "从 JSON 文件读取请求体对象。" }),
    timeout: Flags.integer({ default: 30, description: "请求超时时间，单位秒。" }),
    "dry-run": Flags.boolean({ description: "仅输出网关请求预览，不真正发起调用。" }),
    url: Flags.string({ hidden: true, description: "已废弃：不再支持直连 URL。" }),
    method: Flags.option({ options: ["GET", "POST"] as const, hidden: true, description: "已废弃：方法由网关接口目录维护。" })(),
    "sign-content-mode": Flags.option({ options: ["raw-body", "digest-header"] as const, hidden: true, description: "已废弃：签名由网关处理。" })(),
    appid: Flags.string({ hidden: true, description: "已废弃：薪福通凭证由网关管理。" }),
    "authority-secret": Flags.string({ hidden: true, description: "已废弃：薪福通凭证由网关管理。" }),
    cscappuid: Flags.string({ hidden: true, description: "已废弃：薪福通公共参数由网关生成。" }),
    cscprjcod: Flags.string({ hidden: true, description: "已废弃：薪福通公共参数由网关生成。" }),
    cscusrnbr: Flags.string({ hidden: true, description: "已废弃：薪福通公共参数由网关生成。" }),
    cscusruid: Flags.string({ hidden: true, description: "已废弃：薪福通公共参数由网关生成。" }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(ApiCallCommand);
    const result = await callApi({
      interfaceName: flags["interface-name"],
      url: flags.url,
      method: flags.method,
      queryEntries: flags.query,
      bodyEntries: flags.body,
      payloadFile: flags["payload-file"],
      timeoutSeconds: flags.timeout,
      dryRun: flags["dry-run"],
      signContentMode: flags["sign-content-mode"],
      appid: flags.appid,
      authoritySecret: flags["authority-secret"],
      cscappuid: flags.cscappuid,
      cscprjcod: flags.cscprjcod,
      cscusrnbr: flags.cscusrnbr,
      cscusruid: flags.cscusruid,
    });
    this.log(JSON.stringify(result, null, 2));
  }
}

