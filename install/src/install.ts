import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import color from "picocolors";
import type { CommandRunner, InstallContext, InstallTarget } from "./types.js";

const installedSkillRelativeDir = join("dist", "skill");
export const defaultVerificationCommand = "xft-cli --help";

export function discoverBundledSkills(skillsRoot: string): string[] {
  if (!existsSync(skillsRoot)) {
    throw new Error(`技能资源目录不存在：${skillsRoot}`);
  }

  return readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

export function buildPackageSpecifier(packageName: string, packageVersion?: string): string {
  return packageVersion?.trim() ? `${packageName}@${packageVersion.trim()}` : packageName;
}

export function buildInstallSuccessMessage(context: InstallContext): string {
  return [
    color.green("安装完成"),
    `${color.cyan("CLI")}: ${context.packageSpecifier}`,
    `${color.cyan("Skills")}: ${context.skillNames.join(", ")}`,
    `${color.cyan("Targets")}: ${context.selectedTargets.map((target) => target.path).join(" | ")}`,
    `${color.cyan("验证")}: ${defaultVerificationCommand}`,
  ].join("\n");
}

export async function installCliPackage(packageSpecifier: string, runCommand: CommandRunner): Promise<void> {
  const result = await runCommand("npm", ["install", "-g", packageSpecifier]);
  if (result.code !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(output || `npm install -g ${packageSpecifier} 执行失败。`);
  }
}

export async function getGlobalNodeModulesRoot(runCommand: CommandRunner): Promise<string> {
  const result = await runCommand("npm", ["root", "-g"]);
  if (result.code !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(output || "无法定位 npm 全局安装目录。");
  }

  const root = result.stdout?.trim();
  if (!root) {
    throw new Error("npm 全局安装目录为空。");
  }

  return root;
}

export function resolveInstalledPackageSkillsRoot(globalNodeModulesRoot: string, packageName: string): string {
  return resolve(globalNodeModulesRoot, packageName, installedSkillRelativeDir);
}

export async function resolveInstalledSkillsRoot(packageName: string, runCommand: CommandRunner): Promise<string> {
  const globalNodeModulesRoot = await getGlobalNodeModulesRoot(runCommand);
  const skillsRoot = resolveInstalledPackageSkillsRoot(globalNodeModulesRoot, packageName);

  if (!existsSync(skillsRoot)) {
    throw new Error(`已安装包中未找到技能目录：${skillsRoot}`);
  }

  return skillsRoot;
}

export function ensureTargetDir(target: InstallTarget): void {
  mkdirSync(target.path, { recursive: true });
}

export function copySkillDirectory(skillName: string, skillsRoot: string, target: InstallTarget): void {
  const sourceDir = resolve(skillsRoot, skillName);
  const targetDir = resolve(target.path, skillName);

  if (!existsSync(sourceDir)) {
    throw new Error(`技能目录不存在：${sourceDir}`);
  }

  ensureTargetDir(target);
  rmSync(targetDir, { recursive: true, force: true });
  cpSync(sourceDir, targetDir, { recursive: true });
}

export function copySelectedSkills(skillNames: string[], selectedTargets: InstallTarget[], skillsRoot: string): void {
  for (const target of selectedTargets) {
    for (const skillName of skillNames) {
      copySkillDirectory(skillName, skillsRoot, target);
    }
  }
}

export async function executeInstall(
  context: InstallContext,
  runCommand: CommandRunner,
  skillsRoot?: string,
): Promise<void> {
  if (!context.selectedTargets.length) {
    throw new Error("请至少选择一个安装目标。");
  }

  if (context.dryRun) {
    return;
  }

  await installCliPackage(context.packageSpecifier, runCommand);
  copySelectedSkills(
    context.skillNames,
    context.selectedTargets,
    skillsRoot ?? (await resolveInstalledSkillsRoot(context.packageName, runCommand)),
  );
}
