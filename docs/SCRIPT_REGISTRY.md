# Script Registry

本文档是 ThinkCraft 脚本清单（权威版），用于标记脚本用途、入口级别和维护状态。

## 规则

- `Tier-1`：日常运行必须脚本（稳定接口，优先维护）
- `Tier-2`：运维/质量脚本（按需使用）
- `Tier-3`：一次性/迁移脚本（仅特定场景）
- `Status=active` 才允许在 README 与 runbook 中作为常规入口暴露

## Tier-1（统一入口）

| Script         | Scope | Purpose                              | Status        |
| -------------- | ----- | ------------------------------------ | ------------- |
| `start-all.sh` | root  | 启动前后端、CSS 同步、依赖检查与拉起 | active        |
| `stop-all.sh`  | root  | 停止前后端与相关进程并清理端口       | active        |
| `dev.sh`       | root  | 历史兼容入口，转发到 `start-all.sh`  | active-compat |
| `stop.sh`      | root  | 历史兼容入口，转发到 `stop-all.sh`   | active-compat |

## Tier-2（运维与质量）

| Script                                | Scope        | Purpose                                  | Status |
| ------------------------------------- | ------------ | ---------------------------------------- | ------ |
| `docker.sh`                           | root         | Docker Compose 常用命令封装              | active |
| `scripts/start-prod.sh`               | root/scripts | 生产栈启动（需 env 文件）                | active |
| `scripts/stop-prod.sh`                | root/scripts | 生产栈停止                               | active |
| `scripts/rotate-logs.sh`              | root/scripts | 日志轮转                                 | active |
| `scripts/auth-agent-check.sh`         | root/scripts | Agent 鉴权自检                           | active |
| `scripts/check-artifact-templates.js` | root/scripts | 检查 workflow 交付物模板声明与文件一致性 | active |
| `scripts/sync-css.js`                 | root/scripts | 同步 `css/` 到 `public/css/`             | active |
| `scripts/performance-test-simple.sh`  | root/scripts | 轻量性能冒烟                             | active |

## Tier-3（迁移/数据维护）

| Script                                           | Scope   | Purpose              | Status             |
| ------------------------------------------------ | ------- | -------------------- | ------------------ |
| `backend/scripts/migrate-to-mongodb.js`          | backend | 数据迁移             | active-maintenance |
| `backend/scripts/backup-data.js`                 | backend | 数据备份             | active-maintenance |
| `backend/scripts/restore-data.js`                | backend | 数据恢复             | active-maintenance |
| `backend/scripts/verify-migration.js`            | backend | 迁移结果验证         | active-maintenance |
| `backend/scripts/clear-project-space.js`         | backend | 清理项目空间数据     | active-maintenance |
| `backend/scripts/backfill-workflow-artifacts.js` | backend | 回填 workflow 交付物 | active-maintenance |

## 历史/兼容脚本

| Script               | Scope   | Purpose              | Status |
| -------------------- | ------- | -------------------- | ------ |
| `backend/service.sh` | backend | 旧后端单服务启停脚本 | legacy |

> 约定：`legacy` 脚本不作为标准流程文档入口展示。

## 变更流程

1. 新增脚本前，先在本文件登记 Tier、用途、Owner。
2. 若脚本替代旧入口，先把旧入口改为转发，再在两周窗口后下线。
3. 删除脚本前，需先全仓搜索引用并在 PR 中附结果。
