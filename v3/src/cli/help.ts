const ansi = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
};

function useColor(): boolean {
  return Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
}

export function style(text: string, ...codes: string[]): string {
  if (!useColor() || !codes.length) {
    return text;
  }
  return `${codes.join("")}${text}${ansi.reset}`;
}

export function indent(text: string, spaces = 2): string {
  const prefix = " ".repeat(spaces);
  return text
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");
}

export function formatOption(flag: string, description: string): string {
  return `${style(flag.padEnd(34), ansi.cyan)} ${description}`;
}

export function formatExample(title: string, command: string): string {
  return `${style(title, ansi.yellow)}\n${indent(command, 2)}`;
}

export function printHelpPage(lines: string[]): void {
  console.log(lines.join("\n"));
}

export const helpAnsi = ansi;
