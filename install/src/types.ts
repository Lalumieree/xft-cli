export type InstallTargetId = "codex" | "claude";

export interface InstallTarget {
  id: InstallTargetId;
  label: string;
  path: string;
}

export interface CliOptions {
  targets?: InstallTargetId[];
  yes: boolean;
  dryRun: boolean;
  packageVersion?: string;
}

export interface InstallContext {
  packageName: string;
  packageSpecifier: string;
  skillNames: string[];
  selectedTargets: InstallTarget[];
  dryRun: boolean;
}

export interface CommandResult {
  code: number;
  stdout?: string;
  stderr?: string;
}

export type CommandRunner = (command: string, args: string[]) => Promise<CommandResult>;
