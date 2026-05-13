import { afterEach, describe, expect, it, vi } from "vitest";
import { GatewayClient, normalizeGatewayUrl, redactToken } from "./gatewayClient";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("gatewayClient", () => {
  it("normalizes gateway URLs", () => {
    expect(normalizeGatewayUrl("localhost:3000/")).toBe("http://localhost:3000");
    expect(normalizeGatewayUrl("https://example.com/gateway/")).toBe("https://example.com/gateway");
  });

  it("redacts gateway tokens", () => {
    expect(redactToken("1234567890abcdef")).toBe("1234...cdef");
    expect(redactToken("short")).toBe("***");
  });

  it("builds dry-run call previews with a redacted token", () => {
    const client = new GatewayClient({ gatewayUrl: "http://localhost:3000", token: "1234567890abcdef" });

    expect(client.prepareCall({ interfaceName: "查询组织列表", query: { page: 1 }, body: { keyword: "研发" } })).toEqual({
      method: "POST",
      url: "http://localhost:3000/call-xft",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "Xft-gateway-token": "1234...cdef",
      },
      body: {
        interface_name: "查询组织列表",
        query: { page: 1 },
        body: { keyword: "研发" },
      },
    });
  });

  it("posts auth credentials and returns the gateway token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ userId: "u1", token: "token-value" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    await expect(GatewayClient.authenticate("http://localhost:3000", "user@example.com", "password")).resolves.toEqual({
      gatewayUrl: "http://localhost:3000",
      token: "token-value",
      userId: "u1",
    });
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/auth",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "user@example.com", password: "password" }),
      }),
    );
  });

  it("sends token headers when listing interfaces", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: [{ id: "1", name: "查询组织列表" }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    const client = new GatewayClient({ gatewayUrl: "http://localhost:3000", token: "secret-token" });

    const result = await client.listInterfaces();

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/interfaces",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ "Xft-gateway-token": "secret-token" }),
      }),
    );
    expect(result.data).toEqual([{ id: "1", name: "查询组织列表" }]);
    expect(result.request.headers["Xft-gateway-token"]).toBe("secr...oken");
  });

  it("wraps call-xft responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    const client = new GatewayClient({ gatewayUrl: "http://localhost:3000", token: "secret-token" });

    const result = await client.callXft({ interfaceName: "查询组织列表", query: {}, body: {} });

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/call-xft",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "Xft-gateway-token": "secret-token" }),
      }),
    );
    expect(result.response.status_code).toBe(200);
    expect(result.response.body).toEqual({ success: true });
    expect(result.request.headers["Xft-gateway-token"]).toBe("secr...oken");
  });
});
