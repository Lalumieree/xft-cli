import { Command, Flags } from "@oclif/core";
import { refreshCityCache, renderCityRefresh } from "../../app/city";

export default class CityRefreshCommand extends Command {
  static override id = "city:refresh";
  static override summary = "刷新城市缓存。";
  static override description = "优先复用缓存，必要时通过 xft-gateway 刷新城市树。";
  static override enableJsonFlag = true;
  static override examples = [
    "<%= config.bin %> city refresh --force",
    "<%= config.bin %> city refresh --ttl-hours 24 --json",
  ];
  static override flags = {
    force: Flags.boolean({ description: "忽略缓存有效期，强制刷新城市树。" }),
    "ttl-hours": Flags.integer({ default: 168, description: "缓存有效期，单位小时。" }),
    "cache-file": Flags.string({ description: "自定义缓存文件路径。" }),
    "city-type": Flags.string({ description: "城市树类型。", default: "CITY_TREE_DOMESTIC" }),
    "interface-name": Flags.string({ description: "xft-gateway 中的城市接口名，默认读取配置或使用“查询所有城市信息”。" }),
    timeout: Flags.integer({ default: 30, description: "请求超时时间，单位秒。" }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(CityRefreshCommand);
    const payload = await refreshCityCache({
      force: flags.force,
      ttlHours: flags["ttl-hours"],
      cacheFile: flags["cache-file"],
      cityType: flags["city-type"],
      interfaceName: flags["interface-name"],
      timeoutSeconds: flags.timeout,
    });
    if (this.jsonEnabled()) {
      this.logJson(payload);
      return;
    }
    this.log(renderCityRefresh(payload));
  }
}
