# ThinkCraft 项目执行计划

**文档版本**: 1.1
**更新时间**: 2026-01-26
**项目路径**: `/Users/zqs/Downloads/project/ThinkCraft`

---

## 📝 更新日志

### v1.1 (2026-01-26)

- ✅ 完成阶段4前端DDD重构（85%+）
- ✅ ESLint错误从757个降至<10个（减少98%+）
- ✅ 创建7个模块的基础设施层API服务
- ✅ 提交3次代码到git仓库
- 📊 总进度从45%提升至55%
- 🎯 当前阶段：阶段5 - 账号体系完善

### v1.0 (2026-01-26)

- 初始版本
- 完成阶段1-3的工作总结
- 制定阶段4-7的执行计划

---

## 📋 项目概览

ThinkCraft是一个创意验证操作系统，采用DDD（领域驱动设计）架构。本文档提供完整的执行计划，确保在没有上下文的情况下也能继续开发。

### 技术栈

- **后端**: Node.js + Express + DDD架构
- **前端**: 原生JavaScript + DDD架构
- **数据库**: MongoDB + Redis
- **测试**: Jest
- **部署**: Docker + GitHub Actions

---

## ✅ 已完成工作（阶段1-4）

### 阶段1：代码质量修复 ✅

- ESLint错误从757个降至<10个（减少98%+）
- 修复logger.js语法错误
- 创建frontend Result类
- 配置Husky + lint-staged

### 阶段2：测试体系建立 ✅

- 配置Jest测试框架
- 创建81个测试用例（全部通过）
- 测试覆盖率达到7.61%
- Auth领域层完全覆盖

### 阶段3：数据库集成 ✅

- 创建MongoDB模型和仓库
- 实现Redis缓存服务
- 创建数据迁移脚本（4个）
- 集成到应用（server.js）
- 创建.env.example和DATABASE.md

### 阶段4：前端DDD重构 ✅（85%+）

- 完成7个前端模块的DDD重构
- demo-generator、report、pdf-export模块100%完成
- share、vision、workflow、workflow-recommendation模块80%完成
- 创建4个模块的基础设施层API服务
- ESLint错误从757个降至<10个（减少98%+）
- 删除重复的基类定义和未使用的导入
- 修复未使用的参数和重复的方法定义

**阶段3关键文件**:

- `/backend/src/features/auth/infrastructure/user.model.js`
- `/backend/src/features/auth/infrastructure/user-mongodb.repository.js`
- `/backend/src/infrastructure/cache/redis-cache.service.js`
- `/backend/src/shared/infrastructure/repository.factory.js`
- `/backend/config/database.js`
- `/backend/scripts/migrate-to-mongodb.js`
- `/backend/scripts/verify-migration.js`
- `/backend/scripts/backup-data.js`
- `/backend/scripts/restore-data.js`

**阶段4关键文件**:

- `/frontend/src/features/demo-generator/` - 完整DDD结构
- `/frontend/src/features/report/` - 完整DDD结构
- `/frontend/src/features/pdf-export/` - 完整DDD结构
- `/frontend/src/features/share/infrastructure/share-api.service.js`
- `/frontend/src/features/vision/infrastructure/vision-api.service.js`
- `/frontend/src/features/workflow/infrastructure/workflow-api.service.js`
- `/frontend/src/features/workflow-recommendation/infrastructure/recommendation-api.service.js`

---

## 🎯 待执行任务（阶段5-7）

### 阶段5：账号体系完善（5天）⏳ 当前阶段

**目标**: 实现基础版账号体系

**功能清单**:

#### 1. 邮箱验证（1.5天）

- 注册时发送验证邮件
- 6位数字验证码
- 验证码存储在Redis（TTL 10分钟）
- 验证成功后激活账号

**需要创建的文件**:

- `/backend/src/infrastructure/email/email.service.js`
- `/backend/src/features/auth/application/email-verification.use-case.js`

**需要修改的文件**:

- `/backend/src/features/auth/domain/user.aggregate.js` - 添加邮箱验证方法
- `/backend/src/features/auth/infrastructure/user.model.js` - 已包含邮箱验证字段

#### 2. 密码重置（1.5天）

- 发送重置链接（包含token）
- Token存储在Redis（TTL 30分钟）
- 频率限制（5次/小时）
- 重置成功后更新密码

**需要创建的文件**:

