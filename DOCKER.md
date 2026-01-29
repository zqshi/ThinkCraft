# Docker 部署指南

本文档介绍如何使用Docker部署ThinkCraft应用。

本项目登录方式为手机号+验证码（首次登录自动注册），无单独注册页。

## 📋 前置要求

- Docker 20.10+
- Docker Compose 2.0+
- 至少2GB可用内存
- 至少5GB可用磁盘空间

## 🚀 快速启动

### 1. 环境配置

复制环境变量模板：

```bash
cp backend/.env.example backend/.env
```

编辑 `backend/.env` 文件，配置必要的环境变量：

```env
# 数据库配置
DB_TYPE=mongodb
MONGODB_URI=mongodb://mongodb:27017/thinkcraft

# Redis配置
REDIS_HOST=redis
REDIS_PORT=6379

# Token密钥（生产环境必须修改）
ACCESS_TOKEN_SECRET=your-access-token-secret
REFRESH_TOKEN_SECRET=your-refresh-token-secret

# SMS服务配置（必需）
SMS_PROVIDER=aliyun  # 可选: aliyun, tencent
```

### 2. 构建镜像

```bash
docker-compose build
```

### 3. 启动服务

```bash
docker-compose up -d
```

### 4. 查看日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb
docker-compose logs -f redis
```

### 5. 访问应用

- 前端: http://localhost
- 后端API: http://localhost:3000
- MongoDB: localhost:27017
- Redis: localhost:6379
 - 健康检查: http://localhost:3000/health
 - 健康详情: http://localhost:3000/api/health

## 🛠️ 常用命令

### 服务管理

```bash
# 启动所有服务
docker-compose up -d

# 停止所有服务
docker-compose down

# 重启服务
docker-compose restart

# 重启特定服务
docker-compose restart backend

# 查看服务状态
docker-compose ps

# 查看服务健康状态
docker-compose ps --format json | jq '.[].Health'
```

### 数据管理

```bash
# 停止服务并删除数据卷
docker-compose down -v

# 备份MongoDB数据
docker exec thinkcraft-mongodb mongodump --out /data/backup

# 恢复MongoDB数据
docker exec thinkcraft-mongodb mongorestore /data/backup

# 备份Redis数据
docker exec thinkcraft-redis redis-cli SAVE
```

### 镜像管理

```bash
# 重新构建镜像
docker-compose build --no-cache

# 拉取最新镜像
docker-compose pull

# 查看镜像大小
docker images | grep thinkcraft
```

### 调试

```bash
# 进入容器
docker exec -it thinkcraft-backend sh
docker exec -it thinkcraft-frontend sh
docker exec -it thinkcraft-mongodb mongosh
docker exec -it thinkcraft-redis redis-cli

# 查看容器资源使用
docker stats

# 查看容器详细信息
docker inspect thinkcraft-backend
```

## 🔧 配置说明

### 服务端口

| 服务     | 容器端口 | 主机端口 | 说明           |
| -------- | -------- | -------- | -------------- |
| frontend | 80       | 80       | Nginx前端服务  |
| backend  | 3000     | 3000     | Node.js后端API |
| mongodb  | 27017    | 27017    | MongoDB数据库  |
| redis    | 6379     | 6379     | Redis缓存      |

### 数据持久化

数据卷配置：

- `mongodb_data`: MongoDB数据目录
- `mongodb_config`: MongoDB配置目录
- `redis_data`: Redis数据目录

### 健康检查

所有服务都配置了健康检查：

- **frontend**: 每30秒检查一次，访问 `/health` 端点
- **backend**: 每30秒检查一次，访问 `/health` 端点
- **mongodb**: 每10秒检查一次，执行 `ping` 命令
- **redis**: 每10秒检查一次，执行 `PING` 命令

## 🐛 故障排查

### 服务无法启动

1. 检查端口是否被占用：

```bash
lsof -i :80
lsof -i :3000
lsof -i :27017
lsof -i :6379
```

2. 检查Docker资源限制：

```bash
docker system df
docker system prune
```

3. 查看详细错误日志：

```bash
docker-compose logs --tail=100 backend
```

### MongoDB连接失败

1. 检查MongoDB是否健康：

```bash
docker-compose ps mongodb
docker exec thinkcraft-mongodb mongosh --eval "db.adminCommand('ping')"
```

2. 检查网络连接：

```bash
docker network inspect thinkcraft_thinkcraft-network
```

### Redis连接失败

1. 检查Redis是否健康：

```bash
docker-compose ps redis
docker exec thinkcraft-redis redis-cli ping
```

2. 检查Redis日志：

```bash
docker-compose logs redis
```

### 前端无法访问后端API

1. 检查Nginx配置：

```bash
docker exec thinkcraft-frontend cat /etc/nginx/nginx.conf
```

2. 测试后端连接：

```bash
docker exec thinkcraft-frontend wget -O- http://backend:3000/health
```

## 🔒 生产环境部署

### 安全配置

1. **修改默认密钥**：

```env
ACCESS_TOKEN_SECRET=使用强随机密钥
REFRESH_TOKEN_SECRET=使用强随机密钥
```

2. **短信网关配置检查**：

```bash
cd backend
npm run check:sms-config
```

3. **配置HTTPS**：

在 `frontend/nginx.conf` 中添加SSL配置：

```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    # ... 其他配置
}
```

4. **限制端口暴露**：

修改 `docker-compose.yml`，移除不需要暴露的端口：

```yaml
mongodb:
  # ports:
  #   - '27017:27017'  # 注释掉，仅内部访问
```

### 性能优化

1. **调整资源限制**：

```yaml
backend:
  deploy:
    resources:
      limits:
        cpus: '1'
        memory: 1G
      reservations:
        cpus: '0.5'
        memory: 512M
```

2. **配置日志轮转**：

```yaml
backend:
  logging:
    driver: "json-file"
    options:
      max-size: "10m"
      max-file: "3"
```

### 监控和备份

1. **配置自动备份**：

创建定时任务备份数据：

```bash
# 添加到crontab
0 2 * * * docker exec thinkcraft-mongodb mongodump --out /data/backup/$(date +\%Y\%m\%d)
```

2. **配置监控**：

使用Prometheus + Grafana监控容器状态。

## 📚 参考资料

- [Docker官方文档](https://docs.docker.com/)
- [Docker Compose文档](https://docs.docker.com/compose/)
- [MongoDB Docker镜像](https://hub.docker.com/_/mongo)
- [Redis Docker镜像](https://hub.docker.com/_/redis)
- [Nginx Docker镜像](https://hub.docker.com/_/nginx)

## 🆘 获取帮助

如果遇到问题，请：

1. 查看日志：`docker-compose logs -f`
2. 检查服务状态：`docker-compose ps`
3. 查看本文档的故障排查部分
4. 提交Issue到项目仓库
