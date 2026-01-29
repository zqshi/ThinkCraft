# 生产部署检查清单

## 1. 配置与密钥

- [ ] 已配置 `.env`（生产环境）
- [ ] `ACCESS_TOKEN_SECRET` / `REFRESH_TOKEN_SECRET` 已配置
- [ ] `DEEPSEEK_API_KEY` 已配置
- [ ] `SMS_PROVIDER` 已选择真实供应商
- [ ] 短信供应商密钥已配置并通过校验脚本

## 2. 依赖服务健康检查

### Redis

```bash
redis-cli -h $REDIS_HOST -p $REDIS_PORT ping
```

### MongoDB

```bash
mongosh "$MONGODB_URI" --eval "db.runCommand({ ping: 1 })"
```

## 3. 服务健康检查

```bash
curl -fsS http://localhost:3000/health
curl -fsS http://localhost:3000/api/health
```

## 4. 端到端验证

- [ ] 手机号+验证码登录成功
- [ ] 首次登录自动注册生效
- [ ] Token 刷新流程通过

## 5. 监控与告警

- [ ] 日志采集已接入
- [ ] /api/metrics 可访问
- [ ] 认证/短信异常告警已配置

## 6. 回滚准备

- [ ] 备份已生成
- [ ] 回滚流程已演练
