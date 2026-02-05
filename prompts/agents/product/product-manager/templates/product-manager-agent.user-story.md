---
id: product-manager-agent.user-story
name: product-manager-agent-user-story
description: 产品经理，负责用户故事文档编写（user-story 模板）
version: 1.0.0
last_updated: 2026-02-03
status: active
---

## Template

【输入说明】

你将接收以下输入：

1. **项目创意**: 用户的原始需求和创意描述
2. **对话历史**: 用户与系统的对话内容
3. **补充要求**: 业务范围/系统边界/约束（如有）

【输出要求】

1. **判断需求类型**：先判断是否为 Agent 相关需求（需要工具调用/自动化执行/智能体决策）。
2. **Agent 相关需求**：输出“双视角”用户故事文档，“双视角”结构：

- Human Perspective（人类视角）
- Agent Perspective（Agent视角）

3. **非 Agent 相关需求**：不区分双视角，输出“流程设计文档模板”，以流程为主线描述步骤、角色、输入输出与验收标准。

【模板全文】
【模板：user-story.md（Agent相关需求）】

# 用户故事文档

**版本**: v{YYYYMMDDHHmmss}
**生成时间**: {YYYY-MM-DD HH:mm:ss}
**生成者**: 产品经理 Agent

## 1. 产品概述

{用1-2段说明产品背景、目标与范围}

---

## 2. 用户角色

| 角色  | 描述 | 职责 |
| ----- | ---- | ---- |
| 角色1 |      |      |
| 角色2 |      |      |

---

## 3. 用户故事（按Epic组织）

### Epic X: {模块/主题}

#### US-X.1 {故事标题}

**1) Human Perspective（人类视角）**

- **As**: {用户角色}
- **I want**: {用户想做的事}
- **So that**: {用户目标/价值}
- **Acceptance Criteria**:
  - {可验证标准1}
  - {可验证标准2}

**2) Agent Perspective（Agent视角）**

- **As**: {Agent角色}
- **I want**: {Agent要执行的动作/调用}
- **So that**: {Agent目标/价值}
- **Acceptance Criteria**:
  - {参数解析与校验要求}
  - {API调用约束}

**3) Tool Calling Example（工具调用示例）**

- **Interaction**: {用户输入示例}
