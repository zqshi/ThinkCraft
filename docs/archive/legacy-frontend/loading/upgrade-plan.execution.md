# 升级方案执行文档（未完成事项顺序）

> 来源：
>
> - docs/loading/upgrade-plan.tasks.md
> - docs/loading/upgrade-plan.md
> - docs/loading/upgrade-plan.flow.md
> - docs/loading/upgrade-plan.data.md
> - docs/loading/upgrade-plan.api.md
> - docs/loading/upgrade-plan.acceptance.md
>
> 目标：按“未完成事项”顺序执行，形成可落地的实施路线。

## Phase 0：准备与基线（1-2天）

1. 确认执行环境（本机 / Docker / K8s），输出执行环境说明 + 资源配额
2. 明确部署目标，输出部署目标与验收标准（URL / 日志 / 版本信息）
3. 基线检查（模板缺失、API Key、必要环境变量），输出缺口清单

## Phase 1：真实执行闭环（1-2周）

### 1) 任务队列与模型

4. 新增 Job 任务模型（参照数据结构草案）
5. 新增 Worker：拉取任务并执行

### 2) Workflow 接口改造

6. 扩展执行接口为异步任务：`POST /api/workflow/:projectId/execute-stage` 返回 `taskId`
7. 新增任务状态查询：`GET /api/workflow/tasks/:taskId`
8. 新增任务日志接口：`GET /api/workflow/tasks/:taskId/logs`
9. 新增任务取消接口：`POST /api/workflow/tasks/:taskId/cancel`
10. 新增部署产物访问：`GET /api/workflow/:projectId/deploy-url`

### 3) 测试阶段真实执行

11. 测试阶段执行 `npm test`（根目录 + backend）
12. 采集 stdout/stderr 日志
13. 生成真实 `test-report`（日志 + 统计摘要）

### 4) 部署阶段真实执行

14. 部署阶段执行 `scripts/start-prod.sh`
15. 执行 healthcheck（docker compose healthcheck）
16. 生成 `deploy-doc` + `release-notes`（真实日志）
17. 返回预览 URL

### 5) 前端状态与日志

18. 阶段执行状态展示（pending/running/success/failed）
19. 日志查看/下载入口
20. 失败提示 + 重试入口

## Phase 2：多租户与生产保障（2-4周）

### 1) 执行隔离

21. 容器池或独立工作区
22. 任务间资源隔离

### 2) 资源配额与超时

23. CPU/内存/时间限制
24. 超时自动终止

### 3) 回滚与审计

25. 失败自动回滚（docker compose down）
26. 审计日志保存
27. 白名单命令执行

## 外部用户前置配置

28. 配置 `DEEPSEEK_API_KEY`
29. 配置部署/测试所需环境变量
30. 具备 `docker compose` 运行权限
31. 配置公网域名或反向代理

## 交付物升级规则

32. `test-report` = 实际测试日志 + 统计摘要
33. `deploy-doc` = 实际部署日志 + 环境配置信息
34. `release-notes` = 真实版本信息 + commit/tag
35. `preview` = 可访问 URL

## 验收清单

36. 外部用户可正常执行测试与部署
37. 日志可追踪，失败可重试
38. 并发 3 个项目同时执行无冲突
39. 任务超时自动终止
40. 仅白名单命令可执行
41. 日志审计可追踪
42. 任务隔离（每个项目独立环境）
