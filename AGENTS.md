# Repository Guidelines

## 项目结构与模块组织

本仓库包含 2 个独立的 TypeScript 包，请在对应目录内执行命令。

- `v3/`：主 CLI 包，产出统一命令 `xft-cli`。核心代码在 `src/commands/`、`src/app/`、`src/shared/`，技能与最佳实践素材在 `src/skills/xft-openapi-caller/`。
- `install/`：安装器包，产出 `xft-skill-install`。入口与安装流程位于 `src/index.ts`、`src/install.ts`。
- 测试文件与源码同目录放置，命名为 `*.test.ts`，例如 `v3/src/commands/api/call.test.ts`。

## 构建、测试与开发命令

先 `cd` 到子项目目录，再执行：

- `npm install`：安装依赖。
- `npm run build`：通过 Vite 生成发布产物。
- `npm test`：运行 Vitest 单元测试。
- `npm run prepack`：发布前构建校验。

示例：

```bash
cd v3
npm run build
npm test
node dist/npm/xft-cli.js --help
```

## 代码风格与命名约定

项目使用 TypeScript + ESM，Node.js 版本要求 `>=22`。

- 使用 2 空格缩进、双引号、保留分号。
- 命令目录按 oclif 主题组织，如 `src/commands/city/resolve.ts`、`src/commands/api/call.ts`。
- 共享模块优先使用语义化 camelCase 文件名，如 `configStore.ts`、`cityCache.ts`。
- 面向团队协作的文字内容优先使用中文，包括提交信息、文档、代码注释、PR/MR 说明、变更记录与使用说明。
- 命令、配置键、环境变量、接口字段、代码标识符保留英文原名；必要时在中文语境中补充说明。

## 测试规范

测试框架为 Vitest。新增功能或修复缺陷时，优先补齐同目录测试，并覆盖命令解析、业务分支与回归场景。测试名直接描述行为，例如 `prints request body in json mode`。提交前至少运行受影响包的 `npm test` 和 `npm run build`。

## 提交与合并请求规范

最近历史同时存在 `chore: ...` 与中文短提交，建议统一为“类型前缀 + 中文简短说明”，如 `feat: 合并 city 子命令`、`fix: 修正安装器校验命令`。除非上游平台或自动化工具强制要求英文，否则提交信息优先使用中文。PR/MR 说明、评审回复与变更摘要同样优先使用中文。若修改 CLI 输出、安装流程或文档命令，请附示例命令或截图。

## 安全与配置提示

不要提交真实密钥、Token、缓存文件或本地配置。`v3` 的非敏感配置会写入用户目录，敏感凭证依赖系统钥匙串。若同时修改 `v3/` 与 `install/`，请同步检查 CLI 名称、安装提示和验证命令是否一致。
