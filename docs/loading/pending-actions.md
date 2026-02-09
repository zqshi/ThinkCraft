# docs/loading 未完成事项汇总（生成于 2026-02-09）

说明：已从各文档中移除已完成/已勾选部分，仅保留未完成事项以指导后续动作。

## 来源：docs/loading/upgrade-plan.tasks.md

### Phase 0：准备与基线（1-2天）

- 确认执行环境（本机、Docker、K8s），产出执行环境说明 + 资源配额
- 明确部署目标，产出部署目标与验收标准
- 基线检查（模板缺失、API Key、必要环境变量），产出缺口清单

### Phase 1：真实执行闭环（1-2周）

- 任务队列：新增 Job 模型；API：创建任务/查询任务/取消任务
- 测试阶段真实执行：执行 `npm test`（根）+ `npm test`（backend），产出真实 test-report（含日志、统计）
- 部署阶段真实执行：执行 `scripts/start-prod.sh`，产出 deploy-doc（真实日志）+ release-notes
- 前端状态与日志：执行中/失败/成功状态展示；日志查看/下载入口

### Phase 2：多租户与生产保障（2-4周）

- 执行隔离：容器池或独立工作区；任务间资源隔离
- 资源配额与超时：CPU/内存/时间限制；超时自动终止
- 回滚与审计：失败自动回滚；审计日志保存

### 验收清单

- 外部用户可正常执行测试与部署
- 日志可追踪，失败可重试
- 不同用户任务互不影响

---

## 来源：docs/loading/upgrade-plan.md

### Phase 1（1-2周）：可执行闭环

- 新增任务队列模块（Job 模型 + Worker）
- 扩展 workflow 执行接口（异步任务：创建任务 + 查询状态）
- 真实测试执行（`npm test` 根目录 + backend），生成真实 test-report
- 真实部署执行（`scripts/start-prod.sh` + healthcheck），生成 deploy-doc + release-notes
- 前端：执行中状态、日志查看、失败重试入口

### Phase 2（2-4周）：多租户与生产级保障

- 容器池与每任务独立工作区
- 资源限制（CPU/Memory/Timeout）
- 白名单命令、审计日志、失败自动回滚

### 外部用户前置配置

- 配置 `DEEPSEEK_API_KEY`
- 配置部署/测试所需环境变量
- 具备 `docker compose` 运行权限
- 配置公网域名或反向代理

### 交付物升级规则

- `test-report` = 实际测试日志 + 统计摘要
- `deploy-doc` = 实际部署日志 + 环境配置信息
- `release-notes` = 真实版本信息 + commit/tag
- `preview` = 可访问 URL

---

## 来源：docs/loading/upgrade-plan.flow.md

### 测试阶段执行

- 创建任务（execute-stage）
- Worker 执行 `npm test`
- 收集日志并生成 test-report
- Job 状态 success，前端轮询显示日志与结果

### 部署阶段执行

- 创建部署任务 Job
- Worker 执行 `scripts/start-prod.sh`
- 检查 healthcheck
- 生成 deploy-doc + release-notes
- 返回预览 URL，前端显示预览入口

---

## 来源：docs/loading/upgrade-plan.data.md

### Job 任务模型

- `status`: `queued | running | success | failed | cancelled`
- 需记录：`progress`, `logs`, `createdAt`, `updatedAt`

### Artifact 扩展字段

- 增加 `source`, `meta.taskId`, `meta.durationMs`, `meta.exitCode`

### Deploy 元数据

- `url`, `status`, `logs`

---

## 来源：docs/loading/upgrade-plan.api.md

### API 需要落地

- 创建任务：`POST /api/workflow/:projectId/execute-stage`
- 查询任务状态：`GET /api/workflow/tasks/:taskId`
- 获取任务日志：`GET /api/workflow/tasks/:taskId/logs`
- 取消任务：`POST /api/workflow/tasks/:taskId/cancel`
- 获取部署 URL：`GET /api/workflow/:projectId/deploy-url`

---

## 来源：docs/loading/upgrade-plan.acceptance.md

### 功能验收

- 测试阶段执行生成真实 test-report（含日志与统计）
- 部署阶段执行生成真实 deploy-doc + release-notes
- 预览入口显示可访问 URL

### 稳定性验收

- 并发 3 个项目同时执行无冲突
- 任务超时自动终止
- 失败任务可重试

### 安全验收

- 仅白名单命令可执行
- 日志审计可追踪
- 任务隔离（每个项目独立环境）

---

## 来源：docs/loading/deepresearch-integration-plan.md

### P1（第二阶段 - Python 微服务）

