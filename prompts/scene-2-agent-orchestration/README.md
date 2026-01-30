# 场景二：Agent调度链路

Version: 1.1.0
Last Updated: 2026-01-29

## 概述

场景二用于项目面板引入创意后，雇佣数字员工Agent进行软件开发落地（统一产品开发流程）。

## 目录结构

```
scene-2-agent-orchestration/
    ├── shared/                        # 共享规范（统一流程共用）
│   ├── agent-collaboration.md     # Agent协作规范
│   ├── prompt-structure.md        # Prompt结构标准
│   ├── task-decomposition.md      # 任务分解方法论
│   ├── quality-checklist.md       # 质量检查清单
│   └── templates/                 # 共享模板库
│
└── product-development/            # 统一产品开发
    ├── workflow.json              # 工作流定义
    └── agents/                    # Agent定义（统一岗位）
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

## 统一产品开发（product-development/）

### 工作流程

```
战略设计 → 需求阶段 → 设计阶段 → 架构阶段 → 开发阶段 → 测试阶段 → 部署阶段 → 运营阶段
```

### Agent列表（统一岗位）

- 产品经理、战略设计师、UI/UX设计师、技术负责人
- 前端开发、后端开发、测试工程师、运维工程师
- 营销专家、运营专家

### 使用方式

```javascript
// 加载统一产品开发的Agent
const productManager = await promptLoader.load(
  'scene-2-agent-orchestration/product-development/agents/product-manager-agent'
);

// 加载工作流
const workflow = await promptLoader.loadWorkflow(
  'scene-2-agent-orchestration/product-development/workflow'
);
```

## 引用机制

### 共享规范引用

在统一流程的文档中引用共享规范：

```markdown
## 通用协作规范

详见：[Agent协作规范](../shared/agent-collaboration.md)
```

### 加载时解析

PromptLoader在加载时自动解析引用：

```javascript
const content = await promptLoader.loadWithDependencies(
  'scene-2-agent-orchestration/product-development/workflow'
);
// 自动加载并合并 ../shared/agent-collaboration.md
```

## 修改指南

### 修改共享规范

1. 编辑 `shared/` 目录下的文件
2. 统一流程自动生效
3. 测试影响范围
4. 提交变更

### 修改Agent定义

1. 找到对应的Agent文件
2. 编辑Agent定义
3. 测试Agent调用
4. 提交变更

### 添加新Agent

#### 统一产品开发

```bash
# 创建Agent文件
touch prompts/scene-2-agent-orchestration/product-development/agents/new-agent.md

# 更新workflow.json
# 添加Agent到工作流
```

### 新增阶段或岗位

在统一流程内追加阶段或岗位，并同步更新 `product-development/workflow.json` 与对应的 Agent Prompt。

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
- [ ] 适用统一流程
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

- **版本**：1.1.0
- **最后更新**：2026-01-29
- **变更日志**：
  - 1.1.0：统一为单一产品开发流程，清理旧模式引用
