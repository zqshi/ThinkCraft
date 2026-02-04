/**
 * 工作流执行 API
 * 协同开发模式的阶段任务执行
 */
import express from 'express';
import { callDeepSeekAPI } from '../../../../config/deepseek.js';
import {
  getStageById,
  normalizeStageId,
  ARTIFACT_TYPES,
  AGENT_PROMPT_MAP
} from '../../../../config/workflow-stages.js';
import { projectRepository } from '../../../features/projects/infrastructure/index.js';

const router = express.Router();

function parseJsonPayload(text) {
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    const match = String(text).match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (inner) {
        return null;
      }
    }
    return null;
  }
}

function buildRoleTemplateMapping() {
  return Object.entries(AGENT_PROMPT_MAP).map(([agentId, profile]) => {
    const deliverables = (profile.deliverables || []).map(type => {
      const def = ARTIFACT_TYPES[type];
      return {
        type,
        name: def?.name || type,
        templates: Array.isArray(def?.promptTemplates) ? def.promptTemplates : []
      };
    });
    return {
      agentId,
      name: profile.name || agentId,
      deliverables
    };
  });
}

function normalizeOutputToTypeId(output) {
  const text = String(output || '').trim();
  if (!text) {
    return null;
  }
  if (ARTIFACT_TYPES[text]) {
    return text;
  }
  const entry = Object.entries(ARTIFACT_TYPES).find(([, def]) => def?.name === text);
  return entry ? entry[0] : null;
}

function collectProjectArtifacts(workflowStages) {
  const byStage = new Map();
  (workflowStages || []).forEach(stage => {
    if (!stage || !stage.id) {
      return;
    }
    const stageArtifacts = Array.isArray(stage.artifacts) ? stage.artifacts : [];
    byStage.set(stage.id, stageArtifacts);
  });
  return byStage;
}

/**
 * 阶段任务提示词模板
 */
