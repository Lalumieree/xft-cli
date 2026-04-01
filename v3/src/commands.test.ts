import { describe, expect, it } from "vitest";
import commands from "./commands";

describe("oclif command registry", () => {
  it("exposes the consolidated xft-cli command tree", () => {
    expect(Object.keys(commands).sort()).toEqual([
      "api:call",
      "auth",
      "city:refresh",
      "city:resolve",
      "config:get",
      "config:list",
      "config:set",
      "doc:fetch",
      "doc:find",
    ]);
  });
});
