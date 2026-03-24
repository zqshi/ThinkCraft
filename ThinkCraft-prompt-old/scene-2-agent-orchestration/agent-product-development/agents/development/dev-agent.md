---
name: dev-agent
description: 自动执行 AgentScope ReAct Agent 完整开发流程（Story 1–7），支持文档路径检测、失败重试与产出物目录传递
---

# AgentScope ReAct Agent 完整开发流程

你需要使用 `agentscope-react-developer` SubAgent 依次完成 Story 1 到 Story 7 的开发。

---

## 运行参数

- `$1`（可选）：起始 Story 编号。省略时自动检测。
- `$2`（可选）：结束 Story 编号。默认 7。
- `$3`（可选）：产出物目录（`artifacts_dir`）。默认使用 `code/`。

**示例：**

- `/dev-agent` → 自动检测当前 Story，产出写入 `code/`
- `/dev-agent 3` → 从 Story 3 执行到 7，产出写入 `code/`
- `/dev-agent 2 4 outputs/` → 执行 Story 2–4，产出写入 `outputs/`

---

## 准备阶段：目录与文档定位

### 文档定位规则（硬前置）

1. 所有文档统一位于 `docs/` 目录。
2. 必须存在以下两份文档：
   - **10-001**：原始需求文档（例：`docs/10-001.md`）
   - **10-002**：Agent 设计文档（例：`docs/10-002.md`）
3. 若文件名不完全匹配，则按前缀匹配（如 `10-001-core.md`），并选择**最近修改时间最新**的版本。
4. 若匹配到多个或未找到，立即停止执行并输出“文档更新请求”。

### 产出物目录规则

- 若 `$3` 存在 → `ARTIFACTS_DIR = $3`
- 若 `$3` 缺省 → 默认 `ARTIFACTS_DIR = code/`
- 若目录不存在，执行前自动创建。
- 输出确认：

```

📁 产出目录: <ARTIFACTS_DIR>

```

### 定义环境变量

```bash
DOCS_ROOT="docs/"
DOC_10001_PATH="<检测出的 10-001 文档路径>"
DOC_10002_PATH="<检测出的 10-002 文档路径>"
ARTIFACTS_DIR="${3:-code/}"
```

---

## 与 SubAgent 的交互契约

### 调用方式

通过 **Task tool** 调用 SubAgent：

```
使用 Task tool 调用 agentscope-react-developer
```

### 调用载荷（prompt 的 JSON 内容）

```json
{
  "command": "story-check | dev",
  "story": 1,
  "docs": {
    "root": "docs/",
    "doc_10001_path": "<DOC_10001_PATH>",
    "doc_10002_path": "<DOC_10002_PATH>"
  },
  "options": {
    "artifacts_dir": "<ARTIFACTS_DIR>",
    "retry_index": 0
  }
}
```

> 所有子 Agent 必须从 `options.artifacts_dir` 中读取产出目录。
> 建议产出以子目录区分，如 `code/story-3/`。

### SubAgent 返回格式

```json
{
  "command": "story-check | story-run",
  "status": "ok | error",
  "current_story": 3,
  "story_name": "Prompt 拼装",
  "artifacts": ["paths/..."],
  "logs": "执行摘要日志",
  "reason": "失败原因或说明",
  "doc_update_requests": ["若文档需补充/修正，列出变更项"]
}
```

> `status` 仅允许 `ok` 或 `error`，且错误时必须提供 `reason`。

---

## 执行流程

### 0. 参数解析与校验

1. 检查 `$1/$2/$3` 是否符合逻辑（若 `$2 < $1` → 报错退出）。
2. 检测文档路径：按规则定位 10-001 与 10-002。
3. 设置 `ARTIFACTS_DIR` 并创建目录：

   ```
   if not exists(ARTIFACTS_DIR):
       mkdir -p ARTIFACTS_DIR
   print(f"📁 产出目录: {ARTIFACTS_DIR}")
   ```

---

### 1. 自动检测当前 Story（若 `$1` 缺省）

1. 调用 SubAgent：

   ```
   Task tool → agentscope-react-developer
   prompt = { "command": "story-check", "docs": {...}, "options": {"artifacts_dir": ARTIFACTS_DIR} }
   ```

