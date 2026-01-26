# ThinkCraft - AI思维助手

> 创意验证操作系统：用对话式引导 + AI分析报告，把灵感变成可执行方案

## ✨ 当前能力概览

- **多入口体验**：`OS.html` 产品介绍页 → 登录/注册 → 主应用
- **对话式思维引导**：多轮对话、快速回复、打字机效果、历史记录
- **项目空间**：对话与项目分区管理
- **结构化产出**：分析报告、商业计划书章节、PDF导出、分享链接
- **AI增强模块**：视觉分析、Demo生成、工作流推荐与执行、数字员工
- **账号体系**：用户注册/登录、手机验证码、密码重置、账号管理
- **数据持久化**：MongoDB + Redis
- **DDD架构**：领域驱动设计，清晰的分层架构
- **容器化部署**：Docker + Docker Compose一键部署
- **PWA基础设施**：`manifest.json` + `service-worker.js`

## 🚀 快速开始

### 方式一：Docker部署（推荐）

使用Docker Compose一键启动所有服务（前端、后端、MongoDB、Redis）：

```bash
# 1. 配置环境变量
cp backend/.env.example backend/.env
# 编辑 backend/.env，设置 DEEPSEEK_API_KEY 等配置

# 2. 使用管理脚本启动
./docker.sh build   # 构建镜像
./docker.sh start   # 启动服务
./docker.sh status  # 查看状态
./docker.sh logs    # 查看日志

# 或直接使用 docker-compose
docker-compose up -d
```

启动后访问：
- 前端应用：http://localhost
- 后端API：http://localhost:3000
- 健康检查：http://localhost/health

详细文档：
- [Docker快速开始](DOCKER_QUICKSTART.md)
- [Docker详细指南](DOCKER.md)

### 方式二：本地开发

#### 前端预览（无需后端）

```bash
# 在项目根目录
python3 -m http.server 8000
# 访问 http://localhost:8000/OS.html
```

- 在 OS 页面点击"立即体验"进入登录页
- 登录/注册为演示模式（存储在浏览器本地）

#### 启动后端（解锁完整功能）

```bash
cd backend
npm install
npm run dev
```

在 `backend/.env` 中设置：

```env
# DeepSeek API配置
DEEPSEEK_API_KEY=your_api_key_here

# 服务配置
PORT=3000
FRONTEND_URL=http://localhost:8000

# 数据库配置
DB_TYPE=mongodb
MONGODB_URI=mongodb://localhost:27017/thinkcraft

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT密钥
JWT_SECRET=your-secret-key

# SMS服务配置（可选）
SMS_PROVIDER=mock  # 可选: aliyun, tencent, mock
```

后端启动后，前端默认请求 `http://localhost:3000`。

## 🧩 主要模块

### 前端（DDD架构）

- **入口页面**：`OS.html`、`login.html`、`register.html`、`index.html`
- **DDD模块**：`frontend/src/features/`（chat、agents、auth、projects、business-plan、demo-generator、report、pdf-export、share、vision、workflow、workflow-recommendation）
- **共享基础设施**：`frontend/src/shared/`（领域模型基类、工具类）
- **样式**：`css/` + `frontend/css/`

### 后端（DDD架构）

- **服务入口**：`backend/server.js`
- **DDD模块**：`backend/src/features/`（auth、chat、agents、projects、business-plan、demo-generator、report、pdf-export、share、vision、workflow、workflow-recommendation）
- **共享基础设施**：`backend/src/shared/`（领域模型基类）、`backend/src/infrastructure/`（缓存、SMS等）
- **路由**：`backend/routes/`
- **数据库**：MongoDB模型和仓库、Redis缓存服务
- **脚本**：`backend/scripts/`（数据迁移、备份、恢复）

### 配置与文档

- **系统提示词**：`config/system-prompts.js`
- **报告提示词**：`config/report-prompts.js`
- **配置说明**：`config/README.md`
- **架构文档**：`docs/ARCHITECTURE.md`
- **执行计划**：`EXECUTION_PLAN.md`