const STAGE_PROMPTS = {
  requirement: `你是一位经验丰富的产品经理。基于用户的创意对话，生成完整的产品需求文档（PRD）。

创意对话内容：
{CONVERSATION}

请生成以下内容：

# 产品需求文档（PRD）

## 1. 产品概述
- 产品名称
- 产品定位
- 目标用户
- 核心价值

## 2. 功能需求
### 2.1 核心功能
（详细描述每个核心功能，包含用户场景、交互流程）

### 2.2 辅助功能
（支持性功能列表）

## 3. 用户故事
（以用户视角描述功能需求，格式：作为[角色]，我想要[功能]，以便[目的]）

## 4. 功能优先级
（P0/P1/P2优先级划分）

## 5. 非功能性需求
- 性能要求
- 安全要求
- 兼容性要求

请输出完整的Markdown格式文档。`,

  design: `你是一位专业的产品设计师。基于产品需求文档，设计产品的UI/UX方案。

产品需求文档：
{PRD}

请生成以下内容：

# UI/UX设计方案

## 1. 设计目标
- 设计理念
- 视觉风格
- 用户体验目标

## 2. 信息架构
（页面结构和导航设计）

## 3. 界面设计
### 3.1 主要页面
（每个核心页面的布局和交互设计）

### 3.2 组件库
（UI组件规范：按钮、表单、卡片等）

## 4. 交互流程
（关键功能的交互流程图）

## 5. 设计规范
- 色彩系统
- 字体规范
- 间距规范
- 图标风格

请输出完整的Markdown格式文档。`,

  'strategy-requirement': `你是一位战略与产品负责人。基于用户创意与对话内容，完成“战略 + 需求”合并阶段的基础输出，为后续设计与开发奠定方向。

创意对话内容：
{CONVERSATION}

请输出以下内容（合并但结构清晰）：

# 战略与需求综述

## 1. 战略目标与范围
- 目标定位
- 关键假设
- 约束边界

## 2. 价值验证与MVP范围（如适用）
- 价值假设
- MVP范围与验证路径

## 3. 产品需求概览（PRD框架）
- 目标用户与核心价值
- 核心功能与用户故事
- 功能优先级与验收标准

## 4. 下一阶段输入要求
- 设计/架构/开发阶段的关键输入

请输出完整的Markdown格式文档。`,

  strategy: `【角色定位】
你是一位资深战略设计师，专注于 Agent 项目战略建模、能力域划分与模式原则制定。你的工作是输出可执行的战略设计标准与约束边界。

【输入说明】
你将接收以下输入：
1. 目标说明：本次需要完成的战略设计范围与目标
2. 约束条件：时间、资源或实现边界（如有）
3. 补充材料：既有原则或参考规范（如有）

【核心职责】
1. 战略建模：明确核心域/支撑域/通用域的边界与优先级
2. 模式原则：给出能力驱动、ReAct Loop 等关键设计原则
3. 实施标准：输出 Prompt 构造、工具设计、用例设计标准
4. 风险规避：明确常见误区与约束边界

【工作流程】
1. 目标理解 - 明确战略设计目标与范围
2. 域划分 - 识别核心域、支撑域、通用域
3. 原则制定 - 形成设计哲学与模式原则
4. 标准落盘 - 输出实施标准与注意事项

【创意对话内容】
{CONVERSATION}

请根据以上要求生成“战略设计文档”，输出完整 Markdown 内容，避免额外说明。`,
  architecture: `你是一位资深的架构师。基于产品需求和设计方案，设计系统的技术架构。

产品需求文档：
{PRD}

设计方案：
{DESIGN}

请生成以下内容：

# 系统架构设计

## 1. 整体架构
- 架构模式（如：前后端分离、微服务等）
- 技术选型理由

## 2. 技术栈
### 2.1 前端技术栈
- 框架/库
- 状态管理
- UI组件库
- 构建工具

### 2.2 后端技术栈
- 编程语言
- Web框架
- 数据库
- 缓存/消息队列

## 3. 系统模块
（模块划分和职责说明）

## 4. API设计
（RESTful API接口规范，包含主要接口示例）

## 5. 数据模型
（核心数据表设计）

## 6. 部署架构
（服务器、负载均衡、CDN等）

请输出完整的Markdown格式文档。`,

  development: `你是一位全栈工程师。基于架构设计文档，提供开发实现指南。

架构设计文档：
{ARCHITECTURE}

请生成以下内容：

# 开发实现指南

## 1. 项目结构
（前后端代码目录结构）

## 2. 核心功能实现
### 2.1 前端实现要点
（关键组件和状态管理实现思路）

### 2.2 后端实现要点
（核心API和数据处理实现思路）

## 3. 代码示例
（提供关键功能的代码示例，包含前后端）

## 4. 第三方集成
（需要集成的第三方服务和SDK）

## 5. 开发规范
- 代码风格
- Git工作流
- 代码审查流程

## 6. 本地开发环境
（环境搭建步骤）

请输出完整的Markdown格式文档，代码示例使用适当的编程语言。`,

  testing: `你是一位质量保证工程师。基于产品需求和开发文档，制定测试计划和执行测试。

产品需求文档：
{PRD}

开发实现指南：
{DEVELOPMENT}

请生成以下内容：

# 测试报告

## 1. 测试计划
- 测试范围
- 测试环境
- 测试工具

## 2. 功能测试
### 2.1 测试用例
（每个核心功能的测试用例，包含：用例ID、测试步骤、预期结果）

### 2.2 测试结果
（功能测试通过率和问题汇总）

## 3. 性能测试
- 响应时间
- 并发处理能力
- 资源使用情况

## 4. 兼容性测试
（浏览器、设备、操作系统兼容性）

## 5. 安全测试
（常见安全漏洞检查：XSS、SQL注入等）

## 6. Bug清单
（已发现的问题和修复建议）

## 7. 测试总结
（整体质量评估和改进建议）

请输出完整的Markdown格式文档。`,

  deployment: `你是一位运维工程师。基于架构设计，提供部署方案和上线checklist。

架构设计文档：
{ARCHITECTURE}

请生成以下内容：

# 部署文档

## 1. 服务器配置
- 服务器规格建议
- 操作系统
- 必要软件安装

## 2. 环境配置
### 2.1 生产环境变量
（环境变量列表和配置说明）

### 2.2 数据库配置
（数据库连接、权限设置）

## 3. 部署步骤
### 3.1 前端部署
（构建命令、静态资源上传、CDN配置）

### 3.2 后端部署
（代码部署、服务启动、进程守护）

## 4. 域名和SSL
- 域名解析
- HTTPS证书配置

## 5. 监控和日志
- 应用监控
- 错误日志
- 性能监控

## 6. 备份策略
- 数据库备份
- 代码备份

## 7. 上线Checklist
（上线前检查清单）

## 8. 回滚方案
（出现问题时的快速回滚步骤）

请输出完整的Markdown格式文档。`,

  operation: `你是一位运营专家。基于产品定位和用户需求，制定运营推广策略。

产品需求文档：
{PRD}

请生成以下内容：

# 运营推广方案

## 1. 运营目标
- 用户增长目标
- 活跃度目标
- 留存率目标

## 2. 用户画像
（目标用户细分和特征分析）

## 3. 推广策略
### 3.1 冷启动阶段（0-1000用户）
- 种子用户获取
- 早期推广渠道

### 3.2 增长阶段（1000-10000用户）
- 增长渠道
- 营销活动

### 3.3 规模化阶段（10000+用户）
- 付费推广
- 品牌建设

## 4. 内容运营
- 内容策略
- 内容日历
- UGC激励

## 5. 用户运营
- 用户分层
- 促活策略
- 留存策略

## 6. 数据分析
- 关键指标（DAU、留存率、转化率等）
- 数据埋点计划
- A/B测试计划

## 7. 预算分配
（各渠道预算建议）

## 8. 风险应对
（潜在风险和应对措施）

请输出完整的Markdown格式文档。`,

};