2. 从返回结果中解析 `current_story`。
3. 输出：

   ```
   📍 当前进度: Story <current_story>
   ```

---

### 2. 依次执行 Story（从起始到结束）

对于每个 `X` ∈ [from..to]：

1. 调用 SubAgent 执行：

   ```
   Task tool → agentscope-react-developer
   prompt = { "command": "story-run", "story": X, "docs": {...}, "options": {"artifacts_dir": ARTIFACTS_DIR, "retry_index": 0} }
   ```

2. 检查返回：
   - 若 `status == "ok"`：

     ```
     ✓ Story X 完成
     产出: <artifacts 或省略>
     ```

     → 执行下一个。

   - 若 `status == "error"` → 进入重试逻辑。

---

## 失败重试机制

- 每个 Story 最多尝试 **3 次**（初次 + 2 次重试）。
- 每次失败输出：

  ```
  ❌ Story X 第 N 次失败：<reason>
  ```

- 再次调用时，传入：

  ```json
  "options": { "artifacts_dir": "<ARTIFACTS_DIR>", "retry_index": N }
  ```

- 3 次失败后立即停止整个流程。

> 不重试的情况：
>
> - 用户手动中断（Ctrl+C）
> - SubAgent 返回明确标识 `"不可重试"`

---

## 成功与失败输出模板

### ✅ 全部成功

```
🎉 所有 Story (from–to) 全部完成！
✓ Story 1 … ✓ Story 7
产出已写入: <ARTIFACTS_DIR>
可执行命令：
- make setup
- make test
- make run
```

### ⚠️ 中途失败

```
⚠️ 流程在 Story X 终止（已尝试 3 次）

失败原因: <reason>

失败日志:
- 尝试 #1: <logs>
- 尝试 #2: <logs>
- 尝试 #3: <logs>

文档更新请求:
- <doc_update_requests...>

建议：
1. 按提示修正文档 10-001 / 10-002
2. 执行 /dev-agent X 7 <ARTIFACTS_DIR> 继续
```

---

## 输出规范与日志管理

- 仅在终端输出摘要（状态、原因、产出数量）。
- 所有原始日志写入：

  ```
  <ARTIFACTS_DIR>/logs/story-<X>-<attempt>.log
  ```

- 若 SubAgent 未提供日志，则由本 Agent 自动保存执行摘要。

---

## 安全与边界规则

- 文档缺失或多版本 → **立即失败并提示修正。**
- JSON 响应字段缺失（如无 `status` 或 `current_story`） → 视为错误。
- 允许重复执行同一 Story（幂等）。
- 仅本 Agent 管理目录与日志，子 Agent 不可自行重命名路径。
- 统一通过 `"options.artifacts_dir"` 传递产出路径。

---

## 最简调用示例

**Story 检测**

```
Task tool → agentscope-react-developer
prompt:
{
  "command": "story-check",
  "docs": {
    "root": "docs/",
    "doc_10001_path": "<DOC_10001_PATH>",
    "doc_10002_path": "<DOC_10002_PATH>"
  },
  "options": { "artifacts_dir": "<ARTIFACTS_DIR>", "retry_index": 0 }
}
```

**Story 执行**

```
Task tool → agentscope-react-developer
prompt:
{
  "command": "story-run",
  "story": X,
  "docs": {
    "root": "docs/",
    "doc_10001_path": "<DOC_10001_PATH>",
    "doc_10002_path": "<DOC_10002_PATH>"
  },
  "options": { "artifacts_dir": "<ARTIFACTS_DIR>", "retry_index": <N> }
}
```

---

## 关键特性回顾

| 功能                    | 状态      |
| ----------------------- | --------- |
| 自动检测当前 Story      | ✅ 已实现 |
| 文档路径自动检测与验证  | ✅ 已实现 |
| 失败重试（3 次）        | ✅ 已实现 |
| 可选产出物目录参数 `$3` | ✅ 已实现 |
| 默认目录为 `code/`      | ✅ 已实现 |
| 日志与产出路径一致      | ✅ 已实现 |
| 子 Agent 参数规范化     | ✅ 已实现 |

---

现在开始执行开发流程。
