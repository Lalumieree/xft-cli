import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildPackageSpecifier,
  discoverBundledSkills,
  executeInstall,
  resolveInstalledPackageSkillsRoot,
} from "./install.js";
import type { InstallContext } from "./types.js";

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "xft-skill-install-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("install helpers", () => {
  it("builds package specifier", () => {
    expect(buildPackageSpecifier("xft-openapi-caller")).toBe("xft-openapi-caller");
    expect(buildPackageSpecifier("xft-openapi-caller", "1.0.0")).toBe("xft-openapi-caller@1.0.0");
  });

  it("discovers bundled skills", () => {
    const root = makeTempDir();
    mkdirSync(resolve(root, "xft-openapi-caller"));
    expect(discoverBundledSkills(root)).toEqual(["xft-openapi-caller"]);
  });

  it("resolves installed package skill root", () => {
    expect(resolveInstalledPackageSkillsRoot("/tmp/global", "xft-openapi-caller")).toBe(
      resolve("/tmp/global", "xft-openapi-caller", "dist", "skill"),
    );
  });

  it("copies skills after npm install succeeds", async () => {
    const globalRoot = makeTempDir();
    const targetRoot = makeTempDir();
    const skillDir = resolve(globalRoot, "xft-openapi-caller", "dist", "skill", "xft-openapi-caller");
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(resolve(skillDir, "SKILL.md"), "# demo", "utf8");

    const context: InstallContext = {
      packageName: "xft-openapi-caller",
      packageSpecifier: "xft-openapi-caller",
      skillNames: ["xft-openapi-caller"],
      selectedTargets: [{ id: "codex", label: "Codex", path: targetRoot }],
      dryRun: false,
    };

    const runner = vi
      .fn()
      .mockResolvedValueOnce({ code: 0, stdout: "", stderr: "" })
      .mockResolvedValueOnce({ code: 0, stdout: globalRoot, stderr: "" });
    await executeInstall(context, runner);

    expect(runner).toHaveBeenCalledWith("npm", ["install", "-g", "xft-openapi-caller"]);
    expect(readFileSync(resolve(targetRoot, "xft-openapi-caller", "SKILL.md"), "utf8")).toBe("# demo");
  });

  it("does not install during dry-run", async () => {
    const root = makeTempDir();
    mkdirSync(resolve(root, "xft-openapi-caller"));

    const context: InstallContext = {
      packageName: "xft-openapi-caller",
      packageSpecifier: "xft-openapi-caller",
      skillNames: ["xft-openapi-caller"],
      selectedTargets: [{ id: "claude", label: "Claude Code", path: makeTempDir() }],
      dryRun: true,
    };

    const runner = vi.fn().mockResolvedValue({ code: 0 });
    await executeInstall(context, runner, root);
    expect(runner).not.toHaveBeenCalled();
  });

  it("fails when npm install fails", async () => {
    const root = makeTempDir();
    mkdirSync(resolve(root, "xft-openapi-caller"));

    const context: InstallContext = {
      packageName: "xft-openapi-caller",
      packageSpecifier: "xft-openapi-caller",
      skillNames: ["xft-openapi-caller"],
      selectedTargets: [{ id: "claude", label: "Claude Code", path: makeTempDir() }],
      dryRun: false,
    };

    await expect(
      executeInstall(
        context,
        vi.fn().mockResolvedValue({ code: 1, stderr: "boom" }),
        root,
      ),
    ).rejects.toThrow("boom");
  });
});
