---
name: xft-openapi-tool
description: Use this skill when you need to call CMB XFT open-api endpoints through `xft-openapi-cli feature-call`, using the modular feature catalog under `references/feature-catalog`.
---

# XFT OpenAPI Tool

Use this skill to select the right interface JSON from the modular feature catalog and call the existing `xft-openapi-cli feature-call` command.

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

The public CLI command is:

- `feature-call`

## Required inputs

For API calls, always provide:

- `--feature <path-or-json>`
- `--app-id`
- `--authority-secret`

Configuration is provided by the caller. This Skill does not create, store, or maintain config files.
If the caller already has config JSON, pass it through `--config <path-or-json>`.

Provide these only when the target interface needs them:

- `--company-id`
- `--usr-uid`
- `--usr-nbr`
- `--eds-company-id`
- `--query-json`
- `--body-json` or `--body-file`

## Operating rules

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
