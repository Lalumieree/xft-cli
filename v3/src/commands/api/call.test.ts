import { describe, expect, it } from "vitest";
import ApiCallCommand from "./call";

describe("api call command", () => {
  it("defines gateway call flags and keeps direct-call flags hidden for migration errors", () => {
    expect(ApiCallCommand.flags["interface-name"].type).toBe("option");
    expect(ApiCallCommand.flags.url.hidden).toBe(true);
    expect(ApiCallCommand.flags.method.hidden).toBe(true);
  });
});

