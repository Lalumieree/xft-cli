import { describe, expect, it } from "vitest";
import { decodeResponseBody, normalizeHex } from "./xftClient";

describe("xftClient helpers", () => {
  it("normalizes hex strings", () => {
    expect(normalizeHex("0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789", "field")).toBe(
      "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
    );
  });

  it("falls back to raw json when not encrypted", () => {
    expect(decodeResponseBody('{"ok":true}', "00112233445566778899aabbccddeeff", false)).toEqual({ ok: true });
  });
});
