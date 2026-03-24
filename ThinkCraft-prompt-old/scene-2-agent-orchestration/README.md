# 场景二：Agent调度链路

Version: 1.0.1
Last Updated: 2026-01-28

## 概述

场景二用于项目面板引入创意后，雇佣数字员工Agent进行软件开发落地。

## 目录结构

```
scene-2-agent-orchestration/
├── shared/                        # 共享规范（所有开发类型共用）
│   ├── agent-collaboration.md     # Agent协作规范
│   ├── prompt-structure.md        # Prompt结构标准
│   ├── task-decomposition.md      # 任务分解方法论
│   ├── quality-checklist.md       # 质量检查清单
│   └── templates/                 # 共享模板库
│
├── agent-product-development/     # Agent产品开发
│   ├── workflow.json              # 工作流定义
│   ├── product-core.md            # 产品核心原则
│   └── agents/                    # Agent定义（11个）
│       ├── demand-design/         # 需求设计阶段（4个）
│       ├── strategy-design/       # 战略设计阶段（2个）
│       └── development/           # 开发阶段（5个）
│
└── traditional-product-development/ # 传统产品开发
    ├── workflow.json              # 工作流定义
    ├── product-core.md            # 产品核心原则
    └── agents/                    # Agent定义（6个）
```

## 共享规范（shared/）

### 核心文档

1. **agent-collaboration.md**：Agent协作规范
   - 无状态调用本质
   - 信息透传规范
   - 职责边界定义
   - 调用前强制自检

2. **prompt-structure.md**：标准Prompt结构
   - Agent身份定义
   - 上下文信息
   - 本次任务
   - 输出要求

3. **task-decomposition.md**：任务分解方法论
   - 能力驱动分解
   - 依赖关系明确
   - 粒度适中
   - 分解模式

4. **quality-checklist.md**：质量检查清单
   - 调用前检查
   - 调用后检查
   - 文档输出检查
   - 代码输出检查

### 使用方式

```javascript
// 加载共享规范
const collaboration = await promptLoader.load(
  'scene-2-agent-orchestration/shared/agent-collaboration'
);
const promptStructure = await promptLoader.load(
  'scene-2-agent-orchestration/shared/prompt-structure'
);
```

## Agent产品开发（agent-product-development/）

### 工作流程

```
需求设计阶段 → 战略设计阶段 → 开发阶段
```

### Agent列表

#### 需求设计阶段（4个）

1. **product-demand-manager.md**：产品需求管理Agent
   - 需求澄清
   - 需求设计
   - 挑战回应

2. **product-research-analyst.md**：产品研究分析Agent
   - 市场调研
   - 竞品分析
   - 用户研究

3. **demand-challenge.md**：需求设计挑战Agent
   - 质量挑战
   - 问题识别
   - 改进建议

4. **demand-refine.md**：需求文档精炼Agent
   - 文档优化
   - 格式规范
   - 内容精炼

#### 战略设计阶段（2个）

1. **strategy-designer.md**：战略设计Agent
   - Prompt构造块设计
   - 工具系统设计
   - 用户用例设计

2. **strategy-challenge.md**：战略设计挑战Agent
   - 战略质量挑战
   - 设计优化建议

#### 开发阶段（5个）

1. **agentscope-react-developer.md**：AgentScope React开发Agent
   - Agent后端开发
   - 工具集成

2. **test-expert.md**：测试专家Agent
   - 功能测试
   - 性能测试

3. **devops.md**：DevOps Agent
   - 部署实施
   - 运维配置

4. **performance.md**：性能优化Agent
   - 响应速度优化
   - Token消耗优化

5. **dev-agent.md**：开发Agent
   - 最终验收
   - 集成测试

### 使用方式

```javascript
// 加载Agent产品开发的Agent
const demandManager = await promptLoader.load(
  'scene-2-agent-orchestration/agent-product-development/agents/demand-design/product-demand-manager'
);

// 加载工作流
const workflow = await promptLoader.loadWorkflow(
  'scene-2-agent-orchestration/agent-product-development/workflow'
);
```

