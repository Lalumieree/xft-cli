import { Command, Flags } from "@oclif/core";
import { renderCityResolve, resolveCityCodes } from "../../app/city";

export default class CityResolveCommand extends Command {
  static override id = "city:resolve";
  static override summary = "解析 XFT 城市编码。";
  static override description = "将用户输入的地名解析为 XFT 城市编码候选。";
  static override enableJsonFlag = true;
  static override examples = [
    '<%= config.bin %> city resolve --name "福州市鼓楼区" --json',
    '<%= config.bin %> city resolve --from-name "上海市" --to-name "北京市"',
  ];
  static override flags = {
    name: Flags.string({ multiple: true, description: "解析单个地名；可重复传入。" }),
    "from-name": Flags.string({ description: "解析出发地名称。" }),
    "to-name": Flags.string({ description: "解析目的地名称。" }),
    top: Flags.integer({ default: 5, description: "每个查询返回的候选数量。" }),
    "cache-file": Flags.string({ description: "自定义城市缓存文件路径。" }),
    "ttl-hours": Flags.integer({ default: 168, description: "缓存有效期，单位小时。" }),
    "force-refresh": Flags.boolean({ description: "忽略缓存有效期并尝试刷新城市树。" }),
    timeout: Flags.integer({ default: 30, description: "请求超时时间，单位秒。" }),
    appid: Flags.string({ description: "临时指定 app-id。" }),
    "authority-secret": Flags.string({ description: "临时指定 authority-secret。" }),
    cscappuid: Flags.string({ description: "临时指定 CSCAPPUID。" }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(CityResolveCommand);
    const payload = await resolveCityCodes({
      names: flags.name,
      fromName: flags["from-name"],
      toName: flags["to-name"],
      top: flags.top,
      cacheFile: flags["cache-file"],
      ttlHours: flags["ttl-hours"],
      forceRefresh: flags["force-refresh"],
      timeoutSeconds: flags.timeout,
      appid: flags.appid,
      authoritySecret: flags["authority-secret"],
      cscappuid: flags.cscappuid,
    });
    if (this.jsonEnabled()) {
      this.logJson(payload);
      return;
    }
    this.log(renderCityResolve(payload));
  }
}
