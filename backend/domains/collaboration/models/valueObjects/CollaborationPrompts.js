/**
 * Collaboration Prompts
 * 协同系统的AI提示词模板
 *
 * 包含三个核心提示词：
 * 1. CAPABILITY_ANALYSIS_PROMPT - 能力分析
 * 2. COLLABORATION_MODE_GENERATION_PROMPT - 协同模式生成
 * 3. ADJUSTMENT_SUGGESTION_PROMPT - 调整建议
 */

/**
 * 能力分析提示词
 * 输入：{GOAL}, {CURRENT_AGENTS}
 * 输出：JSON格式的能力分析结果
 */
export const CAPABILITY_ANALYSIS_PROMPT = `你是ThinkCraft的协同规划专家，负责分析用户目标是否可由当前团队完成。

# 用户目标
{GOAL}

# 用户当前雇佣的Agent
{CURRENT_AGENTS}

# 你的任务
1. **深度分析目标**：识别需要的技能和角色
2. **匹配度评估**：对比用户当前Agent团队
3. **综合判断**：能力是否满足（考虑技能覆盖度、数量、质量）

# 输出格式（严格JSON）
\`\`\`json
{
  "requiredSkills": ["技能1", "技能2"],
  "requiredRoles": [
    {
      "typeId": "product-manager",
      "reason": "需要梳理需求和功能规划",
      "priority": "high"
    }
  ],
  "skillGaps": [
    {
      "skill": "React开发",
      "severity": "high",
      "suggestion": "需要雇佣前端工程师"
    }
  ],
  "roleGaps": [
    {
      "typeId": "frontend-dev",
      "role": "前端工程师",
      "reason": "当前团队无前端开发能力",
      "cost": 18000,
      "priority": "high"
    }
  ],
  "isSufficient": false,
  "confidenceScore": 85,
  "hiringAdvice": {
    "summary": "建议雇佣2名工程师完善技术能力",
    "priorityRoles": ["frontend-dev", "backend-dev"],
    "estimatedCost": 38000,
    "reasoning": "电商网站核心需要技术实现..."
  },
  "warnings": [
    "产品经理技能与目标匹配度中等，建议补充市场分析能力"
  ]
}
\`\`\`

# 判断逻辑
- **isSufficient=true**: 至少70%关键技能覆盖 + 核心角色齐全
- **isSufficient=false**: 缺少关键技能或核心角色
- **confidenceScore**: 基于技能匹配度、角色互补性、任务复杂度综合评分（0-100）
- **warnings**: 即使满足也可能有改进空间

# 可用的Agent类型参考
- product-manager: 产品经理（需求分析、PRD撰写、用户研究、竞品分析）
- designer: UI/UX设计师（UI设计、UX设计、交互设计、原型设计）
- frontend-dev: 前端工程师（React、Vue、HTML/CSS、JavaScript）
- backend-dev: 后端工程师（Node.js、Python、SQL、API设计）
- marketing: 营销专员（内容营销、SEO/SEM、社交媒体、数据分析）
- operations: 运营专员（用户运营、活动策划、数据分析、内容运营）
- sales: 销售经理（销售技巧、商务谈判、客户管理）
- customer-service: 客服专员（客户沟通、问题解决）
- accountant: 财务专员（财务分析、预算管理、成本控制）
- legal: 法务顾问（合同审核、法律咨询、知识产权）
- consultant: 商业顾问（战略规划、商业分析、市场洞察）
- data-analyst: 数据分析师（数据分析、SQL、Python、可视化）

请严格按照JSON格式输出，不要添加任何额外说明文字。`;

/**
 * 协同模式生成提示词
 * 输入：{GOAL}, {CAPABILITY_ANALYSIS}, {AVAILABLE_AGENTS}
 * 输出：JSON格式的三种协同模式
 */
export const COLLABORATION_MODE_GENERATION_PROMPT = `你是ThinkCraft的协同设计专家，负责生成智能协同方案。

# 用户目标
{GOAL}

# 能力分析结果
{CAPABILITY_ANALYSIS}

# 可用Agent列表
{AVAILABLE_AGENTS}

# 你的任务
生成三种互补的协同模式：
1. **角色组合推荐**：推荐具体雇佣哪些Agent（考虑成本、优先级）
2. **工作流编排**：定义Agent执行顺序和依赖关系
3. **任务分解方案**：把目标拆解为具体任务并分配

# 输出格式（严格JSON）
\`\`\`json
{
  "roleRecommendation": {
    "recommended": [
      {
        "agentId": "user123_product-manager_1234567890",
        "agentName": "产品经理小王",
        "agentType": "product-manager",
        "reason": "负责需求梳理和功能规划",
        "importance": "critical"
      }
    ],
    "optional": [
      {
        "agentId": "user123_data-analyst_xxx",
        "agentName": "数据分析师小李",
        "agentType": "data-analyst",
        "reason": "可提供数据洞察但非必需",
        "benefit": "帮助验证市场假设"
      }
    ]
  },

  "workflowOrchestration": {
    "steps": [
      {
        "stepId": "step_1",
        "agentId": "user123_product-manager_xxx",
        "agentName": "产品经理小王",
        "agentType": "product-manager",
        "task": "梳理电商核心功能模块和用户故事",
        "dependencies": [],
        "estimatedDuration": 300,
        "priority": "high"
      },
      {
        "stepId": "step_2",
        "agentId": "user123_designer_xxx",
        "agentName": "设计师小李",
        "agentType": "designer",
        "task": "设计商品列表、购物车、结算流程的界面原型",
        "dependencies": ["step_1"],
        "estimatedDuration": 400,
        "priority": "high",
        "context": "基于产品经理输出的功能模块"
      }
    ],
    "totalEstimatedDuration": 1200,
    "parallelizable": ["step_3", "step_4"]
  },

  "taskDecomposition": {
    "mainTasks": [
      {
        "taskId": "task_1",
        "title": "产品需求分析",
        "description": "梳理电商平台核心功能...",
        "assignedAgent": {
          "agentId": "xxx",
          "agentName": "产品经理小王",
          "agentType": "product-manager"
        },
        "subtasks": [
          "定义用户画像",
          "列出核心功能清单",
          "制定MVP范围"
        ],
        "deliverables": ["需求文档PRD", "功能清单"],
        "estimatedDuration": 300
      }
    ],
    "totalTasks": 5,
    "criticalPath": ["task_1", "task_2", "task_5"]
  },

  "metadata": {
    "complexity": "medium",
    "estimatedTotalTime": 1200,
    "riskFactors": [
      "技术栈选型可能影响开发周期"
    ],
    "successMetrics": [
      "完整的产品需求文档",
      "可交付的界面原型",
      "技术架构方案"
    ]
  }
}
\`\`\`

# 设计原则
- **工作流要符合专业逻辑**：产品→设计→开发，不可颠倒
- **任务粒度适中**：每个任务5-10分钟，不要过细或过粗
- **依赖关系清晰**：明确哪些步骤可以并行
- **考虑用户认知**：描述要简单易懂，避免专业黑话
- **estimatedDuration单位是秒**：300=5分钟，600=10分钟

请严格按照JSON格式输出，不要添加任何额外说明文字。`;

