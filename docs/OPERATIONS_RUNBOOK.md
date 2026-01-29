# 运行手册（部署/回滚/监控/密钥）

## 1. 部署（Docker）

### 1.1 前置条件

- Docker / Docker Compose 可用
- 已配置 `.env`（见 `backend/.env.example`）
- Redis / MongoDB 可连通（生产建议独立服务）

### 1.2 启动

```bash
docker compose up -d
```

### 1.2.1 短信网关配置检查

```bash
cd backend
npm run check:sms-config
```

### 1.3 健康检查

```bash
curl -fsS http://localhost:3000/health
curl -fsS http://localhost:3000/api/health
```

### 1.4 前端访问

- 访问 `http://localhost` 或 `http://localhost:8000`（以实际映射端口为准）

## 2. 回滚

### 2.1 镜像回滚

```bash
docker compose down
docker compose up -d --no-build
```

### 2.2 数据回滚（MongoDB）

1. 备份恢复：`node backend/scripts/restore-data.js <backup-file>`
2. 验证：`node backend/scripts/verify-migration.js`

### 2.3 关键提醒

- 回滚前先记录当前版本镜像与配置
- 回滚后必须重新执行健康检查

## 3. 监控

### 3.1 服务监控

- `/health`：基础存活探针
- `/api/health`：扩展健康信息
- `/api/metrics`：进程级指标（内存/CPU/uptime）

### 3.2 日志

- 默认 stdout
- 生产建议接入日志采集（ELK/云日志服务）

### 3.3 关键告警

- 认证失败率异常上涨
- 短信发送失败率异常上涨
- /api/health 5xx

## 4. 密钥管理

### 4.1 必需密钥

- `ACCESS_TOKEN_SECRET`
- `REFRESH_TOKEN_SECRET`
- `DEEPSEEK_API_KEY`

### 4.2 短信网关密钥（按供应商）

- `SMS_PROVIDER=aliyun` 或 `SMS_PROVIDER=tencent`
- 阿里云示例：`ALIYUN_SMS_ACCESS_KEY_ID`、`ALIYUN_SMS_ACCESS_KEY_SECRET`
- 腾讯云示例：`TENCENT_SMS_SECRET_ID`、`TENCENT_SMS_SECRET_KEY`

### 4.3 管理规范

- 生产密钥不得入库
- 使用密钥管理系统（Vault/云KMS）
- 轮换周期建议 90 天

## 5. 故障处理

1. 先检查 `/health` / `/api/health`
2. 检查 Redis/MongoDB 连接
3. 查看日志定位错误栈
4. 必要时回滚
