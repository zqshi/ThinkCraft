# Agent产品开发流程协调器 - 使用说明

## 概述

本 skill 是 Agent产品开发流程的总协调器，专门用于开发基于大模型的AI Agent产品（如ReAct Agent、Function Calling Agent等）。

## 适用场景

- 开发ReAct Agent、Function Calling Agent等AI Agent产品
- 需要完整的需求分析、战略设计、开发、测试、部署流程
- 需要严格的文档规范和质量控制机制
- 需要专业的Agent战略设计（Prompt构造块、工具设计等）

## 快速开始

### 自动触发

当你的对话包含以下关键词时，Claude 会自动调用此 skill：

- "开发Agent产品"
- "ReAct Agent"
- "Function Calling Agent"
- "设计Prompt"
- "构建工具系统"
- "Agent战略设计"

### 手动触发

```bash
/agent-product-orchestrator
```

## 流程概览

```
需求设计阶段 → 战略设计阶段 → 开发阶段
     ↓              ↓              ↓
  需求文档      战略设计文档    Agent产品
```

### 需求设计阶段

- **需求澄清**: 通过多轮澄清充分理解用户需求
- **市场调研**（可选）: 进行市场和竞品分析
- **需求设计**: 产出传统版需求设计文档
- **质量挑战**: 对需求设计进行质量挑战
- **需求精炼**: 产出LLM版需求设计文档

### 战略设计阶段

- **战略设计分析**: 分析Agent的核心域、支撑域、通用域
- **战略设计**: 设计Prompt构造块、工具定义、用户用例
- **设计挑战**: 对战略设计进行质量挑战
- **挑战回应**: 回应挑战并优化设计

### 开发阶段

- **前端开发**: 开发Agent产品的前端界面
- **后端开发**: 开发Agent的核心逻辑（Prompt、工具、ReAct循环）
- **测试**: 进行全面测试（Prompt测试、工具测试、集成测试）
- **部署**: 部署到生产环境，配置监控和告警
- **性能优化**: 进行性能分析和优化（Prompt优化、成本优化）

## 可用的专业 Agent

### 需求设计阶段（4个Agent）

- **product-demand-manager-agent** - 需求设计专家
  - 职责: 需求澄清、需求设计、挑战回应、需求变更
  - 输出: 需求澄清问题、需求设计文档、挑战回应文档

- **product-research-analyst-agent** - 产品研究分析师
  - 职责: 市场调研与竞品分析
  - 输出: 需求调研分析文档

- **product-demand-refine-agent** - 需求精炼专家
  - 职责: 将传统版需求文档精炼为LLM版
  - 输出: 需求设计文档-LLM版

- **product-demand-challenge-agent** - 需求质量挑战专家
  - 职责: 对需求设计进行质量挑战
  - 输出: 需求设计挑战文档

### 战略设计阶段（2个Agent）

- **strategy-design-agent** - 战略设计专家
  - 职责: Agent战略设计与挑战回应
  - 输出: 战略设计分析文档、战略设计文档、挑战回应文档

- **strategy-design-challenge-agent** - 战略设计挑战专家
  - 职责: 对战略设计进行质量挑战
  - 输出: 战略设计挑战文档

### 开发阶段（6个Agent）

- **frontend-developer-agent** - 前端开发专家
  - 职责: Agent产品的前端界面开发
  - 输出: 前端代码、组件库、前端文档

- **agentscope-react-developer** - AgentScope开发专家
  - 职责: 基于AgentScope框架开发ReAct Agent
  - 输出: Agent代码、API文档、开发文档

- **test-expert-agent** - 测试专家
  - 职责: 测试策略、测试用例编写和测试执行
  - 输出: 测试计划、测试用例、测试报告、质量报告

- **devops-agent** - 部署运维专家
  - 职责: 部署、监控、日志分析和运维保障
  - 输出: 部署方案、运维文档、监控配置、部署脚本

- **performance-agent** - 性能优化专家
  - 职责: 性能分析、Prompt优化、工具调用优化和成本优化
  - 输出: 性能分析报告、优化方案、优化后的配置

- **dev-agent** - 开发流程协调Agent
  - 职责: 协调整个开发流程
  - 输出: 开发进度报告

## 文档规范

所有Agent必须遵循以下规范：

### 1. 使用统一的文档模板

见 `design-standard/templates.md`，包含：

- 需求设计阶段文档模板
- 战略设计阶段文档模板
- 开发阶段文档模板

### 2. 执行强制的合规自检流程

每个Agent生成文档后必须：

- 写作前绑定模板
- 落盘写入
- 自动回读校验
- 合规自检
- 向协调者报告

### 3. 遵循核心原则

见 `design-standard/product-core.md`，包含：

