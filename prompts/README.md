# ThinkCraft 提示词管理

本目录是ThinkCraft项目所有提示词的**单一数据源（Single Source of Truth）**。

## 目录结构

```
prompts/
├── scene-1-dialogue/              # 场景一：对话链路
│   ├── dialogue-guide/            # 对话引导
│   ├── analysis-report/           # 分析报告生成
│   ├── business-plan/             # 商业计划书生成
│   └── proposal/                  # 产品立项材料生成
│
└── scene-2-agent-orchestration/   # 场景二：Agent调度链路
    ├── shared/                    # 共享规范（统一流程共用）
    └── product-development/       # 统一产品开发
```

## 两个场景

### 场景一：对话链路（Dialogue Flow）

**用途**：用户与AI多轮对话 → 生成分析报告/商业计划书/立项材料

**特点**：

- 按功能独立管理
- 面向最终用户
- 包含对话引导和文档生成模板

**详细说明**：[scene-1-dialogue/README.md](scene-1-dialogue/README.md)

### 场景二：Agent调度链路（Agent Orchestration Flow）

**用途**：项目面板引入创意 → 雇佣数字员工Agent → 软件开发落地

**特点**：

- 按统一流程组织
- 面向Agent系统
- 包含Agent角色定义、工作流编排、协作规范

**详细说明**：[scene-2-agent-orchestration/README.md](scene-2-agent-orchestration/README.md)

## 使用指南

### 加载提示词

```javascript
// 场景一：对话链路
const dialoguePrompt = await promptLoader.load('scene-1-dialogue/dialogue-guide/system-default');
const businessPlanPrompt = await promptLoader.buildDocumentPrompt(
  'scene-1-dialogue/business-plan',
  selectedChapterIds,
  conversationHistory
);

// 场景二：Agent调度链路
const demandManager = await promptLoader.load(
  'scene-2-agent-orchestration/product-development/agents/product-manager-agent'
);
const sharedStandard = await promptLoader.load(
  'scene-2-agent-orchestration/shared/agent-collaboration'
);
```

### 修改提示词

**重要**：所有提示词修改必须在本目录进行。

1. 找到对应的提示词文件
2. 编辑文件内容
3. 运行验证：`npm run validate-prompts`
4. 提交变更

### 添加新提示词

#### 场景一：添加新功能

```bash
# 创建新功能目录
mkdir prompts/scene-1-dialogue/new-feature/

# 添加提示词文件
touch prompts/scene-1-dialogue/new-feature/full-document.md
```

#### 场景二：添加新Agent

```bash
# 统一产品开发
touch prompts/scene-2-agent-orchestration/product-development/agents/new-agent.md
```

## 版本管理

每个提示词文件应包含版本信息：

```markdown
---
version: 1.0.0
last_updated: 2026-01-29
changelog:
  - 1.0.0: 初始版本
---
```

## 质量保证

### 验证脚本

```bash
# 验证提示词格式
npm run validate-prompts

# 验证目录结构
npm run validate-prompt-structure

# 测试提示词加载
npm run test-prompt-loading
```

### 质量检查清单

- [ ] 提示词文件包含版本信息
- [ ] 提示词格式正确（Markdown）
- [ ] 提示词内容清晰明确
- [ ] 依赖文件路径正确
- [ ] 已通过验证脚本

## 架构设计

### 设计原则

1. **场景分离**：对话链路和Agent调度链路完全独立
2. **功能导向**：场景一按功能组织，场景二按统一流程组织
3. **共享复用**：相同部分创建共享文档，通过引用机制使用
4. **单一数据源**：每个提示词只在一个地方维护
5. **干净架构**：全新设计，不考虑历史兼容

### 引用机制

场景二中的共享规范通过相对路径引用：

```markdown
## 通用协作规范

详见：[Agent协作规范](../shared/agent-collaboration.md)
```

## 常见问题

### Q1：如何查找特定的提示词？

**A**：

1. 确定场景：对话链路还是Agent调度链路
2. 确定功能/流程
3. 在对应目录下查找

### Q2：如何测试提示词效果？

**A**：

1. 使用验证脚本：`npm run validate-prompts`
2. 在开发环境中测试加载
3. 使用实际场景验证效果

### Q3：如何处理提示词冲突？

**A**：

1. 检查版本信息
2. 使用Git查看变更历史
3. 与团队沟通解决冲突

## 相关文档

- [场景一使用说明](scene-1-dialogue/README.md)
- [场景二使用说明](scene-2-agent-orchestration/README.md)
- [Agent协作规范](scene-2-agent-orchestration/shared/agent-collaboration.md)
- [标准Prompt结构](scene-2-agent-orchestration/shared/prompt-structure.md)

## 版本信息

- **版本**：1.0.0
- **最后更新**：2026-01-27
- **变更日志**：
  - 1.0.0：初始版本，全新架构设计
