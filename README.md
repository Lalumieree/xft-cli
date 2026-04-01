# XFT CLI 工具集

`xft-cli` 是一组面向 XFT OpenAPI 场景的命令行工具与技能资源，提供文档检索、文档抓取、接口调用、城市编码解析、凭证配置等能力，并支持将配套 skill 安装到常见 AI 编码助手环境中。

## 项目简介

本仓库目前包含 2 个独立的 TypeScript 包：

- `v3/`：主 CLI 包，发布 npm 包 `xft-openapi-caller`，安装后提供命令 `xft-cli`。
- `install/`：skill 安装器包，发布 npm 包 `xft-skill-install`，安装后提供命令 `xft-skill-install`。

适用场景包括：

- 根据自然语言需求匹配 XFT OpenAPI 文档
- 抓取并缓存目标文档
- 调用 XFT HTTP API
- 刷新并解析城市编码
- 为 Codex、Claude Code 等环境安装配套 skill

## 环境要求

- Node.js `>= 22`
- npm `>= 10`（建议）

## 安装 CLI

主 CLI 通过 npm 全局安装：

```bash
npm install -g xft-openapi-caller
```

安装完成后，可执行以下命令验证：

```bash
xft-cli --help
```

## 安装 Skill

### 方式一：使用 `npx skills` 安装

`npx skills` 是当前较常见的 Agent Skill 安装命令，支持从本地目录、Git 仓库或技能仓库中安装 skill。

通过github仓库安装：

```bash
npx skills add Lalumieree/xft-cli
```

常见参数说明：

- `--agent <name>`：指定目标宿主，例如 `codex`、`claude-code`
- `--global`：安装到用户级目录
- `--yes`：跳过确认
- `--list`：仅列出可安装 skill，不执行安装

### 方式二：使用仓库提供的安装器

本仓库已提供配套安装器，适合把 skill 自动安装到 Codex 或 Claude Code 的默认技能目录：

```bash
npx xft-skill-install
```

如果希望跳过交互，并直接安装到 Codex：

```bash
npx xft-skill-install --target codex --yes
```

如果希望直接安装到 Claude Code：

```bash
npx xft-skill-install --target claude --yes
```

可选参数：

- `--target <codex,claude>`：指定安装目标
- `--yes`：跳过确认
- `--dry-run`：仅预览安装动作
- `--package-version <ver>`：指定 `xft-openapi-caller` 版本

建议优先使用 `npx skills`，因为它更符合通用 skill 生态；如果你更希望使用本仓库自带的安装流程，也可以使用 `xft-skill-install`。

## CLI 使用方法

### 查看帮助

```bash
xft-cli --help
```

### 文档检索

根据查询词匹配候选文档：

```bash
xft-cli doc find --query "create travel request" --top 5 --json
```

### 文档抓取

根据文档 ID 抓取并缓存文档：

```bash
xft-cli doc fetch --docid 12509
```

如需强制刷新缓存：

```bash
xft-cli doc fetch --docid 12509 --force
```

### API 调用

先准备请求数据，再执行调用：

```bash
xft-cli api call --url https://api.example.com/demo --method POST --payload-file payload.json
```

建议在有副作用的接口上优先使用 dry-run 或先完成文档核对，再发起真实请求。

### 城市缓存与编码解析

刷新城市缓存：

```bash
xft-cli city refresh
```

将地名解析为 XFT 城市编码：

```bash
xft-cli city resolve --from-name "福州市鼓楼区" --to-name "上海市" --json
```

### 敏感凭证管理

管理敏感凭证：

```bash
xft-cli auth --help
```

### 非敏感配置管理

查看配置：

```bash
xft-cli config list
```

设置配置：

```bash
xft-cli config set <key> <value>
```

读取配置：

```bash
xft-cli config get <key>
```

## 推荐工作流

典型使用流程如下：

1. 使用 `xft-cli doc find` 检索候选文档。
2. 使用 `xft-cli doc fetch` 抓取目标文档并确认接口契约。
3. 如涉及差旅或行政区划，使用 `xft-cli city refresh` 和 `xft-cli city resolve` 处理城市编码。
4. 使用 `xft-cli auth` 和 `xft-cli config set` 完成凭证与配置准备。
5. 使用 `xft-cli api call` 发起请求。

## 项目结构

```text
xft-cli/
├─ AGENTS.md
├─ README.md
├─ v3/
│  ├─ src/
│  │  ├─ app/                    # 业务编排与应用层逻辑
│  │  ├─ commands/               # oclif 命令实现
│  │  ├─ shared/                 # 共享模块、配置、缓存、客户端封装
│  │  ├─ cli/                    # 辅助 CLI 脚本入口
│  │  └─ skills/
│  │     └─ xft-openapi-caller/  # skill 定义、最佳实践与引用素材
│  ├─ package.json
│  └─ README.md
└─ install/
   ├─ src/
   │  ├─ index.ts                # 安装器主入口
   │  ├─ install.ts              # 安装与复制逻辑
   │  ├─ cli.ts                  # 参数解析与帮助信息
   │  └─ paths.ts                # 安装目标目录解析
   └─ package.json
```

## 本地开发

请先进入目标子项目目录，再执行命令。

安装依赖：

```bash
cd v3
npm install
```

构建主 CLI：

```bash
npm run build
```

运行测试：

```bash
npm test
```

发布前校验：

```bash
npm run prepack
```

安装器包同理：

```bash
cd install
npm install
npm run build
npm test
```

## 产物说明

- `xft-openapi-caller`：npm 包名
- `xft-cli`：主命令行入口
- `xft-skill-install`：skill 安装器命令

## 配置与数据目录

根据现有包说明，运行时会使用用户目录下的配置与缓存：

- 非敏感配置：`~/.xft_config/config.json`
- 文档缓存：`~/.xft_config/xft_docs`
- 城市缓存：`~/.xft_config/.cache`

敏感凭证依赖系统钥匙串能力与加密存储，请不要将真实密钥、Token 或本地配置提交到仓库。
