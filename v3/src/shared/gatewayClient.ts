import type { GatewayCredentials, GatewayInterface } from "./types";

type GatewayRequestPreview = {
  method: "GET" | "POST";
  url: string;
  headers: Record<string, string>;
  body?: unknown;
};

type GatewayResponsePayload = {
  request: GatewayRequestPreview;
  response: {
    status_code: number;
    headers: Record<string, string>;
    raw_text: string;
    body: unknown;
  };
};

export type GatewayCallInput = {
  interfaceName: string;
  query?: Record<string, unknown>;
  body?: unknown;
};

export function normalizeGatewayUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("gatewayUrl 不能为空");
  }
  const parsed = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`);
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

export function redactToken(token: string): string {
  const trimmed = token.trim();
  if (trimmed.length <= 8) {
    return "***";
  }
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
}

function parseBody(text: string): unknown {
  if (!text.trim()) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function errorMessage(status: number, body: unknown): string {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const record = body as Record<string, unknown>;
    const message = record.msg ?? record.message ?? record.error;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  if (typeof body === "string" && body.trim()) {
    return body;
  }
  return `HTTP ${status}`;
}

export class GatewayClient {
  public readonly gatewayUrl: string;

  public constructor(private readonly credentials: GatewayCredentials, private readonly timeout = 30_000) {
    this.gatewayUrl = normalizeGatewayUrl(credentials.gatewayUrl);
  }

  public static async authenticate(gatewayUrl: string, email: string, password: string, timeout = 30_000): Promise<{ gatewayUrl: string; token: string; userId?: string }> {
    const normalizedGatewayUrl = normalizeGatewayUrl(gatewayUrl);
    const url = `${normalizedGatewayUrl}/auth`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(timeout),
    });
    const rawText = await response.text();
    const body = parseBody(rawText);
    if (!response.ok) {
      throw new Error(`网关认证失败，${errorMessage(response.status, body)}`);
    }
    if (!body || typeof body !== "object" || Array.isArray(body) || typeof (body as Record<string, unknown>).token !== "string") {
      throw new Error("网关认证响应缺少 token");
    }
    return {
      gatewayUrl: normalizedGatewayUrl,
      token: (body as Record<string, string>).token,
      userId: typeof (body as Record<string, unknown>).userId === "string" ? (body as Record<string, string>).userId : undefined,
    };
  }

  public prepareCall(input: GatewayCallInput, redact = true): GatewayRequestPreview {
    const body = {
      interface_name: input.interfaceName,
      query: input.query ?? {},
      body: input.body ?? {},
    };
    return {
      method: "POST",
      url: `${this.gatewayUrl}/call-xft`,
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "Xft-gateway-token": redact ? redactToken(this.credentials.token) : this.credentials.token,
      },
      body,
    };
  }

  public prepareInterfacesRequest(redact = true): GatewayRequestPreview {
    return {
      method: "GET",
      url: `${this.gatewayUrl}/interfaces`,
      headers: {
        accept: "application/json",
        "Xft-gateway-token": redact ? redactToken(this.credentials.token) : this.credentials.token,
      },
    };
  }

  public async callXft(input: GatewayCallInput): Promise<GatewayResponsePayload> {
    const request = this.prepareCall(input, false);
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: JSON.stringify(request.body),
      signal: AbortSignal.timeout(this.timeout),
    });
    return this.buildPayload(response, this.prepareCall(input, true));
  }

  public async listInterfaces(): Promise<GatewayResponsePayload & { data: GatewayInterface[] }> {
    const request = this.prepareInterfacesRequest(false);
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      signal: AbortSignal.timeout(this.timeout),
    });
    const payload = await this.buildPayload(response, this.prepareInterfacesRequest(true));
    const body = payload.response.body;
    const data = body && typeof body === "object" && !Array.isArray(body) && Array.isArray((body as Record<string, unknown>).data)
      ? ((body as Record<string, GatewayInterface[]>).data)
      : [];
    return { ...payload, data };
  }

  private async buildPayload(response: Response, redactedRequest: GatewayRequestPreview): Promise<GatewayResponsePayload> {
    const rawText = await response.text();
    const body = parseBody(rawText);
    return {
      request: redactedRequest,
      response: {
        status_code: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        raw_text: rawText,
        body,
      },
    };
  }
}
