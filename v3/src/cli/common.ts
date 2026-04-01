export function getArgValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1 || index === args.length - 1) {
    return undefined;
  }
  return args[index + 1];
}

export function getRepeatableArgValues(args: string[], name: string): string[] {
  const values: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === name && index < args.length - 1) {
      values.push(args[index + 1]);
      index += 1;
    }
  }
  return values;
}

export function hasFlag(args: string[], name: string): boolean {
  return args.includes(name);
}

export function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

const ansi = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  dim: "\x1b[2m",
};

function useColor(): boolean {
  return Boolean(process.stderr.isTTY) && !process.env.NO_COLOR;
}

function style(text: string, ...codes: string[]): string {
  if (!useColor() || !codes.length) {
    return text;
  }
  return `${codes.join("")}${text}${ansi.reset}`;
}

export async function runCli(main: () => Promise<void>, commandName: string): Promise<void> {
  try {
    await main();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${style("Error", ansi.bold, ansi.red)} ${message}\n`);
    process.stderr.write(`${style("Tip", ansi.bold, ansi.yellow)}   Run ${commandName} --help for usage.\n`);
    if (process.env.DEBUG && error instanceof Error && error.stack) {
      process.stderr.write(`\n${style(error.stack, ansi.dim)}\n`);
    }
    process.exitCode = 1;
  }
}
