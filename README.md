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
node dist/cli.js auth
node dist/cli.js --help
```

The CLI stores app credentials in the user home directory and loads them for `feature-call`, so local workflows no longer need a plaintext config file in the working directory.

Skills live under `skill/` and are intended to use the bundled CLI workflows and references.