- 大模型原生应用核心原则
- Agent协作设计规范
- 信息传递与上下文管理
- 职责边界与防越俎代庖
- 开发阶段规范（代码质量、测试质量、运维质量、性能优化）

### 4. 遵循战略设计标准

见 `design-standard/strategy-design-standard.md`，包含：

- 能力驱动vs流程驱动
- ReAct Loop + LLM模式原则
- Prompt构造块设计原则
- 工具设计原则（必要性、完备性）

## 与流程化产品开发体系的区别

| 维度         | Agent产品开发流程（本skill）           | 流程化产品开发体系             |
| ------------ | -------------------------------------- | ------------------------------ |
| **定位**     | 专门用于开发AI Agent产品               | 用于一般性产品开发             |
| **适用场景** | ReAct Agent、Function Calling Agent    | Web应用、移动应用、桌面应用    |
| **特有阶段** | 战略设计阶段（Prompt构造块、工具设计） | 无                             |
| **设计原则** | 能力驱动、ReAct Loop、工具必要性       | 流程驱动、用户体验、功能完整性 |
| **测试重点** | Prompt测试、工具测试、Token消耗        | 功能测试、性能测试、兼容性测试 |
| **优化重点** | Prompt优化、工具调用优化、成本优化     | 性能优化、用户体验优化         |

## 目录结构

```
agent-product-orchestrator/
├── SKILL.md                    # 主协调器（本文件）
├── README.md                   # 使用说明（本文档）
├── agents/                     # 12个专业Agent定义
│   ├── product-demand-manager-agent.md
│   ├── product-research-analyst-agent.md
│   ├── product-demand-refine-agent.md
│   ├── product-demand-challenge-agent.md
│   ├── strategy-design-agent.md
│   ├── strategy-design-challenge-agent.md
│   ├── frontend-developer-agent.md
│   ├── agentscope-react-developer.md
│   ├── test-expert-agent.md
│   ├── devops-agent.md
│   ├── performance-agent.md
│   └── dev-agent.md
└── design-standard/            # 设计标准
    ├── product-core.md         # 核心原则
    ├── templates.md            # 文档模板
    └── strategy-design-standard.md  # 战略设计标准
```

## 参考文档

- [核心原则](design-standard/product-core.md) - Agent协作规范、信息传递、开发阶段规范
- [文档模板](design-standard/templates.md) - 所有阶段的文档模板
- [战略设计标准](design-standard/strategy-design-standard.md) - Agent战略设计原则和方法

## 常见问题

### Q: 这个流程适合开发什么类型的Agent？

A: 适合开发基于大模型的AI Agent产品，特别是ReAct Agent和Function Calling Agent。如果你的Agent需要Prompt设计、工具调用、多轮对话等能力，这个流程非常适合。

### Q: 必须完整走完所有阶段吗？

A: 建议完整走完所有阶段以确保质量。但如果你已经有明确的需求和设计，可以跳过某些阶段。每个阶段完成后都需要人类确认才能进入下一阶段。

### Q: 战略设计阶段和一般的技术设计有什么区别？

A: 战略设计阶段专注于Agent特有的设计，包括Prompt构造块设计、工具设计（必要性、完备性）、能力驱动vs流程驱动等。这些是Agent产品特有的设计考虑。

### Q: 如何确保文档质量？

A: 每个Agent都有强制的合规自检流程，包括模板匹配、章节完整性检查、必填字段检查等。协调者会验证文档质量，不合格的文档会要求重新生成。

### Q: 性能优化阶段主要优化什么？

A: 主要优化Prompt效率、工具调用次数、响应时间、Token消耗和API成本。这些是Agent产品特有的性能指标。

## 技术细节

### 运行环境

- **context**: fork - 在子Agent中运行，避免污染主对话上下文
- **agent**: Plan - 使用Plan agent类型，适合流程规划
- **model**: sonnet - 使用Sonnet模型
- **allowed-tools**: Read, Grep, Write, Bash, AskUserQuestion - 限制工具权限

### 自动触发机制

Claude 会根据 description 中的关键词自动判断是否需要调用此 skill。关键词包括：

- Agent产品
- ReAct Agent
- Function Calling Agent
- Prompt设计
- 工具系统
- Agent战略设计

### 上下文隔离

使用 `context: fork` 配置，协调器在独立的子Agent中运行，不会占用主对话的上下文空间，确保主对话保持清爽和高效。

## 贡献指南

如果你想改进这个流程体系：

1. 遵循现有的文档结构和编写规范
2. 确保新增的Agent遵循标准的Agent文档结构
3. 更新相关的文档模板和检查清单
4. 在协调者中更新工作流程和依赖关系

## 许可证

本文档体系遵循项目的整体许可证。
