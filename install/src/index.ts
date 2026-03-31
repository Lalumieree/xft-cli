import { spawn } from "node:child_process";
import process from "node:process";
import * as p from "@clack/prompts";
import color from "picocolors";
import { getHelpText, parseCliArgs } from "./cli.js";
import {
  buildInstallSuccessMessage,
  buildPackageSpecifier,
  copySelectedSkills,
  discoverBundledSkills,
  installCliPackage,
  resolveInstalledSkillsRoot,
} from "./install.js";
import { formatTargetOption, getInstallTargets } from "./paths.js";
import type { CliOptions, CommandResult, CommandRunner, InstallContext, InstallTarget, InstallTargetId } from "./types.js";

const packageName = "xft-openapi-caller";

async function main(): Promise<void> {
  let options: CliOptions;
  try {
    options = parseCliArgs(process.argv.slice(2));
  } catch (error) {
    if (error instanceof Error && error.message === "HELP") {
      console.log(getHelpText());
      return;
    }

    handleFatal(error);
    return;
  }

  const runCommand = createCommandRunner();
  const allTargets = getInstallTargets();

  if (!options.yes) {
    renderIntro(allTargets);
  }

  const selectedTargets = await resolveTargets(options, allTargets);

  if (!selectedTargets.length) {
    handleFatal(new Error("请至少选择一个安装目标。"));
    return;
  }

  if (!options.yes) {
    await verifyRuntime(runCommand);
  }

  const context: InstallContext = {
    packageName,
    packageSpecifier: buildPackageSpecifier(packageName, options.packageVersion),
    skillNames: [],
    selectedTargets,
    dryRun: options.dryRun,
  };

  if (!options.yes) {
    const confirmed = await confirmExecution(context);
    if (!confirmed) {
      p.cancel("已取消安装。");
      process.exitCode = 1;
      return;
    }
  } else {
    await verifyRuntime(runCommand);
  }

  await runInstall(context, runCommand);
}

function renderIntro(targets: InstallTarget[]): void {
  p.intro(color.inverse(" xft-skill-install "));
  p.note(
    [
      `${color.cyan("Node")}: ${process.version}`,
      `${color.cyan("Platform")}: ${process.platform}`,
      "",
      targets.map((target) => `• ${formatTargetOption(target)}`).join("\n"),
    ].join("\n"),
    "安装目标",
  );
}

async function verifyRuntime(runCommand: CommandRunner): Promise<void> {
  const spinner = p.spinner();
  spinner.start("检查 Node 与 npm 环境");
  await ensureCommandAvailable("node", ["--version"], runCommand);
  await ensureCommandAvailable("npm", ["--version"], runCommand);
  spinner.stop("环境检查通过");
}

async function ensureCommandAvailable(command: string, args: string[], runCommand: CommandRunner): Promise<void> {
  const result = await runCommand(command, args);
  if (result.code !== 0) {
    throw new Error([result.stdout, result.stderr].filter(Boolean).join("\n").trim() || `${command} 不可用。`);
  }
}

async function resolveTargets(options: CliOptions, allTargets: InstallTarget[]): Promise<InstallTarget[]> {
  if (options.targets?.length) {
    return mapTargets(options.targets, allTargets);
  }

  if (options.yes) {
    return allTargets;
  }

  const selected = await p.multiselect({
    message: "选择要安装技能的目标目录",
    options: allTargets.map((target) => ({
      value: target.id,
      label: formatTargetOption(target),
      hint: target.id === "codex" ? "推荐给 Codex" : "推荐给 Claude Code",
    })),
    required: false,
  });

  if (p.isCancel(selected)) {
    p.cancel("已取消安装。");
    process.exit(1);
  }

  return mapTargets(selected as InstallTargetId[], allTargets);
}

function mapTargets(selectedIds: InstallTargetId[], allTargets: InstallTarget[]): InstallTarget[] {
  const selectedSet = new Set(selectedIds);
  return allTargets.filter((target) => selectedSet.has(target.id));
}

async function confirmExecution(context: InstallContext): Promise<boolean> {
  p.note(
    [
      `${color.cyan("CLI")}: npm install -g ${context.packageSpecifier}`,
      `${color.cyan("Skills")}: 安装后从已安装包自动发现`,
      `${color.cyan("Targets")}:`,
      ...context.selectedTargets.map((target) => `• ${formatTargetOption(target)}`),
      context.dryRun ? color.yellow("当前为 dry-run，只展示动作，不执行安装。") : "",
    ]
      .filter(Boolean)
      .join("\n"),
    "即将执行",
  );

  const value = await p.confirm({
    message: context.dryRun ? "确认执行 dry-run 预览？" : "确认开始安装？",
    initialValue: true,
  });

  return !p.isCancel(value) && Boolean(value);
}

async function runInstall(context: InstallContext, runCommand: CommandRunner): Promise<void> {
  const spinner = p.spinner();
  try {
    if (context.dryRun) {
      spinner.start("生成安装预览");
      await Promise.resolve();
      spinner.stop("dry-run 完成");
      p.outro(buildInstallSuccessMessage(context));
      return;
    }

    spinner.start(`安装 CLI：${context.packageSpecifier}`);
    await installCliPackage(context.packageSpecifier, runCommand);
    spinner.stop("CLI 安装完成");

    spinner.start("定位已安装包中的技能目录");
    const skillsRoot = await resolveInstalledSkillsRoot(context.packageName, runCommand);
    const installedSkillNames = discoverBundledSkills(skillsRoot);
    if (!installedSkillNames.length) {
      throw new Error(`已安装包中未发现可安装技能：${skillsRoot}`);
    }
    spinner.stop(`已定位技能目录：${skillsRoot}`);

    spinner.start("复制技能到目标目录");
    copySelectedSkills(installedSkillNames, context.selectedTargets, skillsRoot);
    spinner.stop("技能安装完成");

    p.outro(buildInstallSuccessMessage({ ...context, skillNames: installedSkillNames }));
  } catch (error) {
    spinner.stop("安装失败");
    handleFatal(error);
  }
}

function createCommandRunner(): CommandRunner {
  return (command, args) =>
    new Promise<CommandResult>((resolve) => {
      const child = spawn(command, args, {
        shell: process.platform === "win32",
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      child.on("error", (error) => {
        resolve({
          code: 1,
          stderr: error.message,
        });
      });

      child.on("close", (code) => {
        resolve({
          code: code ?? 0,
          stdout,
          stderr,
        });
      });
    });
}

function handleFatal(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  p.log.error(message);
  process.exitCode = 1;
}

void main();
