---
name: xft-feature-catalog-mhtml
description: Parse a saved XFT open-platform API MHTML document and update /Users/nateshen/Documents/xft-tool/skills/lw36-openapi-tool/references/feature-catalog.json with the corresponding feature entry. Use when the user provides a .mhtml doc page from xft.cmbchina.com and asks to add, fix, or sync an interface definition in the LW36 feature catalog.
---

# XFT Feature Catalog From MHTML

Use this skill to turn a saved XFT API documentation page into a `feature-catalog.json` entry.

## Workflow

1. Run the extractor first:

```bash
python3 /Users/nateshen/Documents/xft-tool/skills/xft-feature-catalog-mhtml/scripts/extract_feature_from_mhtml.py /absolute/path/to/doc.mhtml
```

2. Read the extractor output, then inspect the existing catalog entry in `/Users/nateshen/Documents/xft-tool/skills/lw36-openapi-tool/references/feature-catalog.json`.

3. Upsert the feature entry:
   - If an entry already matches by `url`, update that entry in place.
   - Otherwise, if an entry already matches by `name`, update that entry and preserve its existing `id`.
   - Otherwise, append a new feature entry and choose a short ASCII `id`. Prefer a stable URL-based id and avoid Chinese characters.

4. Validate the catalog JSON after editing:

```bash
node -e "JSON.parse(require('fs').readFileSync('/Users/nateshen/Documents/xft-tool/skills/lw36-openapi-tool/references/feature-catalog.json','utf8')); console.log('ok')"
```

## Update Rules

- Treat the extractor output as a candidate, not as ground truth. If the MHTML text and the existing catalog disagree, prefer the MHTML for documented fields.
- Keep `querySchema` as an empty object unless the page clearly documents query parameters.
- Convert request-body fields into `bodySchema.properties`.
- Preserve the catalog's existing schema style:
  - Use `type`, `required`, `description`
  - Add `items` for arrays
  - Add `enum` only when the page explicitly lists allowed values
- Preserve an existing feature `id` whenever possible. Do not rename unrelated features.
- Default `encryptBody` and `decryptResponse` to the current LW36 business-interface pattern of `true` unless the existing catalog entry or direct evidence says otherwise.
- Keep `responseNotes` short and operational:
  - success return code
  - key response collection or object shape
  - notable error codes

## Extractor Output

The extractor returns a JSON object with:

- `document`: parsed doc fields, parameters, examples, and error codes
- `suggestedFeature`: a candidate catalog entry

Use the parsed `document` block when you need to verify whether the candidate lost detail or guessed too much.

## Limits

- The extractor is built for the XFT documentation page structure currently saved by Chromium as `mhtml`.
- It works best on pages that include:
  - `接口调用地址`
  - `调用方式`
  - `接口输入参数`
  - `接口输出参数`
  - `接口调用示例`
  - `错误码说明`
- If the page structure differs or fields are missing, fall back to manual extraction and still update the catalog.
