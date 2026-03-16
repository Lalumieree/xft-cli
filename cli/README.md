# xft-cli

`xft-cli` is a combined TypeScript SDK and CLI for CMB XFT LW36 open-api calls, login jump verification, file upload/download, and SM4 payload encryption or decryption.

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
- `usr-uid`
- `usr-nbr`
- `eds-company-id`

## Examples

List built-in feature definitions:

```bash
xft-cli list-features
```

Call a POST endpoint:

```bash
xft-cli post \
  --app-id "$APP_ID" \
  --authority-secret "$AUTHORITY_SECRET" \
  --url "$API_URL" \
  --body-json '{"limit":20}'
```

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
