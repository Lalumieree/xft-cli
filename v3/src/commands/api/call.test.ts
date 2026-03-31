import { describe, expect, it } from "vitest";
import ApiCallCommand from "./call";

describe("api call command", () => {
  it("defines oclif option flags as materialized option definitions", () => {
    expect(ApiCallCommand.flags.method.type).toBe("option");
    expect(ApiCallCommand.flags.method.options).toEqual(["GET", "POST"]);
    expect(ApiCallCommand.flags["sign-content-mode"].type).toBe("option");
    expect(ApiCallCommand.flags["sign-content-mode"].options).toEqual(["raw-body", "digest-header"]);
  });
});

