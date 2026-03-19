---
name: xft-openapi-tool
description: Use this skill when you need to call CMB XFT open-api endpoints through `xft-openapi-cli feature-call`, using the modular feature catalog under `references/feature-catalog`.
---

# XFT OpenAPI Tool

Use this skill to select the right interface JSON from the modular feature catalog and call `xft-openapi-cli feature-call` with credentials already stored through `xft-openapi-cli auth`.

## Interface Lookup

Always locate interfaces in this order:

1. Search `references/feature-catalog/index.json` first. Prefer:

```bash
python3 scripts/search_feature_catalog.py "组织列表"
```

2. If needed, read `references/feature-catalog/index.json` directly.
2. Match the user intent against `name`, `description`, `aliases`, `keywords`, `businessScenarios`, `operation`, and `resource`.
3. Open only the top 1 to 3 candidate interface JSON files for confirmation.
4. After confirming the best match, pass that file path through `--feature`.

If multiple candidates are still plausible, prefer:

- exact business object match over generic wording
- exact operation match such as `query`, `update`, `create`, `delete`
- narrower module/submodule matches over broader ones

## When to use

- Calling XFT open APIs through `feature-call`
- Uploading or downloading files with the XFT signing rules
- Verifying jump `data/sign` pairs through the token or sign flow
- Producing or decoding `secretMsg` values with the first 32 chars of `authoritySecret`

## Tool entrypoint

Run:

```bash
xft-openapi-cli --help
```

Assume `xft-openapi-cli` is already installed and available on `PATH`.

The public CLI commands are:

- `auth`
- `feature-call`

## Required inputs

Before the first API call on a machine, make sure credentials have been configured:

```bash
xft-openapi-cli auth
```

For API calls, always provide:

- `--feature <path-or-json>`

`feature-call` now loads `app-id` and `authority-secret` from the secure credential store created by `auth`.
Do not pass `--config`, `--app-id`, or `--authority-secret` to `feature-call`.
If credentials are missing, tell the user to run `xft-openapi-cli auth` first.

Example for Windows PowerShell 5.1:

```bash
xft-openapi-cli feature-call --feature 'C:\Users\shenxia\.agents\skills\xft-openapi-tool\references\feature-catalog\智能费控\申请单业务\bills-apply-travel-detail.json' --query-json '{\"billId\":2026031934380843}'
```

Pay special attention to quote escaping. In Windows PowerShell 5.1, passing inline JSON to a native command without escaping inner double quotes will often strip them before the CLI receives the argument.

For example, this form is likely to fail in Windows PowerShell 5.1 because the CLI may receive `{billId:2026031934380843}` instead of valid JSON:

```bash
xft-openapi-cli feature-call --feature 'C:\Users\shenxia\.agents\skills\xft-openapi-tool\references\feature-catalog\智能费控\申请单业务\bills-apply-travel-detail.json' --query-json '{"billId":2026031934380843}'
```

When generating commands for this environment, prefer escaped inner quotes such as `'{\"billId\":2026031934380843}'`, or use `--body-file` / temp files for more complex JSON payloads.

Provide these only when the target interface needs them:

- `--company-id`
- `--usr-uid`
- `--usr-nbr`
- `--eds-company-id`
- `--query-json`
- `--body-json` or `--body-file`

## Operating rules

- Never ask the caller to create or pass a plaintext config file for credentials.
- Treat `app-id` and `authority-secret` as sensitive values; for manual setup, prefer interactive `xft-openapi-cli auth` over passing `--secret` on the command line.
- Prefer `--body-file` for large JSON payloads.
- Prefer `--query-json` as a single JSON object string.
- Prefer locating the target interface through `references/feature-catalog/index.json` before opening interface JSON files.
- Prefer choosing the matching interface JSON under `references/feature-catalog/<模块>/<子模块>/` and passing it with `--feature`.
- For file download features, always pass an explicit `--output` path and tell the user where the file was written.
- For file upload features, use `--use-original-name` when the interface requires preserving the original filename.
- If a call fails, report the returned `status_code` and response body instead of paraphrasing.

## Reference

For CLI feature execution patterns, read [references/interface-map.md](references/interface-map.md).

For interface calling rules and signing flow, read [references/invocation-guide.md](references/invocation-guide.md).

For business feature definitions, read the JSON files under [references/feature-catalog](references/feature-catalog).
