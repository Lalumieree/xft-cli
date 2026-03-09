# Interface Map

## Java to CLI

- Feature discovery/catalog -> `list-features`, `show-feature`, `feature-call`
- `XftOpenApiReqClient.doCommonPostReq` -> `post`
- `XftOpenApiReqClient.doCommonGetReq` -> `get`
- `XftOpenApiReqClient.doFileUploadByFileReq` -> `upload`
- `XftOpenApiReqClient.doFileUploadByFileWithOriginalName` -> `upload --use-original-name`
- `XftOpenApiReqClient.doGetFileDownloadReq` -> `download-get`
- `XftOpenApiReqClient.doPostFileDownloadReq` -> `download-post`
- `XftVerifyTokenClient.verifyToken` -> `verify-token --access-token-url ...`
- `XftVerifyTokenClient.getLoginInfo` -> `verify-token --access-token-url ... --login-user-url ...`
- `XftVerifySignClient.verifySign` -> `verify-sign`
- `Sm4Util.encryptEcb` -> `sm4-encrypt`
- `Sm4Util.decryptEcb` -> `sm4-decrypt`

## Example

```bash
node /Users/nateshen/Documents/xft-tool/skills/lw36-openapi-tool/scripts/lw36_openapi_tool.mjs list-features
```

```bash
node /Users/nateshen/Documents/xft-tool/skills/lw36-openapi-tool/scripts/lw36_openapi_tool.mjs show-feature --feature org-list
```

```bash
node /Users/nateshen/Documents/xft-tool/skills/lw36-openapi-tool/scripts/lw36_openapi_tool.mjs feature-call --feature org-list
```

```bash
node /Users/nateshen/Documents/xft-tool/skills/lw36-openapi-tool/scripts/lw36_openapi_tool.mjs post \
  --app-id "$APP_ID" \
  --authority-secret "$AUTHORITY_SECRET" \
  --company-id "XFT11728" \
  --url "https://api.cmburl.cn:8065/itrip/xft-api/uat1/v1/bills/queryDetails" \
  --query-json '{"OPAUID":"XFT11728","CSCSTFSEQ":"resd"}' \
  --body-json '{"applyTimStart":"2022-4-11","applyTimEnd":"2022-4-12 15:00:00","limit":20}'
```

## Notes

- `authoritySecret` is used in two ways:
  `sm3withsm2` signing uses the full hex private key.
  `secretMsg` encryption uses the first 32 chars as the SM4 key.
- The tool emits JSON to stdout so a Skill can inspect or summarize the result.
- This wrapper is implemented as a Node CLI backed by the TypeScript SDK in `/Users/nateshen/Documents/xft-tool/LW36.20_TS`.