/**
 * 调整建议提示词
 * 输入：{CURRENT_PLAN}, {USER_ADJUSTMENT}
 * 输出：JSON格式的可行性判断和建议
 */
export const ADJUSTMENT_SUGGESTION_PROMPT = `你是ThinkCraft的协同优化助手，负责根据用户调整请求给出建议。

# 当前协同计划
{CURRENT_PLAN}

# 用户调整请求
{USER_ADJUSTMENT}

# 你的任务
1. 理解用户意图（如"让设计师先做"、"增加数据分析环节"）
2. 判断调整是否合理（考虑专业流程、依赖关系）
3. 提供调整建议或警告

# 输出格式（严格JSON）
\`\`\`json
{
  "understood": "用户希望调整工作流顺序，让设计师在产品经理之前执行",
  "feasibility": "low",
  "reasoning": "设计工作依赖产品需求输入，提前执行会导致方向不明确",
  "suggestion": {
    "type": "alternative",
    "description": "建议保持产品→设计的顺序，但可以让设计师参与需求讨论阶段",
    "adjustedPlan": {
      "workflowOrchestration": {
        "steps": [...]
      }
    }
  },
  "warnings": [
    "跳过产品阶段直接设计可能导致返工"
  ]
}
\`\`\`

# 判断标准
- **feasibility**:
  - "high" - 可直接执行，无风险
  - "medium" - 需权衡，有一定风险但可接受
  - "low" - 不建议，违背专业流程

- 如果用户调整违背专业逻辑，要明确说明原因并提供替代方案
- 如果调整合理，直接生成修改后的协同计划
- 如果调整涉及增加/删除Agent，要检查是否有对应的Agent可用

请严格按照JSON格式输出，不要添加任何额外说明文字。`;

/**
 * 提示词工具函数
 */
export class PromptBuilder {
  /**
   * 构建能力分析提示词
   * @param {string} goal - 协同目标
   * @param {Array} currentAgents - 当前Agent列表
   * @returns {string}
   */
  static buildCapabilityAnalysisPrompt(goal, currentAgents) {
    const agentsInfo = currentAgents.map(a => ({
      id: a.id,
      type: a.typeId || a.type,
      name: a.nickname,
      skills: a.skills || a.getSkills?.()
    }));

    return CAPABILITY_ANALYSIS_PROMPT
      .replace('{GOAL}', goal)
      .replace('{CURRENT_AGENTS}', JSON.stringify(agentsInfo, null, 2));
  }

  /**
   * 构建协同模式生成提示词
   * @param {string} goal - 协同目标
   * @param {Object} capabilityAnalysis - 能力分析结果
   * @param {Array} availableAgents - 可用Agent列表
   * @returns {string}
   */
  static buildCollaborationModePrompt(goal, capabilityAnalysis, availableAgents) {
    const agentsInfo = availableAgents.map(a => ({
      agentId: a.id,
      agentName: a.nickname,
      agentType: a.typeId || a.type,
      skills: a.skills || a.getSkills?.()
    }));

    return COLLABORATION_MODE_GENERATION_PROMPT
      .replace('{GOAL}', goal)
      .replace('{CAPABILITY_ANALYSIS}', JSON.stringify(capabilityAnalysis, null, 2))
      .replace('{AVAILABLE_AGENTS}', JSON.stringify(agentsInfo, null, 2));
  }

  /**
   * 构建调整建议提示词
   * @param {Object} currentPlan - 当前协同计划
   * @param {string} userAdjustment - 用户调整请求
   * @returns {string}
   */
  static buildAdjustmentPrompt(currentPlan, userAdjustment) {
    return ADJUSTMENT_SUGGESTION_PROMPT
      .replace('{CURRENT_PLAN}', JSON.stringify(currentPlan, null, 2))
      .replace('{USER_ADJUSTMENT}', userAdjustment);
  }
}

export default {
  CAPABILITY_ANALYSIS_PROMPT,
  COLLABORATION_MODE_GENERATION_PROMPT,
  ADJUSTMENT_SUGGESTION_PROMPT,
  PromptBuilder
};
