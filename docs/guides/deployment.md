# 部署指南

生产部署前，请先阅读统一启动运行手册：

- `docs/STARTUP_RUNBOOK.md`

本页仅保留生产 Docker 相关信息。

## 1. 准备环境

- 安装 Docker 与 Docker Compose v2
- 准备 `.env`（参考 `backend/.env.production.example`）

## 2. 构建与启动

```bash
Docker_BUILDKIT=1 docker compose up -d --build
```

## 3. 验证

- 前端：`http://<host>/health`
- 后端：`http://<host>:3000/health`

## 4. 维护

- 日志：`docker compose logs -f --tail=200`
- 停止：`docker compose down`

## 5. 生产检查

发布前至少完成以下检查：

- `docker compose ps` 无异常退出容器
- `http://<host>:3000/health` 返回 200
- 关键 API（登录、聊天、项目）可用
