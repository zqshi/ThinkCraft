# 部署指南

本指南描述 ThinkCraft 的生产部署流程（Docker Compose）。

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

发布前请执行 `docs/PRODUCTION_CHECKLIST.md`。

