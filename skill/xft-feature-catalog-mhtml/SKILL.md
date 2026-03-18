---
name: xft-feature-catalog-mhtml
description: Use this skill when you need to parse a saved XFT open-platform API MHTML document and update the corresponding module/interface JSON under `xft-openapi-tool/references/feature-catalog`.
---

# XFT Feature Catalog From MHTML

Use this skill to turn a saved XFT API documentation page into one interface JSON file in the modular feature catalog used by `xft-openapi-tool`.

## Workflow

1. Run the extractor first:

```bash
python3 /Users/nateshen/Documents/Codex/xft-cli/skill/xft-feature-catalog-mhtml/scripts/extract_feature_from_mhtml.py /absolute/path/to/doc.mhtml
```

2. Read `/Users/nateshen/Documents/Codex/xft-cli/skill/xft-openapi-tool/references/feature-catalog/index.json` first, then inspect the target module directory under `/Users/nateshen/Documents/Codex/xft-cli/skill/xft-openapi-tool/references/feature-catalog/`.
   The main Skill may also use `/Users/nateshen/Documents/Codex/xft-cli/skill/xft-openapi-tool/scripts/search_feature_catalog.py` to search this index, so keep the index fields meaningful.

3. Upsert the feature file:
   - Pick the business module directory first.
   - Keep `module`, `submodule`, `operation`, `resource`, `aliases`, `keywords`, and `businessScenarios` useful for future lookup.
   - If an existing interface file already matches by `url`, update that file in place.
   - Otherwise, if an existing interface file already matches by `name`, update that file and preserve its existing `id`.
   - Otherwise, create one new JSON file for that interface. Prefer a stable ASCII filename derived from the URL tail.
   - Update `index.json` in the same change so the main Skill can find the new interface.

4. Validate the updated interface JSON after editing:

```bash
node -e "JSON.parse(require('fs').readFileSync('/absolute/path/to/interface.json','utf8')); console.log('ok')"
```

## Update Rules

- Treat the extractor output as a candidate, not as ground truth. If the MHTML text and the existing catalog disagree, prefer the MHTML for documented fields.
- Keep `querySchema` as an empty object unless the page clearly documents query parameters.
- Convert request-body fields into `bodySchema.properties`.
- Preserve the catalog's existing schema style:
  - Use `type`, `required`, `description`
  - Add `items` for arrays
  - Add `enum` only when the page explicitly lists allowed values
- Preserve an existing feature `id` whenever possible. Do not rename unrelated interface files.
- Keep `index.json` synchronized with every interface JSON addition or update.
- Default `requestMode` to `json` and `responseMode` to `json` for standard business interfaces unless the document clearly indicates file upload or binary download.
- Default `encryptBody` and `decryptResponse` to the current XFT business-interface pattern of `true` unless the existing catalog entry or direct evidence says otherwise.
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
