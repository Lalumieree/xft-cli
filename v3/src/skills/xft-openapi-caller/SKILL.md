---
name: xft-openapi-caller
description: 将自然语言需求匹配到合适的 XFT OpenAPI 文档，抓取目标文档，准备并执行 API 调用，并安全地总结结果。适用于需要查询或调用 XFT HTTP API 的场景，例如组织查询、差旅申请创建、申请单详情查询等。
---
# XFT OpenAPI 调用技能

## 安装 npm 包

- 使用本技能前，先安装已发布的 CLI：`npm install -g xft-openapi-caller`
- 确保当前环境可用 `node` 和 `npm`
- 可通过 `xft-cli --help` 或 `xft-cli api call --help` 确认安装成功

## 使用随包资源

- 使用 `xft-cli doc find` 将用户意图匹配到候选 API 文档
- 使用 `xft-cli doc fetch` 将目标文档抓取到 `~/.xft_config/xft_docs`，并优先复用已有缓存
- 使用 `xft-cli api call` 在凭证与业务字段准备完毕后发起真实请求
- `xft-cli api call` 始终发送加密请求体，不要寻找或依赖明文请求体模式
- 当差旅类接口需要城市编码时，使用 `xft-cli city refresh` 刷新 `~/.xft_config/.cache` 下的城市树缓存
- 使用 `xft-cli city resolve` 将 `福州市鼓楼区`、`上海市` 这类地名解析为 XFT 城市编码
- 使用 `xft-cli auth` 创建或更新加密敏感凭证
- 使用 `xft-cli config set|get|list` 维护非敏感配置
- 遇到新建、提交、申请、审批等业务流程类需求时，必须先检查 `best_practice/` 下是否已有对应最佳实践

## 推荐工作流

1. 先把用户需求归一化成简短查询词。
2. 先检查 `best_practice/`。
   - 只要需求涉及 create、submit、apply、draft、approval 等业务流程，就必须先读最佳实践。
   - 如果存在相关最佳实践，先提炼其中的约束、必填项、顺序要求和风险提示，再去读接口文档。
   - 在完成这一步前，不要准备请求参数，也不要直接调用接口。
3. 运行文档匹配。
   - 示例：`xft-cli doc find --query "create travel request" --top 5 --json`
4. 抓取选中的文档。
   - 示例：`xft-cli doc fetch --docid 12509`
   - 命令会直接输出缓存 markdown 目录路径。
   - 需要强制刷新时加 `--force`。
   - 只有在确实需要时才加 `--html` 或 `--raw`；默认会生成 markdown。
5. 从文档中提取接口契约。
6. 如果是差旅场景，自动解析城市编码。
   - 示例：`xft-cli city resolve --from-name "福州市鼓楼区" --to-name "上海市" --json`
7. 在真实调用前检查执行安全性。
   - 对有副作用的接口，优先先执行 `xft-cli api call --dry-run`。
8. 处理凭证。
   - 用 `xft-cli auth` 创建加密敏感凭证。
   - 用 `xft-cli config set <key> <value>` 维护非敏感配置。
   - 用 `xft-cli config list` 查看已有非敏感配置项。
9. 调用 API。
   - 示例：`xft-cli api call --url https://api.example.com/demo --method POST --payload-file payload.json`
10. 用清晰、安全的方式向用户总结结果。

## 输出要求

- 先说明你选择了哪份文档、为什么选它。
- 对关键请求字段给出来源说明，不要无依据猜测。
- 如果接口有副作用，先说明是否已经 `--dry-run`，以及是否已经获得用户确认。
- 当结果存在歧义、候选过多或缺少关键信息时，明确指出缺口，不要擅自推进真实调用。
