# Docker 快速开始

本项目登录方式为手机号+验证码（首次登录自动注册），无单独注册页。

## 📦 已创建的文件

本次Docker容器化已创建以下文件：

### 核心配置文件
- `docker-compose.yml` - Docker Compose编排配置
- `backend/Dockerfile` - 后端服务镜像配置
- `frontend/Dockerfile` - 前端服务镜像配置
- `frontend/nginx.conf` - Nginx Web服务器配置
- `backend/.dockerignore` - 后端构建排除文件
- `.dockerignore` - 前端构建排除文件

### 辅助文件
- `DOCKER.md` - 详细的Docker部署指南
- `docker.sh` - Docker管理脚本（已添加执行权限）

## 🚀 快速启动步骤

### 1. 环境准备

确保已安装：
- Docker 20.10+
- Docker Compose 2.0+

### 2. 配置环境变量

```bash
# 如果backend/.env不存在，从模板创建
cp backend/.env.example backend/.env

# 编辑配置（可选）
vim backend/.env
```

### 2.1 短信网关配置检查（投产前）

```bash
cd backend
npm run check:sms-config
```

### 3. 使用管理脚本启动

```bash
# 方式1：使用管理脚本（推荐）
./docker.sh build   # 构建镜像
./docker.sh start   # 启动服务
./docker.sh status  # 查看状态
./docker.sh logs    # 查看日志

# 方式2：直接使用docker-compose
docker-compose build
docker-compose up -d
docker-compose ps
docker-compose logs -f
```

### 4. 访问应用

启动成功后，访问：
- 前端应用: http://localhost
- 后端API: http://localhost:3000
- 健康检查: http://localhost:3000/health
- 健康详情: http://localhost:3000/api/health

## 🔍 验证服务状态

```bash
# 检查所有服务是否健康
docker-compose ps

# 应该看到类似输出：
# NAME                    STATUS              PORTS
# thinkcraft-backend      Up (healthy)        0.0.0.0:3000->3000/tcp
# thinkcraft-frontend     Up (healthy)        0.0.0.0:80->80/tcp
# thinkcraft-mongodb      Up (healthy)        0.0.0.0:27017->27017/tcp
# thinkcraft-redis        Up (healthy)        0.0.0.0:6379->6379/tcp
```

## 🛠️ 常用命令

```bash
# 查看日志
./docker.sh logs backend   # 查看后端日志
./docker.sh logs frontend  # 查看前端日志

# 重启服务
./docker.sh restart backend

# 进入容器
./docker.sh shell backend   # 进入后端容器
./docker.sh shell mongodb   # 进入MongoDB

# 备份数据
./docker.sh backup

# 停止服务
./docker.sh stop

# 清理所有数据（谨慎使用）
./docker.sh clean
```

## 📋 服务说明

### 前端服务 (thinkcraft-frontend)
- 基于 Nginx Alpine
- 端口: 80
- 提供静态文件服务和API代理

### 后端服务 (thinkcraft-backend)
- 基于 Node.js 18 Alpine
- 端口: 3000
- 提供REST API服务

### MongoDB (thinkcraft-mongodb)
- 版本: MongoDB 7
- 端口: 27017
- 数据持久化: mongodb_data卷

### Redis (thinkcraft-redis)
- 版本: Redis 7 Alpine
- 端口: 6379
- 数据持久化: redis_data卷

## 🔧 配置说明

### 健康检查
所有服务都配置了健康检查：
- Frontend: 每30秒检查 /health 端点
- Backend: 每30秒检查 /health 端点
- MongoDB: 每10秒执行 ping 命令
- Redis: 每10秒执行 PING 命令

### 依赖关系
- Frontend 依赖 Backend
- Backend 依赖 MongoDB 和 Redis
- 使用 `condition: service_healthy` 确保依赖服务健康后才启动

### 网络
- 所有服务在 `thinkcraft-network` 桥接网络中
- 服务间可通过服务名互相访问

## 🐛 故障排查

### 端口被占用
```bash
# 检查端口占用
lsof -i :80
lsof -i :3000
lsof -i :27017
lsof -i :6379

# 修改docker-compose.yml中的端口映射
```

### 服务无法启动
```bash
# 查看详细日志
docker-compose logs --tail=100 backend

# 检查容器状态
docker-compose ps

# 重新构建镜像
docker-compose build --no-cache
```

### 网络问题
```bash
# 检查网络
docker network inspect thinkcraft_thinkcraft-network

# 重建网络
docker-compose down
docker-compose up -d
```

## 📚 更多信息

详细的部署指南、生产环境配置、监控和备份等信息，请查看 `DOCKER.md` 文档。

## ⚠️ 注意事项

1. **首次启动**: 首次启动可能需要几分钟来拉取镜像和初始化数据库
2. **数据持久化**: 数据存储在Docker卷中，使用 `docker-compose down -v` 会删除所有数据
3. **生产环境**: 生产环境部署前请修改 `ACCESS_TOKEN_SECRET`/`REFRESH_TOKEN_SECRET` 等敏感配置
4. **资源要求**: 建议至少2GB内存和5GB磁盘空间

## 🎯 下一步

1. 启动服务后，访问 http://localhost 测试前端
2. 访问 http://localhost:3000/api/health 测试后端
3. 查看 `DOCKER.md` 了解更多高级配置
4. 配置CI/CD自动化部署（见EXECUTION_PLAN.md阶段7）
