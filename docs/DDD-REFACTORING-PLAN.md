# ThinkCraft DDD 重构方案

## 一、领域分析与限界上下文识别

### 1.1 核心业务领域

基于代码分析，ThinkCraft是一个**AI辅助的数字化工作平台**，核心价值是通过AI Agent协作完成复杂的创业和开发任务。

### 1.2 识别的限界上下文（Bounded Contexts）

```
┌─────────────────────────────────────────────────────────────┐
│                    ThinkCraft Platform                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  Conversation │  │   Agent      │  │  Generation  │    │
│  │   Context    │  │   Context    │  │   Context    │    │
│  │   (对话域)    │  │  (数字员工域) │  │   (生成域)    │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Inspiration  │  │  Knowledge   │  │   Export     │    │
│  │   Context    │  │   Context    │  │   Context    │    │
│  │  (灵感域)     │  │  (知识库域)   │  │  (导出域)     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                             │
│  ┌────────────────────────────────────────────────┐       │
│  │        Infrastructure Layer (基础设施层)         │       │
│  │  - Storage (IndexedDB Repository)              │       │
│  │  - API Client (DeepSeek Integration)           │       │
│  │  - Device/Gesture Detection                    │       │
│  └────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

---

## 二、各限界上下文的详细设计

### 2.1 Conversation Context（对话域）

**职责**：管理用户与AI的对话交互，维护对话历史和上下文。

**聚合根**：
- `Chat`（对话会话）

**实体**：
- `Message`（消息）
- `UserData`（用户数据收集）

**值对象**：
- `ConversationStep`（对话步骤）
- `MessageType`（消息类型：user/assistant/system）

**领域服务**：
- `ChatService`：创建对话、发送消息、维护历史
- `MessageFormatter`：消息格式化和渲染

**当前代码位置**：
- Frontend: `chat-manager.js` (412行) ✅ 职责较清晰
- Frontend: `message-handler.js` (263行) ✅ 职责较清晰
- Frontend: `input-handler.js` (67行) ✅ 职责较清晰
- Backend: `routes/chat.js` (89行) ✅ 轻量级路由

**拆分建议**：
```
frontend/js/domains/conversation/
├── models/
│   ├── Chat.js              # 聚合根
│   ├── Message.js           # 实体
│   └── ConversationStep.js  # 值对象
├── services/
│   ├── ChatService.js       # 对话业务逻辑
│   └── MessageFormatter.js  # 消息格式化
├── repositories/
│   └── ChatRepository.js    # 数据访问（从storage-manager拆出）
└── index.js                 # 模块导出

backend/routes/chat.js       # 保持现状，无需拆分
```

---

### 2.2 Agent Context（数字员工域）

**职责**：管理数字员工的雇佣、任务分配、工作协同和薪资管理。

**聚合根**：
- `Agent`（数字员工）
- `Team`（团队）

**实体**：
- `AgentTask`（任务）
- `WorkSession`（工作会话）

**值对象**：
- `AgentType`（员工类型：产品、设计、开发等）
- `Skill`（技能）
- `Salary`（薪资）
- `AgentLevel`（级别：junior/mid/senior）

**领域服务**：
- `AgentHireService`：雇佣逻辑
- `TaskAssignmentService`：任务分配算法
- `SalaryCalculationService`：薪资计算

**当前代码位置**：
- Backend: `routes/agents.js` (557行) ❌ **严重问题：职责混乱**
  - 包含：Agent定义（数据）+ 雇佣逻辑 + 任务分配 + 薪资计算 + API路由
  - 违反单一职责原则

**拆分建议**：
```
backend/domains/agent/
├── models/
│   ├── Agent.js             # 聚合根（从agents.js拆出AGENT_TYPES）
│   ├── AgentTask.js         # 任务实体
│   └── valueObjects/
│       ├── AgentType.js
│       ├── Skill.js
│       └── Salary.js
├── services/
│   ├── AgentHireService.js  # 雇佣逻辑
│   ├── TaskAssignmentService.js  # 任务分配
│   └── SalaryService.js     # 薪资计算
├── repositories/
│   └── AgentRepository.js   # 数据访问
└── index.js

