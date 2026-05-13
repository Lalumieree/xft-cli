import { defaultGatewayCityInterfaceName } from "./constants";
import { getNonSensitiveValue, loadSensitiveCredentials } from "./configStore";
import { normalizeGatewayUrl } from "./gatewayClient";
import type { GatewayCredentials } from "./types";

export function resolveGatewayUrl(config: Record<string, unknown>): string | undefined {
  const value =
    (getNonSensitiveValue(config, "gatewayUrl", "gateway-url", "gatewayBaseUrl", "gateway-base-url") as string | undefined) ??
    process.env.XFT_GATEWAY_BASE_URL;
  return value ? normalizeGatewayUrl(value) : undefined;
}

export async function resolveGatewayCredentials(config: Record<string, unknown>): Promise<GatewayCredentials | undefined> {
  const gatewayUrl = resolveGatewayUrl(config);
  const storedCredentials: Record<string, string> = await loadSensitiveCredentials().catch(() => ({}));
  const token = storedCredentials["gateway-token"] || process.env.XFT_GATEWAY_TOKEN;
  if (!gatewayUrl || !token) {
    return undefined;
  }
  return { gatewayUrl, token };
}

export async function requireGatewayCredentials(config: Record<string, unknown>): Promise<GatewayCredentials> {
  const credentials = await resolveGatewayCredentials(config);
  if (!credentials) {
    throw new Error("未找到网关配置，请先执行 xft-cli auth，或通过 XFT_GATEWAY_BASE_URL 和 XFT_GATEWAY_TOKEN 提供");
  }
  return credentials;
}

export function resolveGatewayCityInterfaceName(config: Record<string, unknown>, override?: string): string {
  return (
    override ??
    (getNonSensitiveValue(config, "gatewayCityInterfaceName", "gateway-city-interface-name") as string | undefined) ??
    process.env.XFT_GATEWAY_CITY_INTERFACE_NAME ??
    defaultGatewayCityInterfaceName
  );
}