## 🔌 后端API

### 认证与账号
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `POST /api/verification/send` - 发送验证码
- `POST /api/verification/verify` - 验证验证码
- `POST /api/password-reset/request` - 请求密码重置
- `POST /api/password-reset/reset` - 重置密码
- `GET /api/account/profile` - 获取个人信息
- `PUT /api/account/profile` - 更新个人信息
- `PUT /api/account/password` - 修改密码
- `POST /api/account/phone/bind` - 绑定手机号
- `DELETE /api/account` - 注销账号

### 核心功能
- `GET /health` - 健康检查（简单）
- `GET /api/health` - 健康检查（详细）
- `POST /api/chat` - 对话
- `POST /api/report/generate` - 报告生成
- `POST /api/business-plan/*` - 商业计划书生成
- `POST /api/vision/analyze` - 图片分析
- `POST /api/demo-generator/*` - Demo生成/预览/下载
- `POST /api/pdf-export/report` - PDF导出
- `POST /api/share/*` - 分享链接
- `GET /api/agents/*` - 数字员工
- `GET /api/projects/*` - 项目管理
- `POST /api/workflow/*` - 工作流执行
- `POST /api/workflow-recommendation/*` - 工作流推荐

## 📁 项目结构

```
ThinkCraft/
├── index.html                    # 主应用入口
├── OS.html                       # 产品介绍页
├── login.html                    # 登录页
├── register.html                 # 注册页
├── docker-compose.yml            # Docker编排配置
├── docker.sh                     # Docker管理脚本
├── EXECUTION_PLAN.md             # 项目执行计划
├── DOCKER.md                     # Docker详细指南
├── DOCKER_QUICKSTART.md          # Docker快速开始
├── frontend/
│   ├── Dockerfile                # 前端Docker镜像
│   ├── nginx.conf                # Nginx配置
│   ├── css/                      # 样式文件
│   ├── js/                       # 旧版JS（逐步迁移中）
│   └── src/
│       ├── features/             # DDD功能模块
│       │   ├── chat/             # 对话模块
│       │   ├── agents/           # 数字员工模块
│       │   ├── auth/             # 认证模块
│       │   ├── projects/         # 项目管理模块
│       │   ├── business-plan/    # 商业计划书模块
│       │   ├── demo-generator/   # Demo生成模块
│       │   ├── report/           # 报告模块
│       │   ├── pdf-export/       # PDF导出模块
│       │   ├── share/            # 分享模块
│       │   ├── vision/           # 视觉分析模块
│       │   ├── workflow/         # 工作流模块
│       │   └── workflow-recommendation/  # 工作流推荐模块
│       └── shared/               # 共享基础设施
├── backend/
│   ├── Dockerfile                # 后端Docker镜像
│   ├── server.js                 # 服务入口
│   ├── routes/                   # 路由
│   ├── config/                   # 配置
│   ├── scripts/                  # 数据迁移脚本
│   │   ├── migrate-to-mongodb.js
│   │   ├── backup-data.js
│   │   ├── restore-data.js
│   │   └── verify-migration.js
│   └── src/
│       ├── features/             # DDD功能模块
│       │   ├── auth/             # 认证模块（含账号管理）
│       │   ├── chat/             # 对话模块
│       │   ├── agents/           # 数字员工模块
│       │   └── ...               # 其他模块
│       ├── shared/               # 共享领域模型
│       └── infrastructure/       # 基础设施
│           ├── cache/            # Redis缓存
│           └── sms/              # SMS服务
├── config/                       # 提示词配置
│   ├── system-prompts.js
│   ├── report-prompts.js
│   └── README.md
├── docs/                         # 文档
│   ├── ARCHITECTURE.md           # 架构文档
│   ├── MVP.md                    # MVP文档
│   └── README.md
├── scripts/                      # 工具脚本
│   ├── cleanup-node-modules.js
│   └── create-frontend-ddd-module.sh
├── css/                          # 全局样式
├── icons/                        # 图标资源
├── manifest.json                 # PWA配置
└── service-worker.js             # Service Worker
```

