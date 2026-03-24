import { homedir } from "node:os";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
export const skillRoot = basename(currentDir) === "_shared" ? resolve(currentDir, "..") : resolve(currentDir, "..", "..");
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
export const cityEndpoint = "https://api.cmbchina.com/itrip/xft-api/v1/common/city";
export const defaultCityType = "CITY_TREE_DOMESTIC";
export const defaultTtlHours = 168;
export const sensitiveConfigKeys = new Set([
  "appid",
  "app-id",
  "appId",
  "authority-secret",
  "authority_secret",
  "authoritySecret",
]);
