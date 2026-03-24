# ThinkCraft 启动运行手册（唯一权威版）

本文档是本项目唯一有效的前后端启动说明。其他文档中的启动片段均以本文为准。

## 1. 目标

- 不修改端口：前端 `5173`，后端 `3000`
- 启动时自动清理冲突进程（`3000/5173`）
- 默认开发路径仅拉起前后端，避免额外依赖提高首启成本

## 2. 一次性准备

1. 安装 Node.js `20.19+` 或 `22.12+`，以及 npm `10+`
2. 安装项目依赖：

```bash
npm install
```

3. 准备后端环境文件（若不存在会在启动时自动从示例生成）：

```bash
cp backend/.env.example backend/.env
```

默认示例配置使用 `DB_TYPE=memory` 与 `REDIS_ENABLED=false`，新环境可直接启动；只有在需要持久化或缓存时，才改为启用 MongoDB / Redis。

4. 如需调整交互原型分轮生成策略，修改 `backend/.env` 中的工作流参数（默认 `WORKFLOW_PROTOTYPE_LOOP_MAX_ROUNDS=10`，结束标记 `WORKFLOW_PROTOTYPE_END_MARKER=<!--END_HTML-->`）。

## 3. 标准启动（唯一入口）

```bash
./start-all.sh
```

如需以常驻托管方式启动，并且本机已安装 `pm2`：

```bash
./start-all.sh --pm2
```

等价命令：

```bash
npm run start:all
npm run start:all:pm2
npm run dev
./dev.sh
```

### 启动脚本会做什么

1. 清理旧 PID 与冲突端口（`3000/5173`）
2. 当 `backend/.env` 中 `DB_TYPE=mongodb` 时，仅提示你自行确认 MongoDB/Redis 状态，不再代管 Docker 或 brew
3. 执行一次 CSS 资源同步
4. 启动后端、前端
5. 若使用 `--pm2`，则改由 PM2 托管前后端
6. 检查 Agent 协作接口可用性（`/api/agents/types`）

## 4. 标准停止（唯一入口）

```bash
./stop-all.sh
```

等价命令：

```bash
npm run stop:all
./stop.sh
```

## 5. 服务检查

- 前端：`http://127.0.0.1:5173`
- 后端健康检查：`http://127.0.0.1:3000/health`
- 后端就绪检查：`http://127.0.0.1:3000/ready`

## 6. 日志与 PID

- 日志目录：`logs/`
  - `logs/frontend.log`
  - `logs/backend.log`
  - `logs/css-sync.log`
- PID 目录：`run/`

## 7. 外部依赖说明

- MongoDB：默认示例配置为 `DB_TYPE=memory`；仅当显式设置 `DB_TYPE=mongodb` 时才需要本地 MongoDB
- Redis：可选依赖，初始化失败时后端继续运行
- AgentScope：当前为后端内置能力，无需独立进程
- DeepResearch：独立 Python 微服务；需手动部署，主流程默认不依赖

## 8. 常见问题

### 8.1 前端报 `ERR_CONNECTION_REFUSED`

优先检查：

1. `logs/backend.log` 是否存在启动失败栈
2. `curl http://127.0.0.1:3000/health` 是否返回 `OK`
3. 重新执行：

```bash
./stop-all.sh && ./start-all.sh
```

### 8.2 MongoDB 不可达

标准启动脚本不会代替你启动数据库。若你主动把 `DB_TYPE` 改成 `mongodb`，请先自行启动本地 MongoDB 并确认：

```bash
lsof -iTCP:27017 -sTCP:LISTEN
```

### 8.3 AgentScope 鉴权自检

可执行一键鉴权脚本（开发环境）：

```bash
npm run auth:agent-check
```

或指定手机号：

```bash
bash scripts/auth-agent-check.sh 13800138000
```

## 9. 端到端冒烟验证（workflow-config / collaboration-plan / execute-stage）

标准命令：

```bash
npm run test:smoke:workflow
```

可选真实阶段执行（会触发模型调用，可能消耗配额）：

```bash
RUN_HEAVY_EXECUTE=1 npm run test:smoke:workflow
```

可选参数：

- `BASE_URL`：默认 `http://127.0.0.1:3000`
- `PHONE`：默认 `13800138000`（开发环境验证码登录）
- `WORKFLOW_CATEGORY`：默认 `product-development`
