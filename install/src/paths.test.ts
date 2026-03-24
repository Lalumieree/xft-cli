import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { formatTargetOption, getDefaultTargetPath, getInstallTargets } from "./paths.js";

describe("paths", () => {
  it("returns codex skills path under .agents", () => {
    expect(getDefaultTargetPath("codex", "/tmp/home")).toBe(resolve("/tmp/home", ".agents", "skills"));
  });

  it("returns claude skills path", () => {
    expect(getDefaultTargetPath("claude", "/tmp/home")).toBe(resolve("/tmp/home", ".claude", "skills"));
  });

  it("builds target labels with paths", () => {
    const targets = getInstallTargets("/tmp/home");
    expect(formatTargetOption(targets[0])).toContain(".agents");
    expect(formatTargetOption(targets[1])).toContain(".claude");
  });
});
