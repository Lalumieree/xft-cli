import type { CliOptions, InstallTargetId } from "./types.js";

const targetMap: Record<string, InstallTargetId> = {
  codex: "codex",
  claude: "claude",
  "claude-code": "claude",
};

export function parseCliArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    yes: false,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (current === "--yes") {
      options.yes = true;
      continue;
    }

    if (current === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (current === "--target") {
      options.targets = parseTargets(argv[index + 1]);
      index += 1;
      continue;
    }

    if (current.startsWith("--target=")) {
      options.targets = parseTargets(current.slice("--target=".length));
      continue;
    }

    if (current === "--package-version") {
      const version = argv[index + 1]?.trim();
      if (!version) {
        throw new Error("`--package-version` 需要提供版本号。");
      }
      options.packageVersion = version;
      index += 1;
      continue;
    }

    if (current.startsWith("--package-version=")) {
      const version = current.slice("--package-version=".length).trim();
      if (!version) {
        throw new Error("`--package-version` 需要提供版本号。");
      }
      options.packageVersion = version;
      continue;
    }

    if (current === "--help" || current === "-h") {
      throw new Error("HELP");
    }

    throw new Error(`不支持的参数：${current}`);
  }

  return options;
}

export function parseTargets(raw?: string): InstallTargetId[] | undefined {
  if (!raw) {
    return undefined;
  }

  const targets = raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .map((item) => {
      const target = targetMap[item];
      if (!target) {
        throw new Error(`未知安装目标：${item}`);
      }
      return target;
    });

  return Array.from(new Set(targets));
}

export function getHelpText(): string {
  return [
    "Usage: xft-skill-install [options]",
    "",
    "Options:",
    "  --target <codex,claude>    直接指定安装目标",
    "  --yes                      跳过确认，默认安装到已选目标",
    "  --dry-run                  只展示动作，不执行安装",
    "  --package-version <ver>    指定 xft-openapi-caller 版本",
    "  -h, --help                 显示帮助",
  ].join("\n");
}