backend/routes/agents.js     # 仅保留路由和控制器逻辑（<100行）
```

**预期效果**：
- `agents.js` 从 557行 → ~80行（仅路由）
- 业务逻辑分离到 services（每个文件 100-200行）
- 模型定义独立（Agent.js ~150行）

---

### 2.3 Generation Context（生成域）

**职责**：管理商业计划书、提案、报告等文档的生成流程。

**聚合根**：
- `GenerationProject`（生成项目）

**实体**：
- `Chapter`（章节）
- `GenerationStep`（生成步骤）

**值对象**：
- `GenerationType`（business-plan/proposal/report）
- `GenerationStatus`（idle/selecting/generating/completed）
- `Progress`（进度：current/total/percentage）

**领域服务**：
- `BusinessPlanService`：商业计划书生成编排
- `ChapterGenerationService`：章节生成逻辑
- `AgentCoordinationService`：Agent协调（与Agent Context交互）

**当前代码位置**：
- Frontend: `state-manager.js` (965行) ❌ **严重问题：状态混合**
  - 包含：对话状态 + 生成状态 + Demo状态 + 灵感状态 + 知识库状态 + 设置
  - 违反单一职责，难以测试和维护
- Frontend: `business-plan-generator.js` (322行) ✅ 职责较清晰
- Frontend: `agent-progress.js` (306行) ✅ UI组件职责清晰
- Backend: `routes/business-plan.js` (437行) ⚠️ 可优化
- Backend: `routes/report.js` (147行) ✅ 可接受

**拆分建议**：

**前端拆分**：
```
frontend/js/domains/generation/
├── models/
│   ├── GenerationProject.js
│   ├── Chapter.js
│   └── valueObjects/
│       ├── GenerationType.js
│       └── GenerationStatus.js
├── services/
│   ├── BusinessPlanService.js  # 从business-plan-generator.js重构
│   ├── ReportService.js
│   └── ChapterService.js
├── state/
│   └── GenerationState.js      # 从state-manager.js拆出
├── components/
│   └── AgentProgress.js        # 保持现状
└── index.js
```

**后端拆分**：
```
backend/domains/generation/
├── models/
│   ├── BusinessPlan.js         # 商业计划书模型
│   └── Chapter.js
├── services/
│   ├── BusinessPlanService.js  # 核心逻辑
│   ├── TemplateService.js      # 模板管理
│   └── AIOrchestrationService.js  # AI调用编排
└── index.js

backend/routes/business-plan.js # 重构为薄控制器（<100行）
backend/routes/report.js        # 保持现状
```

---

### 2.4 Demo Context（Demo生成域）

**职责**：根据需求生成Web/App/小程序等Demo代码。

**聚合根**：
- `DemoProject`

**实体**：
- `TechStack`（技术栈）
- `Feature`（功能特性）
- `CodeFile`（代码文件）

**值对象**：
- `DemoType`（web/app/miniapp/admin）
- `DemoStatus`（type-analysis → prd → architecture → code → test → deploy）

**领域服务**：
- `DemoGenerationService`：Demo生成编排
- `CodeGenerationService`：代码生成逻辑
- `ArchitectureDesignService`：架构设计

**当前代码位置**：
- Frontend: `state-manager.js` (demo状态部分) ❌ 混合在大文件中
- Backend: `routes/demo-generator.js` (405行) ⚠️ 可优化

**拆分建议**：
```
frontend/js/domains/demo/
├── models/
│   ├── DemoProject.js
│   └── valueObjects/
│       ├── DemoType.js
│       └── DemoStatus.js
├── state/
│   └── DemoState.js           # 从state-manager.js拆出
└── index.js

backend/domains/demo/
├── models/
│   ├── DemoProject.js
│   └── CodeFile.js
├── services/
│   ├── DemoGenerationService.js
│   ├── CodeGenerationService.js
│   └── PackageService.js      # 文件打包（使用archiver）
└── index.js

