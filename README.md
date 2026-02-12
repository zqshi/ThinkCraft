# ThinkCraft

创意验证与项目协作平台（前端 + 后端 + 可选 DeepResearch 微服务）。

## 文档入口

- 启动与停止（唯一权威）：`docs/STARTUP_RUNBOOK.md`
- 文档治理规范：`docs/DOC_GOVERNANCE.md`
- 脚本注册表：`docs/SCRIPT_REGISTRY.md`
- 架构 ADR：`docs/architecture/ADR-001-modular-refactor.md`
- 开发文档索引：`docs/README.md`

## 模块化重构架构说明

- 模块化重构已完成，主入口按 `frontend/js/modules/*` 分层加载。
- 架构说明与决策记录见 `docs/architecture/ADR-001-modular-refactor.md`。

## 快速开始

```bash
npm install
./start-all.sh
```

停止：

```bash
./stop-all.sh
```

说明：

- `./dev.sh` 仅兼容历史命令，内部转发到 `./start-all.sh`
- `./stop.sh` 仅兼容历史命令，内部转发到 `./stop-all.sh`

## 实际运行入口

- 前端应用：`http://127.0.0.1:5173/index.html?app=1`
- 产品介绍页：`http://127.0.0.1:5173/OS.html`
- 后端健康检查：`http://127.0.0.1:3000/health`
- 后端就绪检查：`http://127.0.0.1:3000/ready`
- DeepResearch（可选）：`http://127.0.0.1:5001/health`

## 后端 API（与当前挂载一致）

后端统一在 `backend/server.js` 挂载以下前缀：

- `/api/auth`
- `/api/verification`
- `/api/account`
- `/api/chat`
- `/api/report`
- `/api/business-plan`
- `/api/vision`
- `/api/pdf-export`
- `/api/share`
- `/api/agents`
- `/api/projects`
- `/api/workflow`
- `/api/prompts`

常用接口（当前代码存在）：

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/refresh-token`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/verification/send`
- `POST /api/verification/verify`
- `GET /api/account/info`
- `POST /api/account/bind-phone`
- `PUT /api/account/phone`
- `PUT /api/account/preferences`
- `DELETE /api/account`
- `POST /api/chat/create`
- `POST /api/chat/send-message`
- `POST /api/chat/:chatId/auto-title`
- `POST /api/projects`
- `GET /api/projects`
- `GET /api/projects/:id`
- `PUT /api/projects/:id`
- `DELETE /api/projects/:id`
- `GET /api/projects/workflow-config/:category`
- `POST /api/workflow/:projectId/execute-stage`
- `POST /api/workflow/:projectId/execute-batch`
- `GET /api/workflow/:projectId/execution-runs`
- `GET /api/workflow/:projectId/artifact-chunks`
- `GET /api/workflow/:projectId/artifact-chunks/:runId`
- `GET /api/workflow/:projectId/stages/:stageId/artifacts`
- `GET /api/workflow/:projectId/artifacts`
- `GET /api/workflow/:projectId/artifacts/tree`
- `GET /api/workflow/:projectId/artifacts/bundle`

## 工作流生成配置（可维护沉淀）

- 配置集中在：`backend/config/workflow-generation.js`
- 环境变量示例在：`backend/.env.example`

当前默认策略：

- `prototype` 多轮续写默认 `10` 轮（`WORKFLOW_PROTOTYPE_LOOP_MAX_ROUNDS=10`）
- `prototype/preview/ui-preview` 结束标记默认 `<!--END_HTML-->`
- 非 HTML 交付物默认 `4` 轮（`WORKFLOW_ARTIFACT_LOOP_MAX_ROUNDS=4`）
- 原型支持分轮拼接与重叠去重，完成后落库分块会话（`artifact-chunks`）以支持追踪和断点恢复

## 项目结构（当前有效）

```text
.
├── index.html
├── OS.html
├── login.html
├── start-all.sh
├── stop-all.sh
├── dev.sh
├── stop.sh
├── scripts/
├── docs/
├── frontend/
│   ├── js/
│   ├── css/
│   └── experimental-src/
├── backend/
│   ├── server.js
│   ├── routes/
│   ├── scripts/
│   └── src/
├── config/
├── prompts/
├── css/
├── logs/
└── run/
```

## 技术栈

- 前端：原生 JavaScript（主应用）+ React（实验区 `frontend/experimental-src`）
- 后端：Node.js + Express
- 存储：MongoDB（主）+ Redis（缓存，可降级）
- 测试：Jest
- 构建：Vite

## 开发命令

```bash
# 全栈启动（推荐）
./start-all.sh

# 前端开发服务器
npm run dev:frontend

# 代码检查
npm run lint

# 测试
npm test
```
