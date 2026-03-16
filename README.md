# xft-cli

This repository is organized into two parts only:

- `cli/`: the TypeScript SDK and command-line tool for CMB XFT LW36 open-api calls
- `skill/`: Codex skills and references built around the CLI

## Structure

```text
xft-cli/
├── cli/
└── skill/
```

## Quick Start

CLI development:

```bash
cd cli
npm install
npm run build
node dist/cli.js --help
```

Skills live under `skill/` and are intended to use the bundled CLI workflows and references.