backend/routes/demo-generator.js  # 重构为薄控制器（<100行）
```

---

### 2.5 Inspiration Context（灵感域）

**职责**：捕捉、管理和追踪灵感想法。

**聚合根**：
- `Inspiration`

**实体**：
- `InspirationItem`

**值对象**：
- `InspirationStatus`（unprocessed/processing/completed）
- `InspirationCategory`
- `InspirationMode`（full/quick）

**领域服务**：
- `InspirationCaptureService`：灵感捕捉
- `InspirationProcessingService`：灵感处理和转化

**当前代码位置**：
- Frontend: `state-manager.js` (inspiration状态部分) ❌ 混合在大文件中
- Storage: `storage-manager.js` (inspirations store部分)

**拆分建议**：
```
frontend/js/domains/inspiration/
├── models/
│   ├── Inspiration.js
│   └── valueObjects/
│       ├── InspirationStatus.js
│       └── Category.js
├── services/
│   ├── CaptureService.js
│   └── ProcessingService.js
├── state/
│   └── InspirationState.js    # 从state-manager.js拆出
├── repositories/
│   └── InspirationRepository.js  # 从storage-manager.js拆出
└── index.js
```

---

### 2.6 Knowledge Context（知识库域）

**职责**：管理项目文档、全局知识、标签分类和搜索。

**聚合根**：
- `KnowledgeItem`
- `Project`

**实体**：
- `Document`
- `Tag`

**值对象**：
- `KnowledgeType`（文档类型）
- `Scope`（project/global）
- `ViewMode`（project/global/aggregated）

**领域服务**：
- `KnowledgeOrganizationService`：知识组织
- `KnowledgeSearchService`：知识搜索

**当前代码位置**：
- Frontend: `state-manager.js` (knowledge状态部分) ❌ 混合在大文件中
- Storage: `storage-manager.js` (knowledge store部分)

**拆分建议**：
```
frontend/js/domains/knowledge/
├── models/
│   ├── KnowledgeItem.js
│   ├── Project.js
│   └── valueObjects/
│       ├── KnowledgeType.js
│       └── Scope.js
├── services/
│   ├── OrganizationService.js
│   └── SearchService.js
├── state/
│   └── KnowledgeState.js      # 从state-manager.js拆出
├── repositories/
│   └── KnowledgeRepository.js # 从storage-manager.js拆出
└── index.js
```

---

### 2.7 Export Context（导出域）

**职责**：处理PDF导出、分享链接生成等导出功能。

**聚合根**：
- `ExportTask`

**实体**：
- `PDFDocument`
- `ShareLink`

**值对象**：
- `ExportFormat`（pdf/html/markdown）
- `SharePermission`

**领域服务**：
- `PDFExportService`：PDF生成
- `ShareService`：分享链接管理

**当前代码位置**：
- Backend: `routes/pdf-export.js` (403行) ⚠️ 可优化
- Backend: `routes/share.js` (216行) ✅ 职责清晰

**拆分建议**：
```
backend/domains/export/
├── models/
│   ├── PDFDocument.js
│   └── ShareLink.js
├── services/
│   ├── PDFExportService.js    # 从pdf-export.js拆出业务逻辑
│   └── ShareService.js         # 从share.js拆出业务逻辑
└── index.js