/**
 * 交付物类型的专门提示词
 */
const ARTIFACT_PROMPTS = {
  prd: `请生成完整的产品需求文档（PRD），包含：
1. 产品概述（产品名称、定位、目标用户、核心价值）
2. 功能需求（核心功能和辅助功能的详细描述）
3. 用户故事（以用户视角描述功能需求）
4. 功能优先级（P0/P1/P2划分）
5. 非功能性需求（性能、安全、兼容性要求）

请输出完整的Markdown格式文档。`,

  'user-story': `请生成用户故事文档，包含：
1. 用户角色定义（不同类型的用户及其特征）
2. 核心用户故事（格式：作为[角色]，我想要[功能]，以便[目的]）
3. 验收标准（每个用户故事的验收条件）
4. 优先级排序（按业务价值和实现难度排序）

请输出完整的Markdown格式文档。`,

  'feature-list': `请生成功能清单文档，包含：
1. 功能分类（按模块或功能域分类）
2. 功能列表（每个功能的名称、描述、优先级）
3. 功能依赖关系（功能之间的依赖和顺序）
4. 实现建议（技术实现的简要建议）

请输出完整的Markdown格式文档。`,

  'strategy-doc': `请输出完整的“战略设计文档”，格式必须严格遵循以下模板与结构（Markdown）：

# 📘 Agent 项目战略设计标准

---

## 🧭 目录

- [第一部分：战略目标与域划分](#第一部分战略目标与域划分)
  - [1.1 战略建模的目标](#11-战略建模的目标)
  - [1.2 子域划分与分析](#12-子域划分与分析)
- [第二部分：设计哲学与模式原则](#第二部分设计哲学与模式原则)
  - [2.1 能力驱动与流程驱动的对比](#21-能力驱动与流程驱动的对比)
  - [2.2 ReAct Loop + LLM 模式原则](#22-react-loop--llm-模式原则)
  - [2.3 常见设计误区](#23-常见设计误区)
- [第三部分：实现标准](#第三部分实现标准)
  - [3.1 Prompt 构造块设计原则](#31-prompt-构造块设计原则)
  - [3.2 工具设计原则](#32-工具设计原则)
  - [3.3 用户用例设计原则](#33-用户用例设计原则)
- [附录A：特别注意事项](#附录a特别注意事项)

---

## 第一部分：战略目标与域划分

### 1.1 战略建模的目标

说明本次战略设计的核心目标与范围。

---

### 1.2 子域划分与分析

请给出核心域、支撑域、通用域的划分与优先级，并给出简要分析。

---

## 第二部分：设计哲学与模式原则

### 2.1 能力驱动与流程驱动的对比

请用对比表说明两者差异，并点出本项目倾向。

---

### 2.2 ReAct Loop + LLM 模式原则

阐述 ReAct 循环的设计原则与适用场景，可使用流程图或要点列表。

---

### 2.3 常见设计误区

列举至少 3 条常见误区及规避建议。

---

## 第三部分：实现标准

### 3.1 Prompt 构造块设计原则

列出 Prompt 构造块的组成、定义与落地原则。

---

### 3.2 工具设计原则

列出工具设计三大原则（必要性、完备性、完美模型假设）及示例说明。

---

### 3.3 用户用例设计原则

用时序图或步骤列表示范关键用例设计方式。

---

## 附录A：特别注意事项

列出关键检查项与风险提醒。

---

输出要求：必须使用 Markdown，标题与结构完整，内容可执行、具体、可落地。`,

  'ui-design': `请生成UI设计方案文档，包含：
1. 设计目标（设计理念、视觉风格、用户体验目标）
2. 信息架构（页面结构和导航设计）
3. 界面设计（主要页面的布局和交互设计）
4. 组件库（UI组件规范：按钮、表单、卡片等）
5. 交互流程（关键功能的交互流程图）

请输出完整的Markdown格式文档。`,

  'design-spec': `请生成设计规范文档（Design Specification），包含：
1. 色彩系统
   - 主色调（Primary Color）及其色值
   - 辅助色（Secondary Color）
   - 中性色（灰度系统）
   - 语义色（成功、警告、错误、信息）
2. 字体规范
   - 字体家族
   - 字号体系（标题、正文、辅助文字）
   - 字重（Font Weight）
   - 行高（Line Height）
3. 间距规范
   - 基础间距单位
   - 组件内边距（Padding）
   - 组件外边距（Margin）
   - 栅格系统
4. 圆角规范
   - 按钮圆角
   - 卡片圆角
   - 输入框圆角
5. 阴影规范
   - 不同层级的阴影效果
6. 图标规范
   - 图标尺寸
   - 图标风格
   - 图标使用场景

请输出完整的Markdown格式文档，包含具体的数值和色值。`,

  prototype: `请生成一个简单的HTML原型页面，展示产品的核心界面。

要求：
1. 使用纯HTML + CSS实现，不依赖外部库
2. 包含产品的主要页面布局
3. 展示核心功能的界面设计
4. 使用现代化的设计风格
5. 响应式设计，适配不同屏幕尺寸
6. 包含必要的交互元素（按钮、表单、导航等）

请直接输出完整的HTML代码，从<!DOCTYPE html>开始。`
};