## 🏗️ 技术架构

### 架构模式
- **DDD（领域驱动设计）**：清晰的分层架构，领域模型驱动
- **CQRS**：命令查询职责分离
- **事件驱动**：领域事件支持

### 技术栈
- **前端**：原生JavaScript + DDD架构
- **后端**：Node.js + Express + DDD架构
- **数据库**：MongoDB（主数据库）+ Redis（缓存）
- **AI服务**：DeepSeek API
- **容器化**：Docker + Docker Compose
- **测试**：Jest（单元测试 + 集成测试）
- **代码质量**：ESLint + Prettier + Husky + lint-staged

### 数据库
- **MongoDB**：用户数据、对话历史、项目数据等
- **Redis**：会话缓存、验证码缓存、频率限制等

详见：[架构文档](docs/ARCHITECTURE.md)

## 🧪 开发与测试

### 代码规范

```bash
# 代码检查
npm run lint

# 自动修复
npm run lint:fix

# 格式化
npm run format

# 格式检查
npm run format:check
```

### 测试

```bash
cd backend

# 运行所有测试
npm test

# 监听模式
npm run test:watch

# 测试覆盖率
npm run test:coverage
```

当前测试覆盖率：7.61%（Auth领域层完全覆盖）

### Git提交

项目配置了Husky + lint-staged，每次提交前会自动：
- 运行ESLint检查和修复
- 运行Prettier格式化
- 确保代码质量

## 📚 文档

- [执行计划](EXECUTION_PLAN.md) - 项目执行计划和进度跟踪
- [架构文档](docs/ARCHITECTURE.md) - 系统架构设计
- [MVP文档](docs/MVP.md) - MVP功能边界
- [Docker快速开始](DOCKER_QUICKSTART.md) - Docker部署快速指南
- [Docker详细指南](DOCKER.md) - Docker部署详细文档
- [数据库文档](backend/DATABASE.md) - 数据库集成指南
- [数据迁移文档](backend/scripts/README.md) - 数据迁移工具文档

## 📊 项目进度

当前进度：**75%**

- ✅ 阶段1：代码质量修复（100%）
- ✅ 阶段2：测试体系建立（100%）
- ✅ 阶段3：数据库集成（100%）
- ✅ 阶段4：前端DDD重构（85%+）
- ✅ 阶段5：账号体系完善（100%）
- ✅ 阶段6：Docker容器化（100%）
- ⏳ 阶段7：CI/CD流程（进行中）

详见：[执行计划](EXECUTION_PLAN.md)

## 🔒 安全特性

- **JWT认证**：基于Token的无状态认证
- **密码加密**：bcrypt加密存储
- **手机验证码**：支持注册、登录、重置密码
- **频率限制**：防止API滥用
- **CORS配置**：严格的跨域控制
- **输入验证**：防止XSS和SQL注入
- **安全响应头**：Helmet中间件

## 🚧 已知限制

- 前端部分模块仍在从旧架构迁移到DDD架构（85%完成）
- 测试覆盖率需要提升（当前7.61%）
- CI/CD流程尚未完成

## 🛠️ 故障排查

### Docker相关问题
参见：[Docker详细指南 - 故障排查](DOCKER.md#故障排查)

### 数据库相关问题
参见：[数据库文档 - 故障排查](backend/DATABASE.md#故障排查)

### 常见问题

**Q: 前端无法连接后端？**
A: 检查后端是否启动，CORS配置是否正确，前端API地址是否正确。

**Q: MongoDB连接失败？**
A: 确保MongoDB服务已启动，连接字符串正确。使用Docker部署时会自动启动MongoDB。

**Q: 验证码收不到？**
A: 默认使用mock模式，验证码会打印在后端日志中。生产环境需配置真实的SMS服务。

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License

---

**ThinkCraft - 让每个想法都值得被认真对待**
