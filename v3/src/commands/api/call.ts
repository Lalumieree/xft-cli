import { Command, Flags } from "@oclif/core";
import { callApi } from "../../app/api";

export default class ApiCallCommand extends Command {
  static override id = "api:call";
  static override summary = "调用 XFT API。";
  static override description = "根据凭证、URL 与请求参数组装并调用 XFT API。";
  static override examples = [
    '<%= config.bin %> api call --url https://api.example.com/demo --method POST --body billNo=2026032335272513 --dry-run',
    '<%= config.bin %> api call --url https://api.example.com/demo --method POST --payload-file payload.json --timeout 60',
  ];
  static override flags = {
    url: Flags.string({ description: "目标接口地址。" }),
    method: Flags.option({ options: ["GET", "POST"] as const, default: "GET", description: "HTTP 方法。" })(),
    query: Flags.string({ multiple: true, description: "追加查询参数，格式为 key=value。" }),
    body: Flags.string({ multiple: true, description: "追加请求体字段，格式为 key=value。" }),
    "payload-file": Flags.string({ description: "从 JSON 文件读取请求体对象。" }),
    timeout: Flags.integer({ default: 30, description: "请求超时时间，单位秒。" }),
    "dry-run": Flags.boolean({ description: "仅输出组装后的请求，不真正发起调用。" }),
    "sign-content-mode": Flags.option({ options: ["raw-body", "digest-header"] as const, default: "raw-body", description: "签名内容模式。" })(),
    appid: Flags.string({ description: "临时指定 app-id。" }),
    "authority-secret": Flags.string({ description: "临时指定 authority-secret。" }),
    cscappuid: Flags.string({ description: "临时指定 CSCAPPUID。" }),
    cscprjcod: Flags.string({ description: "临时指定 CSCPRJCOD。" }),
    cscusrnbr: Flags.string({ description: "临时指定 CSCUSRNBR。" }),
    cscusruid: Flags.string({ description: "临时指定 CSCUSRUID。" }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(ApiCallCommand);
    const result = await callApi({
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