/**
 * 执行单个阶段任务
 * @param {String} projectId - 项目ID
 * @param {String} stageId - 阶段ID
 * @param {Object} context - 上下文数据
 * @returns {Promise<Array>} 生成的交付物数组
 */
function resolveStageDefinition(stageId) {
  const stage = getStageById(stageId);
  if (stage) {
    return stage;
  }
  if (stageId === 'strategy-requirement') {
    const strategy = getStageById('strategy');
    const requirement = getStageById('requirement');
    const recommendedAgents = Array.from(
      new Set(
        [
          ...(strategy?.recommendedAgents || []),
          ...(requirement?.recommendedAgents || [])
        ].filter(Boolean)
      )
    );
    const artifactTypes = Array.from(
      new Set(
        [
          ...(strategy?.artifactTypes || []),
          ...(requirement?.artifactTypes || [])
        ].filter(Boolean)
      )
    );
    return {
      id: 'strategy-requirement',
      name: '战略与需求',
      description: '战略建模与需求分析',
      recommendedAgents,
      artifactTypes
    };
  }
  return null;
}

function ensureStageDefinition(stageId) {
  const stage = resolveStageDefinition(stageId);
  if (!stage) {
    return null;
  }

  const fallback = getStageById(stageId);
  const recommendedAgents =
    Array.isArray(stage.recommendedAgents) && stage.recommendedAgents.length > 0
      ? stage.recommendedAgents
      : Array.isArray(fallback?.recommendedAgents)
        ? fallback.recommendedAgents
        : [];
  const artifactTypes =
    Array.isArray(stage.artifactTypes) && stage.artifactTypes.length > 0
      ? stage.artifactTypes
      : Array.isArray(fallback?.artifactTypes)
        ? fallback.artifactTypes
        : [];

  return {
    ...stage,
    recommendedAgents,
    artifactTypes
  };
}

async function loadProject(projectId) {
  const project = await projectRepository.findById(projectId);
  if (!project) {
    const err = new Error('项目不存在');
    err.status = 404;
    throw err;
  }
  return project;
}

function getStageArtifactsFromProject(project, stageId) {
  const workflow = project.workflow;
  if (!workflow) {
    return [];
  }
  const stage = workflow.getStage(stageId);
  if (!stage) {
    return [];
  }
  return Array.isArray(stage.artifacts) ? stage.artifacts : [];
}

function normalizeArtifactsForResponse(stageId, artifactsList = []) {
  return (artifactsList || []).map(artifact => ({
    ...artifact,
    stageId: artifact?.stageId || stageId
  }));
}

function resolveProjectStageIds(project, stageId) {
  if (stageId !== 'strategy-requirement') {
    return [stageId];
  }
  const workflow = project.workflow;
  if (!workflow) {
    return [];
  }
  const candidates = ['strategy', 'requirement'];
  const matched = candidates.filter(id => workflow.getStage(id));
  if (matched.length > 0) {
    return matched;
  }
  const fallback = workflow.stages?.[0]?.id;
  return fallback ? [fallback] : [];
}

const STRATEGY_STAGE_ARTIFACTS = new Set(['strategy-doc']);