backend/routes/pdf-export.js   # 重构为薄控制器（<100行）
backend/routes/share.js         # 保持现状或小优化
```

---

## 三、Infrastructure Layer（基础设施层）

### 3.1 Storage Manager 拆分

**当前问题**：
- `storage-manager.js` (1021行) 管理6个对象存储
- 违反单一职责，测试困难

**拆分方案**：
```
frontend/js/infrastructure/storage/
├── core/
│   ├── IndexedDBClient.js     # IndexedDB基础封装
│   └── BaseRepository.js      # Repository基类
├── repositories/
│   ├── ChatRepository.js      # chats存储（从storage-manager拆出）
│   ├── ReportRepository.js    # reports存储
│   ├── DemoRepository.js      # demos存储
│   ├── InspirationRepository.js  # inspirations存储
│   ├── KnowledgeRepository.js # knowledge存储
│   └── SettingsRepository.js  # settings存储
└── index.js                   # 统一导出（StorageManager作为Facade）
```

**预期效果**：
- 每个Repository 100-150行
- 职责单一，易于测试
- 保持向后兼容（通过Facade模式）

### 3.2 State Manager 拆分

**当前问题**：
- `state-manager.js` (965行) 管理6个领域状态
- 状态耦合，难以独立演进

**拆分方案**：
```
frontend/js/infrastructure/state/
├── core/
│   ├── StateStore.js          # 状态存储基类（观察者模式）
│   └── EventBus.js            # 事件总线（跨域通信）
├── stores/
│   ├── ConversationState.js   # 对话状态（从state-manager拆出）
│   ├── GenerationState.js     # 生成状态
│   ├── DemoState.js           # Demo状态
│   ├── InspirationState.js    # 灵感状态
│   ├── KnowledgeState.js      # 知识库状态
│   └── SettingsState.js       # 设置状态
└── index.js                   # GlobalStateManager（Facade）
```

**预期效果**：
- 每个State 100-150行
- 独立订阅和更新
- 保持向后兼容

### 3.3 API Client

**当前状态**：
- `api-client.js` (391行) ✅ 职责清晰，无需拆分

**优化建议**：
```
frontend/js/infrastructure/api/
├── APIClient.js               # 保持现状
├── DeepSeekClient.js          # 专门的DeepSeek API封装（可选）
└── interceptors/
    ├── AuthInterceptor.js     # 未来扩展：认证拦截器
    └── RetryInterceptor.js    # 重试逻辑
