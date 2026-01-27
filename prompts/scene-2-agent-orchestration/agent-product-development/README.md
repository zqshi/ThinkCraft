# Agent 产品开发文档架构说明

> 最后更新：2026-01-27

---

## 📁 目录结构

```
agent-product-development/
├── README.md                          # 本文档
├── product-core.md                    # Agent 产品开发核心原则（完整版）
├── workflow.json                      # 工作流定义
├── design-standard/                   # 设计标准文档
│   └── strategy-design-standard.md    # Agent 战略设计标准
└── agents/                            # Agent 定义文件
    ├── demand-design/                 # 需求设计阶段 Agent
    │   ├── product-demand-manager.md
    │   ├── demand-challenge.md
    │   ├── demand-refine.md
    │   └── product-research-analyst.md
    ├── strategy-design/               # 战略设计阶段 Agent
    │   ├── strategy-designer.md
    │   └── strategy-challenge.md
    └── development/                   # 开发阶段 Agent
        ├── dev-agent.md
        ├── agentscope-react-developer.md
        ├── test-expert.md
        ├── performance.md
        └── devops.md
```

---

## 📚 核心文档说明

### 1. product-core.md

**位置**: `agent-product-development/product-core.md`

**内容**:
- Agent 无状态调用本质
- 标准 Prompt 结构模板
- 调用前强制自检（三层检查清单）
- Agent 输出异常检测规则
- 信息透传强制规范
- 职责边界与防越俎代庖
- 文档模板使用强制规范
- 质量控制与合规机制

**适用对象**: 所有 Agent 和协调者

---

### 2. strategy-design-standard.md

**位置**: `agent-product-development/design-standard/strategy-design-standard.md`

**内容**:
- 战略目标与域划分（核心域、支撑域、通用域）
- 设计哲学（能力驱动 vs 流程驱动）
- ReAct Loop + LLM 模式原则
- 常见设计误区
- Prompt 构造块设计原则
- 工具设计三大核心原则（完美模型假设、必要性、完备性）
- 用户用例设计原则

**适用对象**: strategy-design-agent, strategy-design-challenge-agent

---

## 🔗 路径引用规范

### 从 Agent 定义文件引用核心文档

#### 需求设计阶段 Agent (`agents/demand-design/`)

```markdown
- 产品核心原则: ../../product-core.md
- 用户需求输入模板: ../../../shared/templates/demand-design/user-input.md
- 需求澄清问题模板: ../../../shared/templates/demand-design/clarify-questions.md
- 需求澄清分析模板: ../../../shared/templates/demand-design/clarify-analysis.md
- 需求设计模板（传统版）: ../../../shared/templates/demand-design/design-doc-traditional.md
- 需求设计模板（LLM版）: ../../../shared/templates/demand-design/design-doc-llm.md
- 需求设计挑战模板: ../../../shared/templates/demand-design/design-challenge.md
- 需求设计回应模板: ../../../shared/templates/demand-design/design-response.md
- 研究报告模板: ../../../shared/templates/demand-design/research-report.md
- 设计原则检查清单: ../../../shared/templates/checklists/design-principles.md
- 用户故事质量检查: ../../../shared/templates/checklists/user-story-quality.md
- 流程检查清单: ../../../shared/templates/checklists/process-checklist.md
```

#### 战略设计阶段 Agent (`agents/strategy-design/`)

```markdown
- 产品核心原则: ../../product-core.md
- 战略设计标准: ../../design-standard/strategy-design-standard.md
- 战略设计分析模板: ../../../shared/templates/strategy-design/strategy-analysis.md
- 战略设计文档模板: ../../../shared/templates/strategy-design/strategy-doc.md
- 战略设计挑战模板: ../../../shared/templates/strategy-design/strategy-challenge.md
- 战略设计回应模板: ../../../shared/templates/strategy-design/strategy-response.md
- 设计原则检查清单: ../../../shared/templates/checklists/design-principles.md
- 流程检查清单: ../../../shared/templates/checklists/process-checklist.md
```

#### 开发阶段 Agent (`agents/development/`)

```markdown
- 产品核心原则: ../../product-core.md
- 前端开发文档模板: ../../../shared/templates/development/frontend-doc.md
- 测试计划模板: ../../../shared/templates/development/test-plan.md
- 测试用例模板: ../../../shared/templates/development/test-case.md
- 测试报告模板: ../../../shared/templates/development/test-report.md
- 性能报告模板: ../../../shared/templates/development/performance-report.md
- 优化方案模板: ../../../shared/templates/development/optimization-plan.md
- 部署方案模板: ../../../shared/templates/development/deploy-plan.md
- 运维手册模板: ../../../shared/templates/development/ops-manual.md
- 流程检查清单: ../../../shared/templates/checklists/process-checklist.md
```

---

## 🎯 核心设计原则

### 1. 能力驱动 vs 流程驱动

| 维度 | 流程驱动的传统软件 | 能力驱动的 AI Agent |
|------|------------------|------------------|
| 核心范式 | 预定义流程 (If-Then 规则) | 动态意图识别与满足 (Goal-Action) |
| 交互模式 | 线性、菜单式 | 非线性、对话式 |
| 状态管理 | 显式状态机（步骤2/5） | 隐式上下文，由 Agent 维护 |
| 用户自由度 | 低：固定路径 | 高：可随时切换话题、追问 |

### 2. 工具设计三大核心原则

1. **完美模型假设**: 假设 LLM 的理解与上下文能力是完美的
2. **必要性**: 如果在没有该工具的前提下，大模型根据上下文信息可以推理出等效工具调用的结果，则工具不具备必要性
3. **完备性**: 当前的工具集+LLM自身的推理能力，必须能组合出Agent所有能力

### 3. Prompt 构造块设计原则

- **目标完备性**: 目标定义可以完备满足用户需求
- **能力完备性**: 能力的组合可以完备支持目标

---

## 📋 文档更新记录

| 版本 | 日期 | 修改内容 | 修改人 |
|------|------|---------|--------|
| v1.0 | 2026-01-27 | 初始版本，补充核心标准文档，更新所有路径引用 | Claude |

---

## ✅ 验证清单

- [x] design-standard 文件夹已创建
- [x] strategy-design-standard.md 已补充
- [x] product-core.md 已替换为完整版本
- [x] 所有 Agent 定义文件中的路径引用已更新
- [x] 路径引用指向正确的文件位置
- [x] 所有引用的模板文件均存在

---

## 🔍 快速查找

### 需要查找设计原则？
→ `product-core.md` 或 `design-standard/strategy-design-standard.md`

### 需要查找文档模板？
→ `../shared/templates/` 目录下的相应子目录

### 需要查找检查清单？
→ `../shared/templates/checklists/` 目录

### 需要了解 Agent 协作规范？
→ `product-core.md` 第1-5章节

---

## 📞 问题反馈

如发现路径引用错误或文档缺失，请及时更新本文档并记录在更新记录中。
