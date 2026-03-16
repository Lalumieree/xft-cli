# Invocation Guide

## Sources

- Official portal entry: [招商银行薪福通开放平台](https://xft.cmbchina.com/open/#/doc/open-document?id=10692&mid=10684)
- Local CLI implementation used for exact request construction:
  [open-api-client.ts](/Users/nateshen/Documents/Codex/xft-cli/cli/src/open-api-client.ts)
  [verify-token-client.ts](/Users/nateshen/Documents/Codex/xft-cli/cli/src/verify-token-client.ts)
  [verify-sign-client.ts](/Users/nateshen/Documents/Codex/xft-cli/cli/src/verify-sign-client.ts)

## What could be confirmed

- 薪福通开放平台官方站点可访问，文档入口位于 `xft.cmbchina.com/open/`。
- 该文档页是前端单页应用路由，当前抓取环境拿不到 `id=10692` 这页的正文 HTML。
- 因此下面的调用规则是依据官方站点入口加本地 TypeScript CLI 实现整理出来的，属于基于当前工具实现的归纳。

## Request calling flow

1. Prepare the common identity fields:
   `CSCAPPUID` is always required.
   `CSCPRJCOD`, `CSCUSRNBR`, `CSCUSRUID`, `EDSPRJCOD` are optional and depend on the target API.

2. Build the signed URL query:
   Append the common fields plus `CSCREQTIM=<milliseconds>` and any business query params.

3. Build the signature string:
   For `GET`:
   `GET {pathWithQuery}\nx-alb-timestamp: {secondsTimestamp}`

   For `POST`:
   `POST {pathWithQuery}\nx-alb-digest: {rawRequestBody}\nx-alb-timestamp: {secondsTimestamp}`

4. Generate headers:
   - `appid`
   - `x-alb-timestamp`
   - `apisign`
   - `x-alb-verify=sm3withsm2`
   - `x-alb-digest` for POST only
   - `Content-Type=application/json; charset=utf-8` for JSON requests

5. Compute crypto values:
   - `x-alb-digest` is `SM3(requestBody)`
   - `apisign` is `SM3withSM2(authoritySecret, signStr)`

## Encrypted request and response flow

- When the app is configured for input/output encryption, business JSON is not sent directly.
- Use the first 32 chars of `authoritySecret` as the SM4 ECB key.
- Encrypt the original JSON string to hex, then send:

```json
{"secretMsg":"<sm4-hex-ciphertext>"}
```

- If the response body is also encrypted, decrypt the raw response body with the same SM4 key.

## Login jump flow

- Jump URLs provide `data` and `sign`.
- First verify `sign` with:
  `Base64(SHA-256(decodedData + "&" + authoritySecret))`
- `verify-token`:
  decode `data`, extract `TKNNBR`, call the access token endpoint, then optionally call the user info endpoint.
- `verify-sign`:
  decode `data`, check `REQTIM` is still valid, then call the configured login validation endpoint.

## Skill command examples

```bash
xft-cli post \
  --app-id "$APP_ID" \
  --authority-secret "$AUTHORITY_SECRET" \
  --url "$API_URL" \
  --query-json '{"OPAUID":"XFT11728"}' \
  --body-json '{"limit":20}'
```

```bash
xft-cli post \
  --app-id "$APP_ID" \
  --authority-secret "$AUTHORITY_SECRET" \
  --url "$API_URL" \
  --body-json '{"limit":20}' \
  --encrypt-body
```