## 传统产品开发（traditional-product-development/）

### 工作流程

```
需求分析 → UI/UX设计 → 技术架构设计 → 开发 → 测试 → 部署
```

### Agent列表（6个）

1. **product-manager-agent.md**：产品经理Agent
   - 需求分析
   - PRD编写

2. **ui-ux-designer-agent.md**：UI/UX设计师Agent
   - 交互设计
   - 视觉设计

3. **tech-lead-agent.md**：技术负责人Agent
   - 架构设计
   - 技术选型

4. **frontend-developer-agent.md**：前端开发Agent
   - 前端实现
   - 界面开发

5. **backend-developer-agent.md**：后端开发Agent
   - 后端实现
   - API开发

6. **qa-engineer-agent.md**：测试工程师Agent
   - 测试计划
   - 测试执行

### 使用方式

```javascript
// 加载传统产品开发的Agent
const productManager = await promptLoader.load(
  'scene-2-agent-orchestration/traditional-product-development/agents/product-manager-agent'
);

// 加载工作流
const workflow = await promptLoader.loadWorkflow(
  'scene-2-agent-orchestration/traditional-product-development/workflow'
);
```

## 引用机制

### 共享规范引用

在开发类型特有的文档中引用共享规范：

```markdown
## 通用协作规范

详见：[Agent协作规范](../shared/agent-collaboration.md)
```

### 加载时解析

PromptLoader在加载时自动解析引用：

```javascript
const content = await promptLoader.loadWithDependencies(
  'scene-2-agent-orchestration/agent-product-development/product-core'
);
// 自动加载并合并 ../shared/agent-collaboration.md
```

## 修改指南

### 修改共享规范

1. 编辑 `shared/` 目录下的文件
2. 所有开发类型自动生效
3. 测试影响范围
4. 提交变更

### 修改Agent定义

1. 找到对应的Agent文件
2. 编辑Agent定义
3. 测试Agent调用
4. 提交变更

### 添加新Agent

#### Agent产品开发

```bash
# 确定阶段
# 需求设计：demand-design/
# 战略设计：strategy-design/
# 开发：development/

# 创建Agent文件
touch prompts/scene-2-agent-orchestration/agent-product-development/agents/demand-design/new-agent.md

# 更新workflow.json
# 添加Agent到对应阶段
```

#### 传统产品开发

```bash
# 创建Agent文件
touch prompts/scene-2-agent-orchestration/traditional-product-development/agents/new-agent.md

# 更新workflow.json
# 添加Agent到工作流
```

### 添加新开发类型

```bash
# 创建目录
mkdir prompts/scene-2-agent-orchestration/new-development-type/
mkdir prompts/scene-2-agent-orchestration/new-development-type/agents/

# 创建核心文件
touch prompts/scene-2-agent-orchestration/new-development-type/product-core.md
touch prompts/scene-2-agent-orchestration/new-development-type/workflow.json

# 在product-core.md中引用共享规范
```

## 质量标准

### Agent定义质量标准

- [ ] Agent身份明确
- [ ] 职责边界清晰
- [ ] 输入输出明确
- [ ] 符合标准Prompt结构

### 工作流质量标准

- [ ] 阶段划分合理
- [ ] 依赖关系清晰
- [ ] Agent分配恰当
- [ ] 可执行可验证

### 共享规范质量标准

- [ ] 内容准确完整
- [ ] 适用所有开发类型
- [ ] 易于理解和应用
- [ ] 定期更新维护

## 最佳实践

### 1. 遵循共享规范

所有Agent调用都应遵循共享规范中定义的标准。

### 2. 使用标准Prompt结构

构建Agent Prompt时使用标准结构模板。

### 3. 进行调用前自检

每次调用Agent前执行三层自检。

### 4. 保持信息透传

Agent输出原封不动呈现给用户。

### 5. 明确职责边界

协调者和Agent各司其职，不越界。

## 版本信息

- **版本**：1.0.0
- **最后更新**：2026-01-27
- **变更日志**：
  - 1.0.0：初始版本
