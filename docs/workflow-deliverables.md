# 项目面板阶段交付物映射与维护说明

本文档用于维护“项目面板阶段 → 交付物”的配置来源与修改规则，确保前端展示与后端模型生成一致，且全链路真实调用大模型，不使用兜底策略或本地缓存策略。

**当前生效流程**
- 流程配置源：`prompts/scene-2-agent-orchestration/product-development/workflow.json`
- 交付物模板源：`backend/config/workflow-stages.js` → `ARTIFACT_TYPES[*].promptTemplates`（指向 `prompts/agents/...`）
- 前端显示数据源：`GET /api/projects/workflow-config/:category`
- 后端生成数据源：`POST /api/workflow/:projectId/execute-stage`

## 阶段 → 交付物映射（product-development）

以下为 `workflow.json` 中的 `phases[].outputs`，用于项目面板展示与执行选择。

1. `strategy`
- `strategy-doc`

2. `requirement`
- `research-analysis-doc`
- `prd`
- `user-story`
- `feature-list`
- `core-prompt-design`

3. `design`
- `ui-design`
- `prototype`
- `design-spec`

4. `architecture`
- `architecture-doc`
- `api-spec`
- `tech-stack`

5. `development`
- `frontend-code`
- `backend-code`
- `api-doc`
- `component-lib`
- `frontend-doc`
- `backend-doc`

6. `testing`
- `test-report`
- `bug-list`
- `performance-report`

7. `deployment`
- `deploy-doc`
- `env-config`
- `release-notes`

8. `operation`
- `marketing-plan`
- `growth-strategy`
- `analytics-report`

## 维护规则（必须遵守）

1. 阶段交付物配置
- 修改 `prompts/scene-2-agent-orchestration/product-development/workflow.json` 的 `phases[].outputs`
- 前端会通过 `/api/projects/workflow-config/:category` 读取并展示
- 不允许后端使用默认流程兜底

2. 交付物模板配置
- 修改 `backend/config/workflow-stages.js` 的 `ARTIFACT_TYPES`
- 每个交付物必须配置 `promptTemplates`，且路径指向 `prompts/agents/...`
- 模板缺失或为空会导致执行失败（不会兜底）

3. 大模型调用规则
- 后端执行仅使用模板文件拼接后的提示词
- 不允许使用内置通用提示词或本地缓存结果
- 每次“开始执行”都会真实调用模型

4. 模板变量注入规则
- 模板内可使用 `{CONVERSATION}`、`{PRD}`、`{DESIGN}`、`{ARCHITECTURE}`、`{DEVELOPMENT}`、`{REQUIREMENT}`、`{STRATEGY}` 等变量
- 后端会按上下文替换同名变量（未提供的变量会替换为空字符串）
- 模板内容为空或文件不存在会直接失败（不兜底）

4. 不允许的行为
- 使用默认流程作为兜底配置
- 读取本地缓存结果替代模型调用
- 使用内置统一提示词替代模板文件

## 变更清单（按需同步）

当新增/调整交付物时，必须同时完成：
1. `workflow.json` 中加入/调整 `outputs`
2. `ARTIFACT_TYPES` 中新增/调整交付物定义与 `promptTemplates`
3. 确保对应模板文件存在于 `prompts/agents/...`

## 快速自检

1. 前端展示是否一致：打开项目面板 → 阶段交付物列表与本文件一致
2. 模板是否齐全：`ARTIFACT_TYPES[*].promptTemplates` 指向的文件存在
3. 执行是否真实：后端执行日志出现 `execute-stage call model`
4. 模板校验脚本：`npm run check:templates`

## 批量执行上下文规则（execute-batch）

- 批量执行会为每个阶段自动选取该阶段全部交付物类型并真实调用模型
- 每个阶段生成完成后会将首个交付物内容写入上下文，供后续模板变量使用
  - `requirement` → `PRD`
  - `design` → `DESIGN`
  - `architecture` → `ARCHITECTURE`
  - `development` → `DEVELOPMENT`
- `CONVERSATION` 始终可用（来自创意对话）