- `/backend/src/features/auth/application/password-reset.use-case.js`
- `/backend/routes/password-reset.js`

#### 3. 账号管理（2天）

- 个人信息管理（查看、修改用户名、修改邮箱、修改密码）
- 安全设置（登录历史、活跃会话、强制登出、账号注销）
- 偏好设置（语言、主题、通知）

**需要创建的文件**:

- `/backend/src/features/auth/application/account-management.use-case.js`
- `/backend/routes/account.js`
- `/frontend/src/features/account/` - 完整模块

**环境变量**:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=ThinkCraft <noreply@thinkcraft.com>
```

---

### 阶段6：Docker容器化（2天）

**目标**: 实现Docker容器化部署

**任务清单**:

#### 1. 创建Dockerfile（4小时）

**前端Dockerfile** (`/frontend/Dockerfile`):

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**后端Dockerfile** (`/backend/Dockerfile`):

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

#### 2. 创建docker-compose.yml（4小时）

**文件路径**: `/docker-compose.yml`

```yaml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports:
      - '80:80'
    depends_on:
      - backend
    networks:
      - thinkcraft-network

  backend:
    build: ./backend
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - DB_TYPE=mongodb
      - MONGODB_URI=mongodb://mongodb:27017/thinkcraft
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      - mongodb
      - redis
    networks:
      - thinkcraft-network

  mongodb:
    image: mongo:7
    ports:
      - '27017:27017'
    volumes:
      - mongodb_data:/data/db
    networks:
      - thinkcraft-network

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
    networks:
      - thinkcraft-network

volumes:
  mongodb_data:
  redis_data:

networks:
  thinkcraft-network:
    driver: bridge
```

#### 3. 创建Nginx配置（2小时）

**文件路径**: `/frontend/nginx.conf`

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 4. 测试和优化（6小时）

**测试命令**:

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 清理数据
docker-compose down -v
```

**验收标准**:

- ✅ `docker-compose up`一键启动
- ✅ 所有服务正常运行
- ✅ 前后端通信正常
- ✅ 数据持久化正常

---

### 阶段7：CI/CD流程（2天）

**目标**: 建立自动化测试和部署流程

**任务清单**:

#### 1. 创建CI工作流（8小时）

**文件路径**: `/.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  build:
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
```

#### 2. 创建构建工作流（4小时）

**文件路径**: `/.github/workflows/build.yml`

```yaml
name: Build Docker Images

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: |
            thinkcraft/app:latest
            thinkcraft/app:${{ github.sha }}
```

#### 3. 创建部署工作流（4小时）

**文件路径**: `/.github/workflows/deploy.yml`

```yaml
name: Deploy

on:
  workflow_dispatch:
  push:
    tags: ['v*']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            cd /opt/thinkcraft
            docker-compose pull
            docker-compose up -d
            docker-compose ps
```

**需要配置的Secrets**:

- `DOCKER_USERNAME`
- `DOCKER_PASSWORD`
- `SERVER_HOST`
- `SERVER_USER`
- `SERVER_SSH_KEY`

**验收标准**:

- ✅ 每次push自动运行测试
- ✅ 测试失败时阻止合并
- ✅ main分支自动构建镜像
- ✅ 部署流程可手动触发

---

## 📝 执行步骤

### 立即开始：阶段4 - 前端DDD重构

#### 步骤1：完成demo-generator模块（8小时）

**当前状态**: 50%完成

**需要完成的工作**:

1. 创建领域层（聚合根、值对象、事件）
2. 创建应用层（用例）
3. 创建基础设施层（API服务、存储服务、映射器、仓库）
4. 更新旧代码引用

**参考文件**:

- `/frontend/js/modules/demo-generator.js` - 旧实现
- `/frontend/src/features/chat/` - DDD模板

**执行命令**:

```bash
cd /Users/zqs/Downloads/project/ThinkCraft/frontend
mkdir -p src/features/demo-generator/{domain,application,infrastructure}
```

#### 步骤2：完成report模块（16小时）

**优先级**: 高

**目录结构**:

```
frontend/src/features/report/
  domain/
    report.aggregate.js
    value-objects/
      report-id.vo.js
      report-type.vo.js
      report-content.vo.js
  application/
    generate-report.use-case.js
  infrastructure/
    report-api.service.js
    report-storage.service.js
    report.mapper.js
    report.repository.js
  index.js
```

**参考文件**:

- `/frontend/js/modules/report-generator.js` - 旧实现

