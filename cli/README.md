# xft-openapi-cli

`xft-openapi-cli` is a TypeScript SDK and CLI focused on one public execution path: `feature-call`.

Skills or local tooling provide a feature definition, and the CLI or SDK executes it using local credentials and request payloads.

Chinese documentation: [README.zh-CN.md](https://github.com/Lalumieree/xft-cli/blob/master/cli/README.zh-CN.md)

This package now lives under the repository's `cli/` directory.

## Install

Global install after publishing:

```bash
npm install -g xft-openapi-cli
```

Then verify the CLI is on your `PATH`:

```bash
xft-openapi-cli --help
```

## Local Development Install

From the `cli/` directory:

```bash
npm install
npm run build
npm link
```

That exposes the local build as the `xft-openapi-cli` command on your machine for debugging.

After linking, test it with:

```bash
xft-openapi-cli --help
```

To remove the global symlink later:

```bash
npm unlink -g xft-openapi-cli
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

For local middleware, prefer `--config /path/to/temp.json` if configuration must be prepared dynamically. `--config-json` is intentionally not supported, so sensitive values do not travel in command-line JSON payloads.

## CLI

Call a feature provided by skill or local tooling:

```bash
xft-openapi-cli feature-call \
  --config /tmp/xft-runtime-config.json \
  --feature ./org-list.feature.json \
  --body-json '{"currentPage":1,"pageSize":20}'
```

Both `--config` and `--feature` accept either:
- a path to a JSON file
- an inline JSON object string

`feature-call` accepts:
- `--query-json` for query parameters
- `--body-json` or `--body-file` for request body payloads
- `--file` for upload features
- `--output` for binary download features

For example, a POST feature can send both query and body at the same time:

```bash
xft-openapi-cli feature-call \
  --config /tmp/xft-runtime-config.json \
  --feature '{"method":"POST","url":"https://api.cmbchina.com/example","requestMode":"json","responseMode":"json","encryptBody":true,"decryptResponse":true}' \
  --query-json '{"tenant":"t1","includeDeleted":false}' \
  --body-json '{"currentPage":1,"pageSize":20}'
```

The minimal execution feature schema is:

```json
{
  "method": "POST",
  "url": "https://api.cmbchina.com/...",
  "requestMode": "json",
  "responseMode": "json",
  "encryptBody": true,
  "decryptResponse": true
}
```

Fields such as `id`, `name`, and `description` are optional metadata only.

`xft-openapi-cli` only exposes `feature-call` as a public CLI command. Other historical commands are no longer part of the public contract.

## SDK

Use the SDK with the same `feature-call` contract:

```ts
import { executeFeatureCall } from "xft-openapi-cli";

const result = await executeFeatureCall(
  {
    appId: process.env.APP_ID!,
    authoritySecret: process.env.AUTHORITY_SECRET!,
    companyId: process.env.COMPANY_ID,
  },
  {
    feature: {
      id: "org-list",
      method: "POST",
      url: "https://api.cmbchina.com/ORG/orgqry/xft-service-organization/org/v1/get/page",
      requestMode: "json",
      responseMode: "json",
      encryptBody: true,
      decryptResponse: true,
    },
    queryParams: {
      tenant: "t1",
    },
    bodyText: JSON.stringify({ currentPage: 1, pageSize: 20 }),
  },
);
```

SDK input mapping:

- `queryParams`: query string parameters
- `bodyText`: request body text for `json` requests
- `filePath`: local file path for `upload` requests
- `outputPath`: local output path for `binary` download responses

Upload example:

```ts
await executeFeatureCall(reqInf, {
  feature: {
    method: "POST",
    url: "https://api.cmbchina.com/example/upload",
    requestMode: "upload",
    responseMode: "json",
    encryptBody: false,
    decryptResponse: false,
  },
  queryParams: {
    folder: "contracts",
  },
  filePath: "/tmp/demo.pdf",
});
```

Binary download example:

```ts
await executeFeatureCall(reqInf, {
  feature: {
    method: "POST",
    url: "https://api.cmbchina.com/example/download",
    requestMode: "json",
    responseMode: "binary",
    encryptBody: true,
    decryptResponse: false,
  },
  bodyText: JSON.stringify({ fileId: "123" }),
  outputPath: "/tmp/result.pdf",
});
```
