import { describe, expect, it } from "vitest";
import { parseCliArgs, parseTargets } from "./cli.js";

describe("cli arg parsing", () => {
  it("parses dry-run and yes flags", () => {
    expect(parseCliArgs(["--dry-run", "--yes"])).toEqual({
      dryRun: true,
      yes: true,
    });
  });

  it("parses target aliases", () => {
    expect(parseTargets("codex,claude-code")).toEqual(["codex", "claude"]);
  });

  it("parses package version", () => {
    expect(parseCliArgs(["--package-version", "1.2.3"]).packageVersion).toBe("1.2.3");
  });
});
