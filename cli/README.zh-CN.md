# xft-openapi-cli

`xft-openapi-cli` 是一个用于执行 XFT OpenAPI `feature-call` 请求的 TypeScript SDK 和 CLI。

CLI 现在公开两个命令：

- `auth`：安全保存 `app-id` 和 `authority-secret`
- `feature-call`：使用已保存的凭据执行 feature 定义

英文文档：[`README.md`](https://github.com/Lalumieree/xft-cli/blob/master/cli/README.md)

当前 npm 包位于仓库的 `cli/` 目录下。

## 安装

发布后可全局安装：

```bash
npm install -g xft-openapi-cli
```

检查命令是否可用：

```bash
xft-openapi-cli --help
```

## 本地开发调试

在 `cli/` 目录下执行：

```bash
npm install
npm run build
npm link
```

验证命令：

```bash
xft-openapi-cli --help
```

如需移除全局软链：

```bash
npm unlink -g xft-openapi-cli
```

## 不 link 直接运行

如果只想直接运行本地构建产物：

```bash
npm install
npm run build
node dist/cli.js --help
```

## 凭据存储

首次调用 `feature-call` 前，先执行一次：

```bash
xft-openapi-cli auth
```

`auth` 会交互式提示输入：

- `app-id`
- `secret`

也支持直接传参：

```bash
xft-openapi-cli auth --app-id "<app-id>" --secret "<secret>"
```

`--secret` 适合自动化场景，但可能暴露在 shell history 或进程参数中；手工使用时更推荐交互式输入。

凭据存储方式为：

- 加密文件：`<用户目录>/.xft-openai-cli/credentials.enc.json`
- 数据密钥：操作系统凭据库（通过 `keytar`）

再次执行 `auth` 会直接覆盖旧的凭据文件，并轮换对应的数据密钥。

## CLI 用法

调用由 skill 或本地中间层提供的 feature：

```bash
xft-openapi-cli feature-call \
  --feature ./org-list.feature.json \
  --body-json '{"currentPage":1,"pageSize":20}'
```

如果尚未配置凭据，`feature-call` 会直接提示先执行：

```bash
xft-openapi-cli auth
```

`feature-call` 不再支持 `--config`、`--app-id`、`--authority-secret`；敏感凭据只会从安全存储中读取。

`--feature` 支持两种形式：

- 传 feature JSON 文件路径
- 直接传 feature JSON 字符串

`feature-call` 常用参数：

- `--query-json`：query 参数
- `--body-json` / `--body-file`：请求体
- `--file`：上传文件
- `--output`：二进制下载输出路径
- `--company-id`、`--eds-company-id`、`--usr-uid`、`--usr-nbr`、`--whr-service`：非敏感上下文参数

POST 特性可以同时携带 query 和 body：

```bash
xft-openapi-cli feature-call \
  --feature '{"method":"POST","url":"https://api.cmbchina.com/example","requestMode":"json","responseMode":"json","encryptBody":true,"decryptResponse":true}' \
  --query-json '{"tenant":"t1","includeDeleted":false}' \
  --body-json '{"currentPage":1,"pageSize":20}' \
  --company-id "COMPANY001"
```

## 最小 feature 执行字段

最小可执行的 feature schema 为：

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

其中：

- `method`：`GET` 或 `POST`
- `url`：目标接口地址
- `requestMode`：`json`、`upload`、`none`
- `responseMode`：`json`、`text`、`binary`
- `encryptBody`：是否对 body 做加密
- `decryptResponse`：是否对响应做解密

`id`、`name`、`description` 之类字段只是可选元数据，不参与执行。

## SDK 用法

SDK 和 CLI 共用同一套 `feature-call` 契约：

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

SDK 输入参数对应关系：

- `queryParams`：query 参数
- `bodyText`：`json` 请求模式下的 body 文本
- `filePath`：`upload` 请求模式下的本地文件路径
- `outputPath`：二进制下载响应的本地输出路径

上传示例：

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

二进制下载示例：

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
