# xft-openapi-cli

`xft-openapi-cli` is a TypeScript SDK and CLI for executing XFT OpenAPI `feature-call` requests.

The CLI now exposes two public commands:

- `auth`: securely store `app-id` and `authority-secret`
- `feature-call`: execute a feature definition with the stored credentials

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

## Credential Storage

Use `auth` once before calling `feature-call`:

```bash
xft-openapi-cli auth
```

`auth` prompts for:

- `app-id`
- `secret`

You can also pass them directly:

```bash
xft-openapi-cli auth --app-id "<app-id>" --secret "<secret>"
```

Passing `--secret` is supported for automation, but it may expose the value through shell history or process inspection. Interactive input is recommended for manual use.

Stored credentials are written to:

- credential file: `<user-home>/.xft-openai-cli/credentials.enc.json`
- encryption key: your OS credential store via `keytar`

Running `auth` again overwrites the previous credential file and rotates the stored encryption key.

## CLI

Call a feature provided by skill or local tooling:

```bash
xft-openapi-cli feature-call \
  --feature ./org-list.feature.json \
  --body-json '{"currentPage":1,"pageSize":20}'
```

If credentials have not been configured yet, `feature-call` will stop and ask you to run:

```bash
xft-openapi-cli auth
```

`feature-call` no longer accepts `--config`, `--app-id`, or `--authority-secret`. Sensitive credentials are always loaded from the secure store.

`--feature` accepts either:

- a path to a JSON file
- an inline JSON object string

`feature-call` accepts:

- `--query-json` for query parameters
- `--body-json` or `--body-file` for request body payloads
- `--file` for upload features
- `--output` for binary download features
- `--company-id`, `--eds-company-id`, `--usr-uid`, `--usr-nbr`, `--whr-service` for non-sensitive request context

For example, a POST feature can send both query and body at the same time:

```bash
xft-openapi-cli feature-call \
  --feature '{"method":"POST","url":"https://api.cmbchina.com/example","requestMode":"json","responseMode":"json","encryptBody":true,"decryptResponse":true}' \
  --query-json '{"tenant":"t1","includeDeleted":false}' \
  --body-json '{"currentPage":1,"pageSize":20}' \
  --company-id "COMPANY001"
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
