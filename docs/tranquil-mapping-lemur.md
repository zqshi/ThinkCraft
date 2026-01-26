# ThinkCraft DDD架构重构计划（数字员工部分采用AgentScope）

## 项目现状分析

### 后端现状

- 已初步实施DDD架构，目录结构按功能模块划分
- 每个功能模块包含：application、domain、interfaces三层
- 路由文件已简化为适配层，调用对应的DDD模块
- 主要功能模块：agents、auth、business-plan、chat、demo-generator、pdf-export、projects、report、share、vision、workflow

### 前端现状

- 采用传统MVC模式，按功能类型划分目录
- 目录结构：components、core、handlers、modules、utils、boot
- 全局状态管理通过app-state.js集中管理
- 业务逻辑分散在handlers和modules中

### 产品目标分析

- ThinkCraft是一个AI驱动的项目协作平台
- 核心功能包括：对话、项目管理、商业计划生成、工作流推荐等
- 数字员工（Agent）是重要组成部分，需要支持不同职能的Agent扩展
- 需要保持前后端样式不变，确保用户体验一致性

## DDD重构目标

### 总体目标

1. 确保前后端样式不变，保持用户体验一致
2. 建立清晰的领域模型，降低模块耦合度
3. 提高代码可维护性和可扩展性
4. 统一前后端架构模式，便于团队协作
5. 数字员工部分采用AgentScope，支持多职能Agent扩展

### 具体目标

1. 后端：完善现有DDD实现，统一规范
2. 前端：从MVC模式重构为DDD模式
3. 建立共享的领域语言（Ubiquitous Language）
4. 实现前后端领域模型对齐
5. 数字员工模块集成AgentScope，支持不同职能Agent

## 重构方案

### 后端重构（DDD + AgentScope for Agents）

#### 1. 统一领域模型规范（通用部分）

- 定义统一的实体（Entity）基类
- 定义值对象（Value Object）基类
- 建立领域事件（Domain Event）机制
- 统一聚合根（Aggregate Root）设计

#### 2. 数字员工模块特殊设计（AgentScope集成）

- 仅在agents模块引入AgentScope框架
- 定义Agent基类，继承自Entity并集成AgentScope特性
- 支持不同职能Agent的插件化扩展
- 实现Agent生命周期管理（创建、运行、销毁）
- 支持Agent间的消息通信和协作

#### 3. 完善各层职责（通用部分）

- **领域层（Domain）**：核心业务逻辑、实体、值对象、领域服务
- **应用层（Application）**：用例实现、事务控制、DTO转换
- **接口层（Interfaces）**：REST API、请求/响应DTO、异常处理

#### 4. 数字员工模块特殊职责

- **Agent领域层**：定义不同职能Agent的领域模型和行为，集成AgentScope
- **Agent应用层**：协调多Agent协作，管理Agent生命周期
- **Agent接口层**：提供Agent管理API，封装AgentScope调用

#### 5. 基础设施层优化（通用部分）

- 统一AI服务调用接口，支持多模型切换
- 建立消息总线，支持领域事件
- 实现领域事件发布/订阅机制

#### 6. 数字员工基础设施

- 集成AgentScope框架，提供Agent运行时环境
- 建立Agent通信机制（仅agents模块内部）
- 实现Agent生命周期管理（创建、运行、销毁）
- 支持不同职能Agent的插件化扩展

### 前端重构（MVC → DDD）

#### 1. 新目录结构

```
frontend/src/
├── features/              # 功能模块（对应后端领域）
│   ├── chat/             # 对话功能
│   │   ├── domain/       # 领域模型
│   │   ├── application/  # 应用服务（用例实现）
│   │   ├── infrastructure/ # 基础设施（API、存储）
│   │   └── presentation/   # 表示层（组件）
│   ├── agents/           # 数字员工（特殊处理）
│   ├── projects/
│   └── ...
├── shared/               # 共享模块
│   ├── domain/          # 共享领域模型
│   ├── infrastructure/  # 共享基础设施
│   └── kernel/          # 核心工具
└── app/                 # 应用启动
    └── bootstrap.js     # 应用初始化
```

#### 2. 领域层设计

- 实体：Chat、Message、Project等核心业务实体
- 值对象：ChatStatus、MessageType等业务枚举
- 领域服务：对话逻辑、状态管理等核心业务规则
- 领域事件：消息发送、状态变更等业务事件

#### 3. 数字员工前端特殊处理

