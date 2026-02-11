# ThinkCraft 启动运行手册（唯一权威版）

本文档是本项目唯一有效的前后端启动说明。其他文档中的启动片段均以本文为准。

## 1. 目标

- 不修改端口：前端 `5173`，后端 `3000`，DeepResearch `5001`，MongoDB `27017`，Redis `6379`
- 启动时自动清理冲突进程（`3000/5173/5001`）
- 保证前后端稳定拉起，并尽可能自动处理外部依赖

## 2. 一次性准备

1. 安装 Node.js 18+ 与 npm
2. 安装项目依赖：

```bash
npm install
```

3. 准备后端环境文件（若不存在会在启动时自动从示例生成）：

```bash
cp backend/.env.example backend/.env
```

## 3. 标准启动（唯一入口）

```bash
./start-all.sh
```

等价命令：

```bash
npm run start:all
npm run dev
./dev.sh
```

### 启动脚本会做什么

1. 清理旧 PID 与冲突端口（`3000/5173/5001`）
2. 检查 MongoDB/Redis，若未就绪则尝试通过 Docker Compose 拉起
3. 启动 CSS 同步、后端、前端
4. 检查 Agent 协作接口可用性（`/api/agents/types`）
5. 检测 DeepResearch 条件满足时自动启动（需要 `backend/services/deep-research/.env` 且配置 `OPENROUTER_API_KEY`）

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
- DeepResearch（可选）：`http://127.0.0.1:5001/health`

## 6. 日志与 PID

- 日志目录：`logs/`
  - `logs/frontend.log`
  - `logs/backend.log`
  - `logs/css-sync.log`
  - `logs/deep-research.log`（若启用）
- PID 目录：`run/`

## 7. 外部依赖说明

- MongoDB：后端优先使用 `DB_TYPE=mongodb`；连接失败会重试，开发环境会自动降级到 `memory`，避免服务直接退出
- Redis：可选依赖，初始化失败时后端继续运行
- AgentScope：当前为后端内置能力，无需独立进程
- DeepResearch：独立 Python 微服务；未配置 Key 时不会自动拉起，主流程仍可使用（仅深度研究模式不可用）

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

启动脚本会尝试 Docker 拉起 `mongodb/redis`。若本机禁用 Docker，请自行启动本地 MongoDB 并确认：

```bash
lsof -iTCP:27017 -sTCP:LISTEN
```

### 8.3 DeepResearch 没有启动

检查：

1. `backend/services/deep-research/.env` 是否存在
2. 是否配置了 `OPENROUTER_API_KEY=sk-...`
3. 查看 `logs/deep-research.log`

### 8.4 AgentScope 鉴权自检

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
