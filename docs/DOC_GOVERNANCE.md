# Documentation Governance

本文档定义 ThinkCraft 文档治理规范，目标是让文档与代码长期一致、可验证、可清理。

## 1. 文档分层

- `L0` 权威运行文档：`docs/STARTUP_RUNBOOK.md`
- `L1` 项目总览：根目录 `README.md`
- `L2` 开发与模块文档：`docs/README.md`、`docs/guides/`、`docs/modules/`、`docs/api/`
- `L3` 规划/草稿：`docs/loading/`（不作为当前行为依据）
- `L4` 归档：历史文档与复盘（应明确 `archive` 标识）

## 2. 必填元信息（建议）

每个长期维护文档应在顶部包含：

- `Status`: `active` / `draft` / `archive`
- `Source of truth`: 对应代码路径或脚本
- `Last verified`: `YYYY-MM-DD`

## 3. 一致性规则

1. 启动方式仅允许一个权威入口（当前是 `docs/STARTUP_RUNBOOK.md`）。
2. README 中的 API 前缀必须与 `backend/server.js` 实际挂载一致。
3. 文档中的本地链接必须可解析到现有文件。
4. 文档示例命令必须在当前仓库可执行（至少语义有效）。
5. 文档不得使用机器绝对路径（如 `/Users/...`），统一用仓库相对路径。

## 4. 变更门禁（建议纳入 CI）

- Markdown 链接检查：禁止失效本地链接
- 路由漂移检查：README API 前缀与 `backend/server.js` 对齐
- 脚本注册表检查：新增脚本必须登记到 `docs/SCRIPT_REGISTRY.md`

## 5. 清理策略

- 任一文档连续两次迭代未被引用且无 owner，转 `archive`
- 发现与代码冲突的文档：
  1. 先修正权威文档
  2. 再修正引用它的次级文档
  3. 最后清理历史副本

## 6. Owner 约定

- 运行类文档：后端 owner
- API/模块文档：对应 feature owner
- 规划类文档：项目 owner（必须标注非权威）