- 通过API与后端AgentScope服务通信
- 不直接在前端实现Agent逻辑
- 提供Agent状态展示和交互界面
- 支持Agent配置和触发操作

#### 4. 应用层设计

- 用例服务：StartChat、SendMessage等业务用例
- 应用状态管理：集中管理应用状态
- DTO转换：前后端数据格式转换

#### 5. 基础设施层

- API客户端：统一的后端调用接口
- 存储服务：localStorage/sessionStorage封装
- 事件总线：组件间通信、领域事件传递

#### 6. 表示层

- 纯React组件：展示数据和接收用户输入
- 视图模型：为视图定制的数据模型
- 组件通信：通过属性传递和事件回调

## 实施步骤

### 第一阶段：后端DDD完善（1-2周）

1. 建立统一的领域模型基类（通用部分）
2. 重构chat模块作为示例，展示DDD模式
3. 统一异常处理规范
4. 在agents模块集成AgentScope框架

### 第二阶段：前端DDD重构（2-3周）

1. 建立新的目录结构
2. 重构核心chat功能，展示DDD模式
3. 建立API调用抽象层
4. 实现Agent展示界面（通过API与后端AgentScope通信）

### 第三阶段：功能模块迁移（3-4周）

1. 按优先级迁移其他功能模块（除agents外）
2. 前后端领域模型对齐
3. 统一错误处理
4. 完善Agent功能，支持不同职能扩展
5. 完善单元测试

### 第四阶段：优化完善（1-2周）

1. 性能优化
2. 代码审查和重构
3. 文档完善
4. 团队培训

## 关键设计模式

### 1. DDD核心模式

- **实体（Entity）**：具有唯一标识的领域对象
- **值对象（Value Object）**：描述领域概念的无状态对象
- **聚合根（Aggregate Root）**：维护业务一致性的边界
- **领域服务（Domain Service）**：处理跨实体的业务逻辑
- **领域事件（Domain Event）**：记录领域中的重要业务事件
- **仓库（Repository）**：提供领域对象的持久化抽象

### 2. 数字员工特殊模式（仅agents模块）

- **Agent模式**：基于AgentScope的多智能体协作
- **插件模式**：支持不同职能Agent的动态加载
- **消息模式**：Agent间的异步通信机制
- **生命周期管理**：Agent的创建、运行、销毁管理

## 风险与对策

### 技术风险

1. **样式兼容性问题**：建立样式回归测试
2. **AgentScope集成复杂性**：充分测试，逐步集成
3. **性能下降**：建立性能监控基准，优化关键路径
4. **前后端通信复杂性**：定义清晰的API契约

### 项目风险

1. **开发周期延长**：采用增量重构，保持功能可用
2. **团队协作问题**：建立代码规范和审查流程
3. **业务需求变更**：保持与业务沟通，及时调整方案
4. **新技术学习成本**：提供充分的培训和支持

## 验收标准

1. 所有功能保持原有样式和行为
2. 代码结构清晰，符合DDD原则（通用模块）
3. 数字员工模块成功集成AgentScope
4. 新增功能开发效率提升30%
5. 代码可维护性评分提升（SonarQube等指标）
6. 支持不同职能Agent的扩展
7. 团队满意度≥80%

## 关键文件清单

### 后端关键文件

- `backend/src/shared/domain/entity.base.js`（通用实体基类）
- `backend/src/shared/domain/value-object.base.js`
- `backend/src/shared/domain/domain-event.base.js`
- `backend/src/features/chat/domain/chat.aggregate.js`
- `backend/src/features/chat/application/chat.service.js`
- `backend/src/features/agents/domain/agent.aggregate.js`（AgentScope集成）
- `backend/src/features/agents/infrastructure/agent-scope-adapter.js`

### 前端关键文件

- `frontend/src/shared/domain/entity.base.js`
- `frontend/src/shared/kernel/event-bus.js`
- `frontend/src/features/chat/domain/chat.aggregate.js`
- `frontend/src/features/chat/application/chat.use-case.js`
- `frontend/src/shared/infrastructure/api-client.js`
- `frontend/src/features/agents/presentation/agent-dashboard.jsx`

## 后续规划

1. 建立领域模型文档库
2. 实施持续集成/部署
3. 建立监控和告警机制
4. 定期架构评审和优化
5. 基于AgentScope扩展更多职能Agent
6. 考虑Agent的分布式部署方案
7. 建立Agent能力市场和插件机制
