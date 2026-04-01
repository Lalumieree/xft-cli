import { homedir } from "node:os";
import { resolve } from "node:path";
import type { InstallTarget, InstallTargetId } from "./types.js";

export function getDefaultTargetPath(target: InstallTargetId, home = homedir()): string {
  if (target === "codex") {
    return resolve(home, ".agents", "skills");
  }

  return resolve(home, ".claude", "skills");
}

export function getInstallTargets(home = homedir()): InstallTarget[] {
  return [
    { id: "codex", label: "Codex", path: getDefaultTargetPath("codex", home) },
    { id: "claude", label: "Claude Code", path: getDefaultTargetPath("claude", home) },
  ];
}

export function formatTargetOption(target: InstallTarget): string {
  return `${target.label}  →  ${target.path}`;
}
