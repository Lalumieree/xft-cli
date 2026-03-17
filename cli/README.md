# xft-cli

`xft-cli` is a combined TypeScript SDK and CLI for CMB XFT LW36 open-api calls, login jump verification, file upload/download, and SM4 payload encryption or decryption.

The preferred CLI entrypoint is `feature-call`: skills or local tooling provide a feature definition, and the CLI executes it using local credentials and request payloads.

This package now lives under the repository's `cli/` directory.

## Install

Global install after publishing:

```bash
npm install -g xft-cli
```

Then verify the CLI is on your `PATH`:

```bash
xft-cli --help
```

## Local Development Install

From the `cli/` directory:

```bash
npm install
npm run build
npm link
```

That exposes the local build as the `xft-cli` command on your machine for debugging.

After linking, test it with:

```bash
xft-cli --help
```

To remove the global symlink later:

```bash
npm unlink -g xft-cli
```

## Local Package Usage Without Linking

If you only want to run the local build directly:

```bash
npm install
npm run build
node dist/cli.js --help
```

## Configuration

For CLI usage, you can pass credentials on the command line or place `local-config.json` in your current working directory.

Typical fields:

- `app-id`
- `authority-secret`
- `company-id`

Keep `company-id` in `local-config.json` when it is a stable default for your environment. Transient identity fields such as `usr-uid`, `usr-nbr`, and `eds-company-id` should be passed only when a specific call needs them.

## Examples

Call a feature provided by skill or local tooling:

```bash
xft-cli feature-call \
  --feature-file ./org-list.feature.json \
  --body-json '{"currentPage":1,"pageSize":20}'
```

You can also pass the feature definition inline with `--feature-json`.

Legacy compatibility commands such as `get`, `post`, `upload`, `download-get`, and `download-post` are still available, but new integrations should prefer `feature-call`.

Use the SDK in TypeScript:

```ts
import { XftOpenApiReqClient } from "xft-cli";

const result = await XftOpenApiReqClient.doCommonGetReq(
  {
    appId: process.env.APP_ID!,
    authoritySecret: process.env.AUTHORITY_SECRET!,
  },
  "https://example.com/api",
);
```
