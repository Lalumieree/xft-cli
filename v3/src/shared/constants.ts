import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const skillRootCandidates = [
  currentDir,
  resolve(currentDir, ".."),
  resolve(currentDir, "..", "skills", "xft-openapi-caller"),
  resolve(currentDir, "..", ".."),
];

export const skillRoot =
  skillRootCandidates.find((candidate) => existsSync(resolve(candidate, "references", "文档目录.json"))) ??
  resolve(currentDir, "..", "skills", "xft-openapi-caller");
export const defaultMenuFile = resolve(skillRoot, "references", "文档目录.json");
export const configDir = resolve(homedir(), ".xft_config");
export const configFile = resolve(configDir, "config.json");
export const credentialsFile = resolve(configDir, "credentials.json.enc");
export const cityCacheDir = resolve(configDir, ".cache");
export const docsCacheDir = resolve(configDir, "xft_docs");
export const credentialService = "xft-tools";
export const credentialAccount = "master-key";
export const fetchApi = "https://xft.cmbchina.com/xft-gateway/xft-cust-open-new/xwapi/capi/homepage/doc/obtain-homepage-doc";
export const referer = "https://xft.cmbchina.com/open/";
export const origin = "https://xft.cmbchina.com";
export const defaultCityType = "CITY_TREE_DOMESTIC";
export const defaultGatewayCityInterfaceName = "查询所有城市信息";
export const defaultTtlHours = 168;
export const sensitiveConfigKeys = new Set([
  "gateway-token",
  "gateway_token",
  "gatewayToken",
  "token",
  "appid",
  "app-id",
  "appId",
  "authority-secret",
  "authority_secret",
  "authoritySecret",
]);
