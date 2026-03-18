# Interface Map

## CLI Feature Patterns

- Catalog search -> `python3 .../scripts/search_feature_catalog.py "<query>"`
- Feature execution -> `feature-call --feature <path-or-json>`
- Interface lookup -> inspect `references/feature-catalog/index.json` first, then open the best candidate JSON file
- Standard JSON request -> `feature-call` with `requestMode: "json"`
- Query-only or no-body request -> `feature-call` with a GET feature or `requestMode: "none"`
- File upload -> `feature-call` with `requestMode: "upload"`
- Original filename upload -> `feature-call --use-original-name`
- Binary download -> `feature-call` with `responseMode: "binary"`
- Encrypted request/response -> handled inside the feature definition via `encryptBody` and `decryptResponse`

## Example

```bash
python3 scripts/search_feature_catalog.py "修改组织名称"
```

```bash
xft-openapi-cli feature-call \
  --config /tmp/xft-runtime-config.json \
  --feature references/feature-catalog/组织管理/组织机构/org-list.json \
  --body-json '{"currentPage":1,"pageSize":20}'
```

## Notes

- `authoritySecret` is used in two ways:
  `sm3withsm2` signing uses the full hex private key.
  `secretMsg` encryption uses the first 32 chars as the SM4 key.
- The tool emits JSON to stdout so a Skill can inspect or summarize the result.
- This wrapper is implemented by the repository's `cli/` package.
