# xft-openapi-caller

`xft-openapi-caller` 是一个 Node.js CLI 包，用于匹配 XFT OpenAPI 文档、抓取缓存文档、解析城市编码，并通过 `xft-gateway` 调用 XFT 业务接口。

## Install

```bash
npm install -g xft-openapi-caller
```

## Commands

```bash
xft-cli --help
xft-cli auth
xft-cli config list
xft-cli doc find --help
xft-cli doc fetch --help
xft-cli api interfaces
xft-cli api call --help
xft-cli city refresh --help
xft-cli city resolve --help
```

## Gateway Auth

业务 API 调用必须经过 `xft-gateway`，CLI 不再保存或使用薪福通 `app-id`、`authority-secret`、CSC 公共参数，也不生成签名或加密请求体。

交互式登录：

```bash
xft-cli auth
```

该命令会输入：

- `gatewayUrl`：写入 `~/.xft_config/config.json`
- 邮箱和密码：只用于调用网关 `/auth`，不会落盘
- `Xft-gateway-token`：加密写入 `~/.xft_config/credentials.json.enc`

也可以通过环境变量提供：

```bash
XFT_GATEWAY_BASE_URL=http://localhost:3000
XFT_GATEWAY_TOKEN=<appwrite-session-secret>
```

## Gateway Calls

先查看当前 token 有权限调用的接口：

```bash
xft-cli api interfaces
```

再按网关接口名调用：

```bash
xft-cli api call --interface-name 表单配置列表查询 --body start=0 --body limit=20 --dry-run
xft-cli api call --interface-name 新建差旅申请单 --payload-file payload.json --timeout 60
```

不要传 `--url`、`--method`、`--appid`、`--authority-secret`、`--cscappuid` 等旧直连参数；接口路径、方法、公共参数、签名和加密都由 `xft-gateway` 负责。

## City Cache

城市缓存解析仍优先复用本地缓存。需要刷新缓存时会通过网关调用城市接口，默认接口名为 `查询所有城市信息`。

```bash
xft-cli city refresh --force
xft-cli city resolve --from-name "福州市鼓楼区" --to-name "上海市" --json
```

可覆盖城市接口名：

```bash
xft-cli config set gatewayCityInterfaceName 查询所有城市信息
XFT_GATEWAY_CITY_INTERFACE_NAME=查询所有城市信息
```

## Notes

- `keytar` 是必需运行时依赖，会通过 npm 安装。
- 非敏感配置存储在 `~/.xft_config/config.json`。
- 网关 token 加密存储在 `~/.xft_config/credentials.json.enc`。
- 城市缓存文件存储在 `~/.xft_config/.cache`。
- 文档检索与文档抓取仍使用薪福通开放平台文档站；业务 OpenAPI 调用不再直连薪福通。
