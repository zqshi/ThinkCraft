# ThinkCraft

ThinkCraft 是一款面向创新团队的 AI 项目化引擎，定位不是“再一个聊天工具”，而是“把创意变成交付”的执行系统。
它覆盖从想法澄清、策略成稿、原型生成到阶段推进的完整链路，帮助团队把不确定的灵感，转化为可验证、可追踪、可复用的项目资产。

## 首页摘要

ThinkCraft 让团队从“讨论很多、交付很慢”切换到“阶段清晰、持续产出、结果可复用”。

- **定位**：创意验证与项目推进系统，不止于内容生成
- **价值**：把创意从聊天记录升级为可执行、可追踪的项目资产
- **差异化**：文档与原型一体产出 + 长任务稳定生成与断点恢复 + 可运维治理能力

## 产品定位

ThinkCraft 聚焦“创意验证”这段最容易失控、也最影响成败的流程，解决三个关键断层：

- 从讨论到执行：聊天很多，决策很少，难进入真正交付
- 从内容到原型：文档与页面割裂，验证周期长、试错成本高
- 从一次产出到持续复用：长任务不稳定、结果难追踪、经验难沉淀

## 核心卖点（对外）

1. **不是生成一份内容，而是推进一个项目**
   ThinkCraft 以阶段化工作流驱动协作，围绕“状态、责任、产物”推进，而不是停留在一次性内容生成。

2. **不是单点提效，而是端到端缩短验证周期**
   从策略文档到可预览原型可连续产出，减少跨工具切换与信息折损，让“想法验证”从周级压缩到天级。

3. **不是演示级 AI，而是可持续交付的工程能力**
   针对长内容与复杂工件，支持分轮生成、重叠去重、结束标记与断点恢复，降低截断与返工风险。

4. **不是黑盒输出，而是可运维、可治理的生产系统**
   提供健康检查、就绪检查、配置化工作流、脚本注册与架构 ADR，兼顾业务速度与工程可控性。

## 为什么是 ThinkCraft

- **前置价值**：聚焦“创意到立项”前链路，补齐多数开发工具覆盖不足的验证阶段
- **流程价值**：把方法论固化为阶段流程，降低团队对个人经验的依赖
- **资产价值**：沉淀为可追踪的项目工件，而非一次性聊天记录
- **系统价值**：在可运行、可恢复、可维护的基础上放大 AI 产能，而不是牺牲稳定性换速度

## 典型场景

- 方案共创：将讨论快速沉淀为结构化文档与执行路径
- 产品孵化：文档与原型同步产出，缩短验证周期
- 团队协同：跨角色按阶段推进，过程透明、责任清晰
- 长任务交付：大体量内容稳定生成，支持恢复与追踪

## 关键能力

1. **对话即项目**
   一次高质量讨论，可直接进入项目化流程，减少从“聊完”到“开工”的空档。

2. **阶段化协同推进**
   以阶段为单位管理状态、责任与产物，团队协作节奏更可控。

3. **稳定生成与断点恢复**
   长文档与原型支持分块生成、重叠去重与续写恢复，降低中断风险。

4. **文档 + 原型一体交付**
   策略内容与可视化验证同步输出，减少多工具切换与信息损耗。

## 一句话总结

ThinkCraft 的核心竞争力，不是“会生成”，而是“能把生成结果稳定地推进为可交付项目”。

## 快速开始

```bash
npm install
./start-all.sh
```

停止服务：

```bash
./stop-all.sh
```

兼容说明：

- `./dev.sh` 为历史兼容命令，内部转发到 `./start-all.sh`
- `./stop.sh` 为历史兼容命令，内部转发到 `./stop-all.sh`

## 运行入口

- 前端应用：`http://127.0.0.1:5173/index.html?app=1`
- 产品介绍页：`http://127.0.0.1:5173/OS.html`
- 后端健康检查：`http://127.0.0.1:3000/health`
- 后端就绪检查：`http://127.0.0.1:3000/ready`
- DeepResearch（可选）：`http://127.0.0.1:5001/health`

## 生成工作流配置

- 核心配置文件：`backend/config/workflow-generation.js`
- 环境变量示例：`backend/.env.example`

当前默认策略：

- `prototype` 多轮续写默认 `10` 轮（`WORKFLOW_PROTOTYPE_LOOP_MAX_ROUNDS=10`）
- `prototype/preview/ui-preview` 结束标记默认 `<!--END_HTML-->`
- 非 HTML 交付物默认 `4` 轮（`WORKFLOW_ARTIFACT_LOOP_MAX_ROUNDS=4`）
- 原型支持分轮拼接与重叠去重，完成后写入分块会话（`artifact-chunks`）用于追踪与断点恢复

## 文档导航

- 启停权威文档：`docs/STARTUP_RUNBOOK.md`
- 文档治理规范：`docs/DOC_GOVERNANCE.md`
- 脚本注册表：`docs/SCRIPT_REGISTRY.md`
- 架构决策 ADR：`docs/architecture/ADR-001-modular-refactor.md`
- 开发文档索引：`docs/README.md`

## 架构说明

- 前端主入口采用 `frontend/js/modules/*` 分层加载
- 重构背景与决策依据见：`docs/architecture/ADR-001-modular-refactor.md`

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