async function executeStage(projectId, stageId, context = {}) {
  const normalizedStageId = normalizeStageId(stageId);
  const stage = ensureStageDefinition(normalizedStageId);
  if (!stage) {
    const err = new Error(`无效的阶段ID: ${stageId}`);
    err.status = 400;
    throw err;
  }

  // 获取阶段提示词模板
  const promptTemplate = STAGE_PROMPTS[normalizedStageId];
  if (!promptTemplate) {
    const err = new Error(`阶段 ${normalizedStageId} 没有定义提示词模板`);
    err.status = 400;
    throw err;
  }

  const project = await loadProject(projectId);
  const stageIdsForProject = resolveProjectStageIds(project, normalizedStageId);
  if (stageIdsForProject.length === 0) {
    const err = new Error(`项目工作流未包含阶段: ${normalizedStageId}`);
    err.status = 400;
    throw err;
  }
  const existingStageArtifacts = stageIdsForProject.flatMap(stageId =>
    getStageArtifactsFromProject(project, stageId)
  );

  // 替换上下文变量
  let basePrompt = promptTemplate;
  for (const [key, value] of Object.entries(context)) {
    basePrompt = basePrompt.replace(new RegExp(`{${key}}`, 'g'), value || '');
  }

  const selectedArtifactTypes = Array.isArray(context?.selectedArtifactTypes)
    ? context.selectedArtifactTypes
    : [];
  const effectiveArtifactTypes =
    selectedArtifactTypes.length > 0
      ? (stage.artifactTypes || []).filter(type => selectedArtifactTypes.includes(type))
      : stage.artifactTypes || [];
  if (selectedArtifactTypes.length > 0 && effectiveArtifactTypes.length === 0) {
    const err = new Error('未选择有效的交付物类型');
    err.status = 400;
    throw err;
  }

  const normalizedExistingArtifacts = normalizeArtifactsForResponse(
    normalizedStageId,
    existingStageArtifacts
  );
  const hasExplicitSelection = selectedArtifactTypes.length > 0;
  if (!hasExplicitSelection && normalizedExistingArtifacts.length > 0) {
    console.info('[Workflow] execute-stage skip model', {
      projectId,
      stageId: normalizedStageId,
      reason: 'existing_artifacts',
      artifactCount: normalizedExistingArtifacts.length
    });
    return normalizedExistingArtifacts;
  }
  if (effectiveArtifactTypes.length === 0) {
    if (normalizedExistingArtifacts.length > 0) {
      console.info('[Workflow] execute-stage skip model', {
        projectId,
        stageId: normalizedStageId,
        reason: 'no_effective_types',
        artifactCount: normalizedExistingArtifacts.length
      });
      return normalizedExistingArtifacts;
    }
    const err = new Error('阶段未配置交付物类型');
    err.status = 400;
    throw err;
  }

  const existingByType = new Map();
  normalizedExistingArtifacts.forEach(artifact => {
    if (artifact?.type && !existingByType.has(artifact.type)) {
      existingByType.set(artifact.type, artifact);
    }
  });
  const missingTypes = effectiveArtifactTypes.filter(type => !existingByType.has(type));
  if (missingTypes.length === 0) {
    console.info('[Workflow] execute-stage skip model', {
      projectId,
      stageId: normalizedStageId,
      reason: 'no_missing_types',
      artifactCount: effectiveArtifactTypes.length
    });
    const existingArtifacts = effectiveArtifactTypes
      .map(type => existingByType.get(type))
      .filter(Boolean);
    return existingArtifacts;
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey === 'sk-your-api-key-here') {
    const err = new Error('DEEPSEEK_API_KEY 未配置或无效，请在后端 .env 中设置');
    err.status = 400;
    throw err;
  }

  // 创建交付物
  const generatedArtifacts = [];

  // 如果只有一个交付物类型，使用原有逻辑
  if (missingTypes.length === 1) {
    console.info('[Workflow] execute-stage call model', {
      projectId,
      stageId: normalizedStageId,
      artifactType: missingTypes[0],
      promptChars: basePrompt.length
    });
    const result = await callDeepSeekAPI([{ role: 'user', content: basePrompt }], null, {
      max_tokens: 4000,
      temperature: 0.7
    });

    const usage = result?.usage || { total_tokens: 0 };
    console.info('[Workflow] execute-stage model response', {
      projectId,
      stageId: normalizedStageId,
      artifactType: missingTypes[0],
      tokens: usage.total_tokens || 0
    });
    const artifact = {
      id: `artifact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      projectId,
      stageId: normalizedStageId,
      type: missingTypes[0],
      name: getArtifactName(missingTypes[0]),
      content: result.content,
      agentName: getAgentName(stage.recommendedAgents[0]),
      source: 'model',
      createdAt: Date.now(),
      tokens: usage.total_tokens || 0
    };
    generatedArtifacts.push(artifact);
  } else {
    // 如果有多个交付物类型，为每个类型生成专门的内容
    for (const artifactType of missingTypes) {
      // 构建针对该交付物类型的提示词
      const artifactPrompt = ARTIFACT_PROMPTS[artifactType];
      let finalPrompt = basePrompt;
      const artifactName = getArtifactName(artifactType);

      if (artifactPrompt) {
        // 如果有专门的交付物提示词，追加到基础提示词后
        finalPrompt = `${basePrompt}\n\n${artifactPrompt}`;
      } else if (artifactName && artifactName !== artifactType) {
        finalPrompt = `${basePrompt}\n\n请仅输出《${artifactName}》对应内容，输出为完整的Markdown格式文档。`;
      } else {
        finalPrompt = `${basePrompt}\n\n请仅输出该交付物对应内容，输出为完整的Markdown格式文档。`;
      }

      // 调用AI生成该交付物的内容
      console.info('[Workflow] execute-stage call model', {
        projectId,
        stageId: normalizedStageId,
        artifactType,
        promptChars: finalPrompt.length
      });
      const result = await callDeepSeekAPI([{ role: 'user', content: finalPrompt }], null, {
        max_tokens: 4000,
        temperature: 0.7
      });

      const usage = result?.usage || { total_tokens: 0 };
      console.info('[Workflow] execute-stage model response', {
        projectId,
        stageId: normalizedStageId,
        artifactType,
        tokens: usage.total_tokens || 0
      });
      const artifact = {
        id: `artifact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        projectId,
        stageId: normalizedStageId,
        type: artifactType,
        name: getArtifactName(artifactType),
        content: result.content,
        agentName: getAgentName(stage.recommendedAgents[0]),
        source: 'model',
        createdAt: Date.now(),
        tokens: usage.total_tokens || 0
      };
      generatedArtifacts.push(artifact);

      // 添加延迟，避免API调用过快
      if (missingTypes.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  // 保存交付物到数据库
  if (generatedArtifacts.length > 0 && project.workflow) {
    generatedArtifacts.forEach(artifact => {
      let targetStageId = normalizedStageId;
      if (normalizedStageId === 'strategy-requirement') {
        const hasStrategy = project.workflow.getStage('strategy');
        const hasRequirement = project.workflow.getStage('requirement');
        const fallbackStage = project.workflow.stages?.[0]?.id;
        if (STRATEGY_STAGE_ARTIFACTS.has(artifact.type)) {
          targetStageId = hasStrategy
            ? 'strategy'
            : hasRequirement
              ? 'requirement'
              : fallbackStage || normalizedStageId;
        } else {
          targetStageId = hasRequirement
            ? 'requirement'
            : hasStrategy
              ? 'strategy'
              : fallbackStage || normalizedStageId;
        }
      }
      project.workflow.addArtifact(targetStageId, artifact);
    });
    await projectRepository.save(project);
  }

  const existingArtifacts = effectiveArtifactTypes
    .map(type => existingByType.get(type))
    .filter(Boolean);
  return [...existingArtifacts, ...generatedArtifacts];
}

/**
 * 获取交付物名称
 */
function getArtifactName(artifactType) {
  const typeMap = {
    prd: '产品需求文档',
    'user-story': '用户故事',
    'feature-list': '功能清单',
    'ui-design': 'UI设计方案',
    'design-spec': '设计规范',
    prototype: '交互原型',
    'architecture-doc': '系统架构设计',
    code: '开发实现指南',
    'strategy-doc': '战略设计文档',
    'core-prompt-design': '核心引导逻辑Prompt设计',
    'test-report': '测试报告',
    'deploy-doc': '部署文档',
    'marketing-plan': '运营推广方案'
  };
  return typeMap[artifactType] || artifactType;
}

/**
 * 获取Agent名称
 */
function getAgentName(agentType) {
  const nameMap = {
    'strategy-design': '战略设计师',
    'product-manager': '产品经理',
    'ui-ux-designer': 'UI/UX设计师',
    'tech-lead': '技术负责人',
    'backend-developer': '后端开发',
    'frontend-developer': '前端开发',
    'qa-engineer': '测试工程师',
    devops: '运维工程师',
    marketing: '营销专家',
    operations: '运营专家'
  };
  return nameMap[agentType] || agentType;
}

/**
 * POST /api/workflow/:projectId/execute-stage
 * 执行单个阶段
 */
router.post('/:projectId/execute-stage', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { stageId, context = {}, selectedArtifactTypes } = req.body;

    if (!stageId) {
      return res.status(400).json({
        code: -1,
        error: '缺少参数: stageId'
      });
    }

    if (Array.isArray(selectedArtifactTypes) && selectedArtifactTypes.length > 0) {
      context.selectedArtifactTypes = selectedArtifactTypes;
    }
    const generatedArtifacts = await executeStage(projectId, stageId, context);

    res.json({
      code: 0,
      data: {
        stageId: normalizeStageId(stageId),
        artifacts: generatedArtifacts,
        totalTokens: generatedArtifacts.reduce((sum, a) => sum + (a.tokens || 0), 0)
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/workflow/:projectId/execute-batch
 * 批量执行阶段任务
 */
router.post('/:projectId/execute-batch', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { stageIds, conversation } = req.body;

    if (!stageIds || !Array.isArray(stageIds) || stageIds.length === 0) {
      return res.status(400).json({
        code: -1,
        error: '缺少或无效的stageIds'
      });
    }

    const results = [];
    const context = {
      CONVERSATION: conversation || ''
    };

    // 依次执行每个阶段，后续阶段可以访问前面阶段的产物
    for (const stageId of stageIds) {
      const generatedArtifacts = await executeStage(projectId, stageId, context);

      // 将当前阶段的产物添加到上下文中，供后续阶段使用
      if (generatedArtifacts.length > 0) {
        const mainArtifact = generatedArtifacts[0];
        context[stageId.toUpperCase()] = mainArtifact.content;

        // 特殊处理：PRD、DESIGN、ARCHITECTURE等作为常用上下文
        if (stageId === 'requirement') {
          context.PRD = mainArtifact.content;
        } else if (stageId === 'design') {
          context.DESIGN = mainArtifact.content;
        } else if (stageId === 'architecture') {
          context.ARCHITECTURE = mainArtifact.content;
        } else if (stageId === 'development') {
          context.DEVELOPMENT = mainArtifact.content;
        }
      }

      results.push({
        stageId,
        artifacts: generatedArtifacts
      });
    }

    const totalTokens = results.reduce(
      (sum, r) => sum + r.artifacts.reduce((s, a) => s + (a.tokens || 0), 0),
      0
    );

    res.json({
      code: 0,
      data: {
        results,
        totalTokens,
        completedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/workflow/:projectId/stages/:stageId/artifacts
 * 获取阶段交付物
 */
router.get('/:projectId/stages/:stageId/artifacts', async (req, res, next) => {
  try {
    const { projectId, stageId } = req.params;
    const normalizedStageId = normalizeStageId(stageId);
    const project = await loadProject(projectId);
    const stageIdsForProject = resolveProjectStageIds(project, normalizedStageId);
    const stageArtifacts = normalizeArtifactsForResponse(
      normalizedStageId,
      stageIdsForProject.flatMap(id => getStageArtifactsFromProject(project, id))
    );

    res.json({
      code: 0,
      data: {
        stageId: normalizedStageId,
        artifacts: stageArtifacts
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/workflow/:projectId/artifacts
 * 获取项目所有交付物
 */
router.get('/:projectId/artifacts', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await loadProject(projectId);
    const workflow = project.workflow?.toJSON ? project.workflow.toJSON() : project.workflow;
    const workflowStages = Array.isArray(workflow?.stages) ? workflow.stages : [];
    const stageArtifacts = collectProjectArtifacts(workflowStages);

    const allArtifacts = [];
    for (const [stageId, artifactsList] of stageArtifacts.entries()) {
      allArtifacts.push(...normalizeArtifactsForResponse(stageId, artifactsList));
    }

    res.json({
      code: 0,
      data: {
        total: allArtifacts.length,
        artifacts: allArtifacts
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/workflow/:projectId/artifacts/:artifactId
 * 删除交付物
 */
router.delete('/:projectId/artifacts/:artifactId', async (req, res, next) => {
  try {
    const { projectId, artifactId } = req.params;
    const project = await loadProject(projectId);
    const workflow = project.workflow;
    if (!workflow) {
      return res.status(404).json({
        code: -1,
        error: '项目不存在'
      });
    }

    let deleted = false;
    const stages = workflow.stages || [];
    for (const stage of stages) {
      if (stage?.artifacts?.some(a => a.id === artifactId)) {
        deleted = workflow.removeArtifact(stage.id, artifactId);
        break;
      }
    }

    if (!deleted) {
      return res.status(404).json({
        code: -1,
        error: '交付物不存在'
      });
    }

    await projectRepository.save(project);

    res.json({
      code: 0,
      message: '交付物已删除'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/workflow/:projectId/deploy-readiness
 * 基于ReAct Loop评估项目是否满足“可部署交付”的目标
 * body: { goal?: string, idea?: string, conversation?: string }
 */
router.post('/:projectId/deploy-readiness', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { goal, idea, conversation } = req.body || {};

    const project = await projectRepository.findById(projectId);
    if (!project) {
      return res.status(404).json({ code: -1, error: '项目不存在' });
    }

    const workflow = project.workflow?.toJSON ? project.workflow.toJSON() : project.workflow;
    const workflowStages = Array.isArray(workflow?.stages) ? workflow.stages : [];
    const stageArtifacts = collectProjectArtifacts(workflowStages);

    const stageBrief = workflowStages.map(stage => ({
      id: stage.id,
      name: stage.name,
      description: stage.description || '',
      agents: Array.isArray(stage.agents) ? stage.agents : [],
      outputs: Array.isArray(stage.outputs) ? stage.outputs : [],
      outputsDetailed: Array.isArray(stage.outputsDetailed) ? stage.outputsDetailed : []
    }));

    const deliverablesCatalog = Object.entries(ARTIFACT_TYPES).map(([id, def]) => ({
      id,
      name: def?.name || id,
      description: def?.description || '',
      templates: Array.isArray(def?.promptTemplates) ? def.promptTemplates : []
    }));

    const roleTemplateMapping = buildRoleTemplateMapping();
    const targetGoal = goal || '输出一个可实际交付部署的完整产品';

    // ReAct Loop Step 1: 规划阶段所需的关键交付物
    const step1Prompt = `你是项目交付物规划专家。目标是：${targetGoal}

【创意】
${idea || '未提供'}

【对话摘要】
${conversation || '未提供'}

【角色与交付物模板映射（仅能从映射中选择）】
${JSON.stringify(roleTemplateMapping, null, 2)}

【阶段列表】
${JSON.stringify(stageBrief, null, 2)}

【交付物类型库（仅能从以下id中选择，必须基于现有模板）】
${JSON.stringify(deliverablesCatalog, null, 2)}

请输出JSON：
{
  "requiredByStage": { "stageId": ["deliverableTypeId", "..."] },
  "criticalDeliverables": ["deliverableTypeId", "..."],
  "notes": "简短说明"
}

要求：
1. 每个阶段至少选择1个交付物类型
2. 必须来自交付物类型库
3. requiredByStage 内的类型必须与阶段输出和角色职责匹配`;

    const step1Result = await callDeepSeekAPI([{ role: 'user', content: step1Prompt }], null, {
      max_tokens: 1200,
      temperature: 0.2,
      timeout: 90000
    });

    const step1Parsed = parseJsonPayload(step1Result?.content) || {};
    const requiredByStage = step1Parsed.requiredByStage || {};
    const criticalDeliverables = Array.isArray(step1Parsed.criticalDeliverables)
      ? step1Parsed.criticalDeliverables
      : [];

    // 计算缺失交付物
    const missingByStage = {};
    const availableByStage = {};
    workflowStages.forEach(stage => {
      const stageId = stage.id;
      const required = Array.isArray(requiredByStage?.[stageId]) ? requiredByStage[stageId] : [];
      const artifactsForStage = Array.isArray(stageArtifacts.get(stageId))
        ? stageArtifacts.get(stageId)
        : [];
      const actualTypes = artifactsForStage
        .map(a => normalizeOutputToTypeId(a?.type || a?.name))
        .filter(Boolean);

      const actualSet = new Set(actualTypes);
      const missing = required.filter(type => !actualSet.has(type));
      if (missing.length > 0) {
        missingByStage[stageId] = missing;
      }
      availableByStage[stageId] = Array.from(new Set(actualTypes));
    });

    const overallMissingCritical = criticalDeliverables.filter(type => {
      return !Object.values(availableByStage).some(list => list.includes(type));
    });

    // ReAct Loop Step 2: 基于缺失情况给出部署可交付性判断
    const step2Prompt = `你是项目交付评估专家。目标是：${targetGoal}

【阶段要求】
${JSON.stringify(requiredByStage, null, 2)}

【阶段已产出交付物】
${JSON.stringify(availableByStage, null, 2)}

【缺失交付物】
${JSON.stringify(missingByStage, null, 2)}

【关键交付物缺失】
${JSON.stringify(overallMissingCritical, null, 2)}

请输出JSON：
{
  "isDeployable": true/false,
  "riskLevel": "low|medium|high",
  "summary": "简短结论",
  "nextActions": ["动作1", "动作2", "..."],
  "stageGaps": [{ "stageId": "阶段", "missing": ["类型"], "impact": "影响说明" }]
}

要求：仅输出JSON，避免额外解释。`;

    const step2Result = await callDeepSeekAPI([{ role: 'user', content: step2Prompt }], null, {
      max_tokens: 1000,
      temperature: 0.2,
      timeout: 90000
    });

    const step2Parsed = parseJsonPayload(step2Result?.content) || {};

    res.json({
      code: 0,
      data: {
        goal: targetGoal,
        requiredByStage,
        criticalDeliverables,
        availableByStage,
        missingByStage,
        missingCritical: overallMissingCritical,
        assessment: step2Parsed,
        method: 'react-loop'
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
