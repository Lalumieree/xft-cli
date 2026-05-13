# empId查询最佳实践

## 适用场景

当需要调用审批通过、审批驳回、审批退回等接口时，接口通常要求传入审批操作人的 `empId`。
这里的 `empId` 指企业成员标识，**不是**员工号 `number`，也**不是**员工序号 `empNumber`。

## 核心结论

- 审批类接口中的 `empId`，应优先通过“按条件查询企业成员”接口获取。
- 查询结果中应取 `records[].memberId` 作为审批接口的 `empId`。
- `records[].number` 是员工号，可用于人工校验，但不能直接替代 `empId`。
- `records[].idRelation.staffId` 是员工序号，也不能直接替代 `empId`。
- 文档定位与真实调用统一使用 `xft-cli`，不要混用旧命令名。
- 真实调用统一通过 xft-gateway 接口名执行，不要传接口 URL、HTTP method、CSC 公共参数或薪福通密钥。

## 推荐流程

1. 先确认审批接口所需字段。

   - 如需先定位文档，可执行：`xft-cli doc find --query "审批 驳回 empId" --top 5 --json`
   - 例如“审批驳回”接口中：
     - `body.empId`：发起审批操作人的员工编号
   - 结合实际调用验证，应该传企业成员查询结果中的 `memberId`。
2. 使用“按条件查询企业成员”接口查询操作人。

   - 如需实际调用，统一通过 `xft-cli api call` 执行。
   - 接口名称：`按条件查询企业成员`
   - 网关接口名：`按条件查询企业成员`
   - 推荐优先按以下条件查询：
     - `name`
     - `status = ENABLE`
     - `joinStatus = ENABLE`
     - `type = INNER`
3. 从返回结果中提取 `memberId`。

   - 取值路径：`body.body.records[0].memberId`
   - 该值就是后续审批接口要传的 `empId`
4. 用 `number` 作为辅助校验。

   - 取值路径：`body.body.records[0].number`
   - 可用于和 `empNumber` 核对，避免选错同名人员
5. 命中多条记录时不要猜测。

   - 应继续补充查询条件，例如：
     - `mobile`
     - `keyWord`
     - 组织条件 `orgCondition`
   - 或让用户确认具体人员
6. 命中 0 条时不要继续调用审批接口。

   - 应先检查：
     - 姓名是否正确
     - 是否为内部员工
     - 是否已启用
     - 是否已加入企业
7. 在真正触发审批动作前，先确认载荷与操作人身份。

   - 对有副作用的审批接口，优先用 `xft-cli api call --interface-name <接口名> --dry-run` 检查请求组装结果。

## 推荐请求示例

```json
{
  "currentPage": 1,
  "pageSize": 10,
  "name": "xxx",
  "status": "ENABLE",
  "joinStatus": "ENABLE",
  "type": "INNER"
}
```

## 推荐返回关注字段

```json
{
  "returnCode": "SUC0000",
  "errorMsg": null,
  "body": {
    "currentPage": 1,
    "pageSize": 10,
    "totalSize": 1,
    "records": [
      {
        "memberId": "V004L",
        "name": "xxx",
        "mobile": "17759036153",
        "number": "0120260009",
        "type": "INNER",
        "status": "ENABLE",
        "joinStatus": "ENABLE"
      }
    ]
  }
}
```

## 字段映射规则

- 审批接口 `empId` ← 成员查询结果 `memberId`
- 员工号校验值 ← 成员查询结果 `number`
- 不要把 `staffId` 映射到审批接口 `empId`

## 已验证样例

- 查询姓名：xxx
- 成员查询命中：
  - `memberId = V004L`
  - `number = 0120260009`
- 后续审批驳回调用中：
  - `empId = V004L`
- 实际返回：
  - `success = true`

## 操作规则

- 需要审批操作人 `empId` 时，默认先查“按条件查询企业成员”。
- 单条命中时，优先使用 `memberId`。
- 同名多条时，不要直接取第一条。
- `number` 仅作校验，不直接当作 `empId`。
- `staffId`、`enterpriseUserId`、`number` 都不要替代 `memberId` 传入审批接口。
- 审批类接口真正执行前，优先先做一次 `xft-cli api call --interface-name <接口名> --dry-run`。