#### 步骤3：完成pdf-export模块（16小时）

**优先级**: 高

**目录结构**:

```
frontend/src/features/pdf-export/
  domain/
    export.aggregate.js
    value-objects/
      export-id.vo.js
      export-format.vo.js
  application/
    export-pdf.use-case.js
  infrastructure/
    pdf-api.service.js
    pdf.mapper.js
  index.js
```

**参考文件**:

- `/frontend/js/modules/pdf-export.js` - 旧实现

#### 步骤4-7：完成剩余模块

按照相同的模式完成：

- share（12小时）
- vision（12小时）
- workflow（16小时）
- workflow-recommendation（12小时）

---

## 🔍 验证和测试

### 每个模块完成后的验证清单

- [ ] 目录结构符合DDD模板
- [ ] 所有文件都已创建
- [ ] 导出文件（index.js）正确
- [ ] 旧代码引用已更新
- [ ] 功能正常工作
- [ ] 无ESLint错误
- [ ] 编写单元测试（可选）

### 测试命令

```bash
# 运行ESLint检查
npm run lint

# 运行测试
npm test

# 运行测试覆盖率
npm run test:coverage

# 启动开发服务器
npm start
```

---

## 📚 关键文档

- `/backend/DATABASE.md` - 数据库集成指南
- `/backend/scripts/README.md` - 数据迁移工具文档
- `/backend/.env.example` - 环境变量模板
- `/docs/ARCHITECTURE.md` - 架构文档
- `/docs/ddd-refactoring-progress.md` - DDD重构进度

---

## 🚨 注意事项

1. **代码质量**: 每次提交前运行`npm run lint`
2. **测试覆盖**: 核心功能必须有测试
3. **向后兼容**: 重构时保持接口兼容
4. **文档更新**: 及时更新相关文档
5. **Git提交**: 使用规范的提交信息

---

## 📞 故障排查

### MongoDB连接失败

```bash
# 检查MongoDB是否启动
docker ps | grep mongodb

# 启动MongoDB
docker run -d -p 27017:27017 --name mongodb mongo:7
```

### Redis连接失败

```bash
# 检查Redis是否启动
docker ps | grep redis

# 启动Redis
docker run -d -p 6379:6379 --name redis redis:7-alpine
```

### ESLint错误过多

```bash
# 自动修复
npm run lint:fix

# 查看详细错误
npx eslint . --format=json > eslint-report.json
```

---

## 📊 进度跟踪

| 阶段                | 状态        | 完成度 | 预计时间 | 实际完成时间 |
| ------------------- | ----------- | ------ | -------- | ------------ |
| 阶段1：代码质量修复 | ✅ 完成     | 100%   | 1.5天    | 1.5天        |
| 阶段2：测试体系建立 | ✅ 完成     | 100%   | 7.5天    | 7.5天        |
| 阶段3：数据库集成   | ✅ 完成     | 100%   | 8天      | 8天          |
| 阶段4：前端DDD重构  | ✅ 完成     | 85%+   | 11.5天   | 10天         |
| 阶段5：账号体系完善 | ⏳ 当前阶段 | 0%     | 5天      | -            |
| 阶段6：Docker容器化 | ⏳ 待开始   | 0%     | 2天      | -            |
| 阶段7：CI/CD流程    | ⏳ 待开始   | 0%     | 2天      | -            |

**总进度**: 约55% (20.5/37.5天)

**最新更新**: 2026-01-26

- 完成阶段4前端DDD重构（85%+）
- ESLint错误从757个降至<10个（减少98%+）
- 创建7个模块的基础设施层
- 提交3次代码到git仓库

---

## 🎯 下一步行动

1. **立即执行**: 开始阶段5 - 账号体系完善
   - 实现邮箱验证功能
   - 实现密码重置功能
   - 实现账号管理功能

2. **接下来**: 执行阶段6 - Docker容器化
   - 创建Dockerfile（前端+后端）
   - 创建docker-compose.yml
   - 配置Nginx

3. **然后**: 执行阶段7 - CI/CD流程
   - 创建GitHub Actions工作流
   - 配置自动化测试和部署

4. **优化建议**:
   - 补充share、vision、workflow、workflow-recommendation模块的mapper和repository
   - 修复剩余的少量ESLint错误
   - 为新增的API服务编写单元测试

**预计完成时间**: 约2-3周

---

**文档结束**
