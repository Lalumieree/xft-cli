---
name: lw36-openapi-tool
description: Use this skill when you need to call CMB XFT LW36 open-api endpoints, upload or download files, verify login jump data, or SM4-encrypt/decrypt payloads from the LW36 SDK flow.
---

# LW36 OpenAPI Tool

Use the bundled `xft-cli` package CLI backed by the TypeScript SDK instead of calling the Java SDK classes directly.

## When to use

- Calling `XftOpenApiReqClient` style `GET` or `POST` APIs
- Uploading or downloading files with the LW36 signing rules
- Verifying jump `data/sign` pairs through the LW36 token or sign flow
- Producing or decoding `secretMsg` values with the first 32 chars of `authoritySecret`

## Tool entrypoint

Run:

```bash
xft-cli --help
```

Assume `xft-cli` is already installed and available on `PATH`.

The main subcommands are:

- `list-features`
- `show-feature`
- `feature-call`
- `post`
- `get`
- `upload`
- `download-get`
- `download-post`
- `verify-token`
- `verify-sign`
- `sm4-encrypt`
- `sm4-decrypt`

## Required inputs

For API calls, always provide:

- `--app-id`
- `--authority-secret`
- `--url`

Or store `app-id` and `authority-secret` in `local-config.json` in your current working directory and omit them on the command line.

Provide these only when the target interface needs them:

- `--company-id`
- `--usr-uid`
- `--usr-nbr`
- `--eds-company-id`
- `--query-json`
- `--body-json` or `--body-file`

For feature-driven calls, also provide:

- `--feature`

## Operating rules

- Prefer `--body-file` for large JSON payloads.
- Prefer `--query-json` as a single JSON object string.
- Use `--encrypt-body` only when the target open platform app is configured for input encryption.
- Prefer `list-features` -> `show-feature` -> `feature-call` for business interfaces captured in the feature catalog.
- For file download commands, always pass an explicit `--output` path and tell the user where the file was written.
- For file upload, use `--use-original-name` when the接口要求保留原文件名.
- If a call fails, report the returned `status_code` and response body instead of paraphrasing.

## Reference

For Java method to CLI mapping, read [references/interface-map.md](references/interface-map.md).

For interface calling rules and signing flow, read [references/invocation-guide.md](references/invocation-guide.md).

For business feature definitions, read [references/feature-catalog.json](references/feature-catalog.json).
