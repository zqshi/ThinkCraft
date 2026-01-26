/**
 * 工作流执行 API
 * 协同开发模式的阶段任务执行
 */
import express from 'express';
import { callDeepSeekAPI } from '../../../../../../config/deepseek.js';
import {
    DEFAULT_WORKFLOW_STAGES,
    getStageById,
    getRecommendedAgents
} from '../../../../../../config/workflow-stages.js';

const router = express.Router();

// 内存存储（实际应该使用数据库）
const artifacts = new Map(); // key: projectId, value: Map<stageId, Array<artifact>>

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

请输出完整的Markdown格式文档。`
};

/**
 * 执行单个阶段任务
 * @param {String} projectId - 项目ID
 * @param {String} stageId - 阶段ID
 * @param {Object} context - 上下文数据
 * @returns {Promise<Array>} 生成的交付物数组
 */
async function executeStage(projectId, stageId, context = {}) {
    const stage = getStageById(stageId);
    if (!stage) {
        throw new Error(`无效的阶段ID: ${stageId}`);
    }

    `);

    // 获取阶段提示词模板
    let promptTemplate = STAGE_PROMPTS[stageId];
    if (!promptTemplate) {
        throw new Error(`阶段 ${stageId} 没有定义提示词模板`);
    }

    // 替换上下文变量
    let prompt = promptTemplate;
    for (const [key, value] of Object.entries(context)) {
        prompt = prompt.replace(new RegExp(`{${key}}`, 'g'), value || '');
    }

    // 调用AI生成内容
    const result = await callDeepSeekAPI(
        [{ role: 'user', content: prompt }],
        null,
        {
            max_tokens: 4000,
            temperature: 0.7
        }
    );

    // 创建交付物
    const generatedArtifacts = [];
    for (const artifactType of stage.artifactTypes) {
        const artifact = {
            id: `artifact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            projectId,
            stageId,
            type: artifactType,
            name: getArtifactName(artifactType),
            content: result.content,
            agentName: getAgentName(stage.recommendedAgents[0]),
            createdAt: Date.now(),
            tokens: result.usage.total_tokens
        };
        generatedArtifacts.push(artifact);
    }

    // 保存交付物
    if (!artifacts.has(projectId)) {
        artifacts.set(projectId, new Map());
    }
    const projectArtifacts = artifacts.get(projectId);
    if (!projectArtifacts.has(stageId)) {
        projectArtifacts.set(stageId, []);
    }
    projectArtifacts.get(stageId).push(...generatedArtifacts);

    return generatedArtifacts;
}

/**
 * 获取交付物名称
 */
function getArtifactName(artifactType) {
    const typeMap = {
        'prd': '产品需求文档',
        'ui-design': 'UI设计方案',
        'architecture-doc': '系统架构设计',
        'code': '开发实现指南',
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
        'product-manager': '产品经理',
        'designer': 'UI设计师',
        'backend-dev': '后端工程师',
        'frontend-dev': '前端工程师',
        'data-analyst': '测试工程师',
        'marketing': '运营专家',
        'operations': '运营专家'
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
        const { stageId, context } = req.body;

        if (!stageId) {
            return res.status(400).json({
                code: -1,
                error: '缺少参数: stageId'
            });
        }

        const generatedArtifacts = await executeStage(projectId, stageId, context);

        res.json({
            code: 0,
            data: {
                stageId,
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
        let context = {
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

        const totalTokens = results.reduce((sum, r) =>
            sum + r.artifacts.reduce((s, a) => s + (a.tokens || 0), 0), 0
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
router.get('/:projectId/stages/:stageId/artifacts', (req, res, next) => {
    try {
        const { projectId, stageId } = req.params;

        const projectArtifacts = artifacts.get(projectId);
        if (!projectArtifacts) {
            return res.json({
                code: 0,
                data: {
                    artifacts: []
                }
            });
        }

        const stageArtifacts = projectArtifacts.get(stageId) || [];

        res.json({
            code: 0,
            data: {
                stageId,
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
router.get('/:projectId/artifacts', (req, res, next) => {
    try {
        const { projectId } = req.params;

        const projectArtifacts = artifacts.get(projectId);
        if (!projectArtifacts) {
            return res.json({
                code: 0,
                data: {
                    artifacts: []
                }
            });
        }

        // 将所有阶段的交付物合并
        const allArtifacts = [];
        for (const [stageId, stageArtifacts] of projectArtifacts.entries()) {
            allArtifacts.push(...stageArtifacts);
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
router.delete('/:projectId/artifacts/:artifactId', (req, res, next) => {
    try {
        const { projectId, artifactId } = req.params;

        const projectArtifacts = artifacts.get(projectId);
        if (!projectArtifacts) {
            return res.status(404).json({
                code: -1,
                error: '项目不存在'
            });
        }

        let deleted = false;
        for (const [stageId, stageArtifacts] of projectArtifacts.entries()) {
            const index = stageArtifacts.findIndex(a => a.id === artifactId);
            if (index !== -1) {
                stageArtifacts.splice(index, 1);
                deleted = true;
                break;
            }
        }

        if (!deleted) {
            return res.status(404).json({
                code: -1,
                error: '交付物不存在'
            });
        }

        res.json({
            code: 0,
            message: '交付物已删除'
        });

    } catch (error) {
        next(error);
    }
});

export default router;
