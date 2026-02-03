# ThinkCraft 开发者文档

欢迎来到 ThinkCraft 开发者文档！本文档旨在帮助开发者快速了解项目架构、模块设计和开发流程。

## 📚 文档导航

### 核心文档

- [架构设计](./architecture.md) - 系统整体架构和设计理念
- [快速开始](./guides/getting-started.md) - 快速上手指南
- [测试指南](./TESTING.md) - 单元测试和集成测试

### 模块文档

- [聊天模块](./modules/chat.md) - 对话管理和消息处理
- [报告模块](./modules/report.md) - 报告生成和查看
- [工具函数](./modules/utils.md) - 通用工具函数

### API文档

- [MessageHandler](./api/message-handler.md) - 消息处理器
- [ReportGenerator](./api/report-generator.md) - 报告生成器
- [ChatManager](./api/chat-manager.md) - 对话管理器

### 开发指南

- [添加新功能](./guides/adding-features.md) - 如何添加新功能
- [测试指南](./guides/testing.md) - 编写和运行测试
- [部署指南](./guides/deployment.md) - 部署到生产环境

## 🏗️ 项目概览

ThinkCraft 是一个基于 AI 的创意思考和协作平台，采用模块化架构设计，将功能拆分为独立的模块，便于维护和扩展。

### 核心特性

- **模块化架构** - 功能模块独立，职责清晰
- **完整的测试覆盖** - Jest + Testing Library
- **详细的文档** - JSDoc + Markdown
- **响应式设计** - 支持桌面端和移动端

### 技术栈

- **前端框架**: 原生 JavaScript (ES6+)
- **测试框架**: Jest + Testing Library
- **构建工具**: 无需构建，直接运行
- **代码规范**: ESLint

## 📊 项目统计

| 指标       | 数值       |
| ---------- | ---------- |
| 总代码行数 | ~15,000 行 |
| 模块数量   | 15 个      |
| 测试覆盖率 | 7.61%+     |
| 文档完整度 | 80%+       |

## 🚀 快速开始

```bash
# 克隆项目
git clone <repository-url>

# 安装依赖
npm install

# 运行测试
npm test

# 启动开发服务器
npm start
```

## 📖 学习路径

### 新手入门

1. 阅读[架构设计](./architecture.md)了解整体结构
2. 查看[快速开始](./guides/getting-started.md)搭建开发环境
3. 学习[聊天模块](./modules/chat.md)了解核心功能

### 进阶开发

1. 阅读[添加新功能](./guides/adding-features.md)学习开发流程
2. 查看[测试指南](./guides/testing.md)编写单元测试
3. 参考[API文档](./api/)了解各模块接口

### 高级主题

1. 研究[架构设计](./architecture.md)中的设计模式
2. 优化性能和代码质量
3. 贡献代码和文档

## 🤝 贡献指南

我们欢迎所有形式的贡献！

- 报告 Bug
- 提出新功能建议
- 提交代码改进
- 完善文档

## 📝 更新日志

查看 [OPTIMIZATION_PLAN.md](../OPTIMIZATION_PLAN.md) 了解最新的优化进展。

## 📧 联系我们

如有问题或建议，请通过以下方式联系：

- 提交 Issue
- 发送邮件
- 加入讨论组

---

**最后更新**: 2026-01-30
**文档版本**: v1.0
