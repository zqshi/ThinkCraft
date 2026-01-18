# ThinkCraft - 创意验证操作系统

ThinkCraft是一个AI驱动的创意验证与团队协同平台，采用DDD架构设计。

## 快速开始

详见 [docs/SETUP.md](docs/SETUP.md)

## 项目文档

- [系统架构](docs/ARCHITECTURE.md) - DDD领域模型和技术架构
- [业务流程](docs/BUSINESS-FLOW.md) - 业务流程说明
- [战略演进历史](docs/strategy/) - 产品定位的思考过程

## 项目结构

```
ThinkCraft/
├── backend/          # 后端服务（Express + DDD）
│   ├── domains/      # 8个业务领域
│   │   ├── agent/            # 数字员工领域
│   │   ├── collaboration/    # 协同编排领域
│   │   ├── businessPlan/     # 商业计划领域
│   │   ├── demo/             # Demo生成领域
│   │   └── pdfExport/        # PDF导出领域
│   ├── routes/       # API路由层
│   ├── middleware/   # 中间件
│   └── server.js     # 服务入口
├── frontend/         # 前端应用（Vanilla JS）
│   ├── js/
│   │   ├── core/             # 核心模块
│   │   ├── components/       # UI组件
│   │   ├── handlers/         # 事件处理
│   │   ├── modules/          # 功能模块
│   │   └── infrastructure/   # 基础设施
│   │       ├── state/        # 状态管理
│   │       └── storage/      # 数据持久化
│   └── css/          # 样式
├── config/           # 应用配置
│   └── system-prompts.js  # AI提示词配置
├── docs/             # 项目文档
│   ├── ARCHITECTURE.md    # 系统架构
│   ├── BUSINESS-FLOW.md   # 业务流程
│   ├── SETUP.md           # 设置指南
│   └── strategy/          # 战略演进历史
└── tests/            # 测试
    ├── unit/         # 单元测试
    ├── e2e/          # 端到端测试
    └── fixtures/     # 测试数据
```

## 技术栈

- **后端**: Node.js + Express + DDD架构
- **前端**: Vanilla JavaScript + 事件驱动架构
- **AI**: DeepSeek API
- **存储**: localStorage + IndexedDB（当前）→ PostgreSQL（规划中）
- **日志**: Console（当前）→ Winston（规划中）

## 核心功能

- ✅ **创意验证**：通过苏格拉底式提问引导用户完善创意
- ✅ **AI对话**：基于DeepSeek的智能对话系统
- ✅ **报告生成**：生成创意分析报告
- ✅ **数字员工**：雇佣和管理AI数字员工
- ✅ **智能协同**：多Agent协同工作流编排
- ✅ **商业计划书**：自动生成商业计划书
- ✅ **Demo生成**：生成可交互的产品Demo

## 开发

### 安装依赖
```bash
cd backend
npm install
```

### 启动后端服务
```bash
cd backend
npm start
```

后端服务将在 `http://localhost:3000` 启动

### 访问前端
直接用浏览器打开 `index.html` 或使用静态服务器：
```bash
python3 -m http.server 8080
```

然后访问 `http://localhost:8080`

## 运行测试
```bash
# 查看tests/目录了解测试结构
cd tests/unit/
node StateManager.test.js
```

## 当前阶段

项目正处于 **Phase 2 完成 → Phase 3（完整DDD重构）** 的过渡阶段：

- ✅ Phase 1: 前端基础设施重构（StateManager、StorageManager）
- ✅ Phase 2: 后端Domain重构（Agent、Collaboration等5个Domain）
- 🔄 Phase 3: 计划中（详见 `docs/ARCHITECTURE.md`）
  - 添加PostgreSQL数据库
  - 完善所有Domain的Repository层
  - 前端Service层重构
  - 清理Mock数据

## 贡献

详见 `docs/ARCHITECTURE.md` 了解项目架构和开发规范。

## License

MIT
