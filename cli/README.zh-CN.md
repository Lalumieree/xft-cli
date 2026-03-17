# xft-cli

`xft-cli` 是一个围绕 `feature-call` 单一公开执行入口设计的 TypeScript SDK 和 CLI。

上层 Skill 或本地中间层负责提供 feature 定义，CLI/SDK 负责读取本地配置、组装请求并执行调用。

## 安装

发布后可全局安装：

```bash
npm install -g xft-cli
```

检查命令是否可用：

```bash
xft-cli --help
```

本地开发调试：

```bash
cd cli
npm install
npm run build
npm link
```

如果不想全局 link，也可以直接运行：

```bash
node dist/cli.js --help
```

## 配置

CLI 会优先从以下位置读取配置：

- `--config`
- 当前工作目录下的 `local-config.json`

典型字段：

- `app-id`
- `authority-secret`
- `company-id`

建议把稳定默认值放在 `local-config.json` 中，例如 `company-id`。像 `usr-uid`、`usr-nbr`、`eds-company-id` 这类临时上下文字段，只在具体调用需要时显式传入。

`--config` 现在同时支持两种形式：

- 传 JSON 文件路径
- 直接传 JSON 字符串

例如：

```bash
--config /tmp/xft-runtime-config.json
```

或：

```bash
--config '{"app-id":"...","authority-secret":"...","company-id":"..."}'
```

## CLI 用法

基础调用示例：

```bash
xft-cli feature-call \
  --config /tmp/xft-runtime-config.json \
  --feature ./org-list.feature.json \
  --body-json '{"currentPage":1,"pageSize":20}'
```

`--feature` 也支持两种形式：

- 传 feature JSON 文件路径
- 直接传 feature JSON 字符串

例如：

```bash
xft-cli feature-call \
  --feature '{"method":"POST","url":"https://api.cmbchina.com/...","requestMode":"json","responseMode":"json","encryptBody":true,"decryptResponse":true}'
```

`feature-call` 常用参数：

- `--query-json`：query 参数
- `--body-json`：JSON 字符串形式的 body
- `--body-file`：从文件读取 body
- `--file`：上传文件
- `--output`：二进制下载输出路径

POST 特性可以同时携带 query 和 body：

```bash
xft-cli feature-call \
  --config /tmp/xft-runtime-config.json \
  --feature '{"method":"POST","url":"https://api.cmbchina.com/example","requestMode":"json","responseMode":"json","encryptBody":true,"decryptResponse":true}' \
  --query-json '{"tenant":"t1","includeDeleted":false}' \
  --body-json '{"currentPage":1,"pageSize":20}'
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
import { executeFeatureCall } from "xft-cli";

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