```

### 3.4 Device & Gesture

**当前状态**：
- `device-detector.js` (463行) ✅ 职责清晰，无需拆分
- `gesture-handler.js` (413行) ✅ 职责清晰，无需拆分

**建议**：
```
frontend/js/infrastructure/device/
├── DeviceDetector.js          # 保持现状
└── GestureHandler.js          # 保持现状
```

---

## 四、分层架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                       │
│  - frontend/js/components/ (UI组件)                         │
│  - frontend/js/handlers/ (用户交互处理)                     │
│  - backend/routes/ (API控制器)                              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│  - frontend/js/domains/*/services/ (应用服务)               │
│  - backend/domains/*/services/ (应用服务)                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Domain Layer                           │
│  - frontend/js/domains/*/models/ (领域模型)                 │
│  - backend/domains/*/models/ (领域模型)                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Infrastructure Layer                      │
│  - frontend/js/infrastructure/ (基础设施)                   │
│    ├── storage/ (数据持久化)                                │
│    ├── state/ (状态管理)                                    │
│    ├── api/ (API客户端)                                     │
│    └── device/ (设备检测)                                   │
│  - backend/config/ (配置)                                   │
│  - backend/middleware/ (中间件)                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 五、重构优先级与执行计划

### 阶段1：基础设施层拆分（P0 - 高优先级）

**目标**：解决最大的两个文件（storage-manager 1021行，state-manager 965行）

**步骤**：
1. **拆分 storage-manager.js** (估计工作量：3-4小时)
   - 创建 BaseRepository 基类
   - 提取 6个独立的 Repository
   - 保留 StorageManager 作为Facade（向后兼容）
   - 验证所有功能正常

2. **拆分 state-manager.js** (估计工作量：3-4小时)
   - 创建 StateStore 基类
   - 提取 6个独立的 State
   - 保留 GlobalStateManager 作为Facade（向后兼容）
   - 验证所有功能正常

**预期效果**：
- 两个最大文件被拆分成 12个小文件（每个 ~150行）
- 代码可测试性大幅提升
- 保持向后兼容，无破坏性变更

---

### 阶段2：后端领域拆分（P1 - 中优先级）

**目标**：解决后端最大文件（agents.js 557行）和职责混乱问题

**步骤**：
1. **重构 backend/routes/agents.js** (估计工作量：4-5小时)
   - 创建 domains/agent/ 目录结构
   - 提取 Agent 模型和值对象
   - 创建 3个服务类（Hire/TaskAssignment/Salary）
   - 路由层重构为薄控制器

2. **重构 backend/routes/business-plan.js** (估计工作量：3-4小时)
   - 创建 domains/generation/ 目录结构
   - 提取业务逻辑到服务层
   - 路由层重构为薄控制器

3. **重构 backend/routes/demo-generator.js** (估计工作量：3-4小时)
   - 创建 domains/demo/ 目录结构
   - 提取代码生成逻辑
   - 路由层重构为薄控制器

4. **优化 backend/routes/pdf-export.js** (估计工作量：2-3小时)
   - 创建 domains/export/ 目录结构
   - 提取PDF生成逻辑
   - 路由层保持轻量

**预期效果**：
- 4个大路由文件拆分为领域模型
- 每个路由文件 <100行（仅控制器逻辑）
- 业务逻辑可复用和测试

---

### 阶段3：前端领域拆分（P2 - 低优先级）

**目标**：建立清晰的领域边界，支持未来扩展

**步骤**：
1. **创建 domains/conversation/** (估计工作量：2小时)
   - 整合 chat-manager, message-handler, input-handler
   - 提取 Chat 和 Message 模型

2. **创建 domains/generation/** (估计工作量：3小时)
   - 整合 business-plan-generator
   - 提取 GenerationState

3. **创建 domains/inspiration/** (估计工作量：2小时)
   - 提取 InspirationState
   - 创建 InspirationRepository

4. **创建 domains/knowledge/** (估计工作量：2小时)
   - 提取 KnowledgeState
   - 创建 KnowledgeRepository

**预期效果**：
- 前端代码按领域组织
- 模块依赖清晰
- 易于添加新领域

---

### 阶段4：代码质量提升（P3 - 持续优化）

**目标**：提升代码安全性和可维护性

**步骤**：
1. **消除 XSS 风险** (估计工作量：2-3小时)
   - 全局搜索 innerHTML（15处）
   - 替换为 textContent 或 createElement
   - 验证功能正常

2. **清理调试代码** (估计工作量：1-2小时)
   - 移除或统一 console.log（109处）
   - 建立日志级别系统（Logger类）

3. **删除冗余文件** (估计工作量：15分钟)
   - 删除 .backup 文件（600KB）
   - 删除空目录

4. **增加输入验证** (估计工作量：3-4小时)
   - 创建验证中间件
   - 为所有API添加参数校验

---

## 六、重构原则与约束

### 6.1 核心原则

1. **向后兼容优先**
   - 使用Facade模式保留旧接口
   - 渐进式重构，避免"大爆炸"
   - 每次重构后立即验证功能

2. **单一职责**
   - 每个类/模块只有一个变更理由
   - 文件大小控制在 200行以内（除特殊情况）
   - 函数/方法控制在 50行以内

3. **依赖倒置**
   - 高层模块不依赖低层模块，都依赖抽象
   - 使用接口/抽象类定义契约
   - 便于测试和替换实现

4. **开闭原则**
   - 对扩展开放，对修改关闭
   - 使用策略模式、工厂模式等设计模式
   - 新增功能不应修改现有代码

### 6.2 技术约束

1. **不引入新的外部依赖**
   - 保持纯JavaScript（或可选TypeScript）
   - 不引入重框架（React/Vue）- 除非用户明确要求
   - 保持轻量级

2. **保持现有技术栈**
   - Frontend: Vanilla JS + ES6 Modules
   - Backend: Node.js + Express
   - Storage: IndexedDB
   - 不改变现有架构基础

3. **测试友好**
   - 每个服务和模型都应该可独立测试
   - 避免全局状态污染
   - 使用依赖注入

### 6.3 文件组织规范

```
domain/
├── models/               # 领域模型（实体、聚合根）
│   ├── Entity.js
│   └── valueObjects/    # 值对象
│       └── ValueObject.js
├── services/            # 领域服务（业务逻辑）
│   └── DomainService.js
├── repositories/        # 仓储（数据访问）
│   └── Repository.js
├── state/              # 状态管理（仅前端）
│   └── State.js
└── index.js            # 模块统一导出
```

---

## 七、成功指标

### 7.1 代码质量指标

| 指标 | 当前 | 目标 | 衡量方式 |
|------|------|------|----------|
| 最大文件行数 | 1021行 | <300行 | 所有文件扫描 |
| 平均文件行数 | 257行 | <150行 | 所有文件扫描 |
| 大于500行的文件 | 4个 | 0个 | 文件统计 |
| console.log数量 | 109处 | 0处（或统一Logger） | grep搜索 |
| innerHTML使用 | 15处 | 0处 | grep搜索 |
| 函数平均行数 | 未统计 | <30行 | 静态分析 |
| 圈复杂度 | 未统计 | <10 | ESLint插件 |

### 7.2 架构质量指标

| 指标 | 当前 | 目标 |
|------|------|------|
| 模块耦合度 | 高（单文件多职责） | 低（领域隔离） |
| 领域边界清晰度 | 模糊 | 清晰（7个限界上下文） |
| 可测试性 | 低（大量全局状态） | 高（依赖注入） |
| 可维护性评分 | C | A |

### 7.3 业务指标

| 指标 | 说明 |
|------|------|
| 功能完整性 | 重构后所有功能正常运行 |
| 性能无劣化 | 关键操作性能不下降 >5% |
| 向后兼容 | 现有API保持兼容 |
| 可扩展性 | 新增功能模块耗时减少50% |

---

## 八、风险与应对

### 8.1 技术风险

| 风险 | 影响 | 概率 | 应对措施 |
|------|------|------|----------|
| 重构引入Bug | 高 | 中 | 每步验证功能；保留旧代码作为备份 |
| 向后兼容性破坏 | 高 | 低 | 使用Facade模式；充分测试 |
| 过度设计 | 中 | 中 | 遵循YAGNI原则；迭代优化 |
| 性能劣化 | 中 | 低 | 性能基准测试；优化热路径 |

### 8.2 项目风险

| 风险 | 影响 | 概率 | 应对措施 |
|------|------|------|----------|
| 重构时间超预期 | 中 | 中 | 分阶段执行；每阶段独立交付 |
| 团队学习成本 | 低 | 高 | 文档完善；代码注释；知识分享 |
| 需求变更冲突 | 中 | 中 | 优先重构稳定模块；保持灵活性 |

---

## 九、总结

### 9.1 当前架构问题

1. **大文件问题**：2个超过900行的文件（storage-manager, state-manager）
2. **职责混乱**：后端路由文件混合数据定义和业务逻辑
3. **领域边界模糊**：前端状态管理混合多个领域
4. **代码质量问题**：XSS风险、调试代码未清理、缺少输入验证

### 9.2 DDD重构价值

1. **清晰的领域边界**：7个限界上下文，职责明确
2. **可维护性提升**：小文件、单一职责、易于理解
3. **可测试性提升**：依赖注入、领域服务独立测试
4. **可扩展性提升**：新增领域模块成本降低
5. **团队协作提升**：不同团队成员可并行开发不同领域

### 9.3 重构路径

```
阶段1 (P0) → 基础设施层拆分 → 解决最大痛点
阶段2 (P1) → 后端领域拆分 → 建立清晰架构
阶段3 (P2) → 前端领域拆分 → 完善领域模型
阶段4 (P3) → 代码质量提升 → 持续优化
```

**预计总工作量**：30-40小时（按阶段分批执行）

**预期效果**：
- 代码行数不变（~9000行）
- 文件数量增加（36个 → ~80个）
- 平均文件大小降低（257行 → ~150行）
- 架构清晰度大幅提升

---

## 附录：参考资料

### A. DDD核心概念

- **限界上下文（Bounded Context）**：明确的业务边界
- **聚合根（Aggregate Root）**：领域对象的根实体
- **实体（Entity）**：有唯一标识的对象
- **值对象（Value Object）**：无唯一标识的不可变对象
- **领域服务（Domain Service）**：不属于任何实体的业务逻辑
- **仓储（Repository）**：数据访问抽象

### B. 设计模式应用

- **Facade模式**：保持向后兼容（StorageManager, StateManager）
- **Repository模式**：数据访问抽象（各领域Repository）
- **Observer模式**：状态订阅和通知（StateStore）
- **Strategy模式**：Agent任务分配策略
- **Factory模式**：领域对象创建

### C. 代码规范

- 文件命名：PascalCase（类）或 kebab-case（配置）
- 类命名：PascalCase
- 方法命名：camelCase
- 常量命名：UPPER_SNAKE_CASE
- 每个文件一个主要类/模块
- 导出使用 ES6 Modules（import/export）

---

**文档版本**：v1.0
**创建日期**：2026-01-13
**作者**：Claude Sonnet 4.5
**状态**：待审核