- Python 服务：实现 Flask 应用和 DeepResearch 客户端
- Node.js 集成：实现 HTTP 客户端调用 Python 服务（带 5 次重试）
- 章节支持：所有章节的深度研究（不区分章节类型）
- 超时配置：单章节超时时间设置为 10 分钟
- 重试机制：服务异常自动重试 5 次，失败后提示用户
- 降级策略：服务不可用时询问用户是否降级到 DeepSeek
- 注意：深度研究开关对整篇文档生效，所有章节统一使用同一模式

### P2（第三阶段 - 优化增强）

- 支持所有章节的深度研究
- 添加深度研究结果的数据来源展示
- 优化生成速度（并行处理、缓存）
- 添加成本统计和预算控制
- Docker 化部署 Python 微服务

### 功能待办

- 功能1：深度级别选择
- 功能2：数据来源展示
- 功能3：置信度评分
- 功能4：自定义研究问题
- 功能5：进度可视化优化
- 功能6：成本统计和预算控制

### 验证清单待完成

- 浅层模式生成时间约 2 分钟/章节
- 中等模式生成时间约 5 分钟/章节
- 深度模式生成时间约 10 分钟/章节
- 不同深度的内容质量有明显差异
- 报告中显示数据来源列表
- 来源链接可点击跳转
- 相关度评分正确显示
- 章节标题旁显示置信度徽章
- 不同置信度的颜色区分正确
- 可以为章节添加自定义问题
- 生成内容针对自定义问题进行了研究
- 实时显示迭代轮次
- 进度更新流畅
- 生成完成后显示成本报告
- 预算控制功能正常工作
- 超过预算时正确提示

---

## 来源：docs/loading/enhancement-plan-deepresearch-editor.md

### 交付物预览编辑缺失功能

- 无编辑功能
- 无版本控制
- 无实时预览
- 无保存 API

### 交付物编辑器实现任务

- 安装 CodeMirror 6
- 创建 `/frontend/js/components/artifact-editor.js`
- 修改 `/frontend/js/modules/project-manager.js`
- 添加 `/frontend/css/artifact-editor.css`
- 在交付物数据结构中添加 `editedBy`
- 在 `/backend/src/features/workflow/interfaces/workflow-routes.js` 添加 PUT API
- 修改交付物实体，添加 `editedBy` 和 `updatedAt`
- 实现保存逻辑（更新内容 + 标记为用户编辑）
- 修改 `/backend/src/features/workflow/interfaces/workflow-routes.js` 的 `execute-stage` 逻辑
- 检查交付物 `editedBy` 字段
- 如果为 `user`，跳过该交付物生成
- 前端显示“用户编辑”标记
- 功能测试：编辑、保存、取消、实时预览
- 冲突测试：编辑后重新生成阶段，验证保护逻辑
- 兼容性测试：不同类型交付物（Markdown、代码）

### DeepResearch 集成实现任务

- 创建 `/backend/services/deep-research/` 目录
- 安装 DeepResearch（`pip install deep-research`）
- 实现 Flask/FastAPI 服务
- 添加 Docker 配置（可选）
- 创建 `/backend/src/infrastructure/ai/deep-research-client.js`
- 实现 HTTP 调用 Python 微服务
- 修改 `/backend/src/features/business-plan/application/business-plan.use-case.js`
- 在 `.env` 添加 `DEEPRESEARCH_SERVICE_URL`
- 修改 `/frontend/js/modules/business-plan-generator.js`
- 添加生成模式选择（快速 vs 深度）
- 显示数据来源和置信度（深度模式）
- 单元测试：查询构建和结果解析
- 集成测试：生成市场分析章节，验证内容质量
- 性能测试：对比快速与深度模式时间/成本

### 后续功能项

- DeepResearch 支持所有 5 个章节
- 编辑器添加版本历史
- 添加权限控制
- 导出功能（PDF、Word）

### 交付物编辑器验证清单

- 打开任意交付物预览面板
- 点击“编辑”按钮进入编辑模式
- 修改内容，验证实时预览更新
- 点击“保存”，验证内容持久化
- 刷新页面，验证修改已保存
- 重新生成该阶段，验证交付物未被覆盖
- 在 UI 中看到“用户编辑”标记

### DeepResearch 集成验证清单

- 启动 Python 微服务
- 创建新项目并进行对话
- 生成商业计划书，选择“深度研究”模式
- 验证生成时间（2-3 分钟）
- 检查生成内容是否包含数据来源和引用
- 对比快速模式和深度模式的内容质量
- 验证成本统计是否正确
