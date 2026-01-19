/**
 * 工作流推荐 API
 * 基于项目类型和需求智能推荐工作流配置
 */
import express from 'express';
import { callDeepSeekAPI } from '../config/deepseek.js';
import { DEFAULT_WORKFLOW_STAGES } from '../config/workflow-stages.js';

const router = express.Router();

/**
 * 项目类型预设工作流模板
 */
const WORKFLOW_TEMPLATES = {
    'web-app': {
        name: 'Web应用开发',
        description: '适合SaaS、网站、WebApp等项目',
        stages: ['requirement', 'design', 'architecture', 'development', 'testing', 'deployment', 'operation'],
        priority: ['requirement', 'design', 'development', 'testing'],
        optional: ['operation']
    },
    'mobile-app': {
        name: '移动应用开发',
        description: '适合iOS、Android应用项目',
        stages: ['requirement', 'design', 'architecture', 'development', 'testing', 'deployment', 'operation'],
        priority: ['requirement', 'design', 'development', 'testing', 'deployment'],
        optional: []
    },
    'mini-program': {
        name: '小程序开发',
        description: '适合微信小程序、支付宝小程序等',
        stages: ['requirement', 'design', 'development', 'testing', 'deployment', 'operation'],
        priority: ['requirement', 'design', 'development'],
        optional: ['architecture']
    },
    'saas-platform': {
        name: 'SaaS平台',
        description: '适合企业级SaaS产品',
        stages: ['requirement', 'design', 'architecture', 'development', 'testing', 'deployment', 'operation'],
        priority: ['requirement', 'architecture', 'development', 'testing', 'deployment', 'operation'],
        optional: []
    },
    'mvp': {
        name: 'MVP快速验证',
        description: '最小可行产品，快速验证创意',
        stages: ['requirement', 'design', 'development', 'testing'],
        priority: ['requirement', 'development'],
        optional: ['design', 'testing']
    },
    'enterprise-system': {
        name: '企业级系统',
        description: '适合ERP、CRM等大型系统',
        stages: ['requirement', 'design', 'architecture', 'development', 'testing', 'deployment', 'operation'],
        priority: ['requirement', 'architecture', 'development', 'testing', 'deployment'],
        optional: []
    },
    'content-platform': {
        name: '内容平台',
        description: '适合博客、媒体、社区等内容型产品',
        stages: ['requirement', 'design', 'development', 'testing', 'deployment', 'operation'],
        priority: ['requirement', 'design', 'development', 'operation'],
        optional: ['architecture']
    },
    'e-commerce': {
        name: '电商平台',
        description: '适合电商、交易型产品',
        stages: ['requirement', 'design', 'architecture', 'development', 'testing', 'deployment', 'operation'],
        priority: ['requirement', 'architecture', 'development', 'testing', 'deployment', 'operation'],
        optional: []
    }
};

/**
 * POST /api/workflow-recommendation/analyze
 * 分析项目需求，推荐工作流配置
 */
router.post('/analyze', async (req, res, next) => {
    try {
        const { projectName, projectDescription, conversation } = req.body;

        if (!projectName && !projectDescription && !conversation) {
            return res.status(400).json({
                code: -1,
                error: '请提供项目信息（名称、描述或对话内容）'
            });
        }

        console.log('[WorkflowRecommendation] 开始分析项目...');

        // 构建分析提示词
        const analysisPrompt = `你是一位资深的项目管理专家。请分析以下项目信息，推荐最合适的开发工作流配置。

项目信息：
项目名称：${projectName || '未提供'}
项目描述：${projectDescription || '未提供'}

${conversation ? `创意对话内容：\n${conversation}\n` : ''}

可选的项目类型：
1. web-app - Web应用开发（SaaS、网站、WebApp）
2. mobile-app - 移动应用开发（iOS、Android）
3. mini-program - 小程序开发（微信、支付宝）
4. saas-platform - SaaS平台（企业级产品）
5. mvp - MVP快速验证（最小可行产品）
6. enterprise-system - 企业级系统（ERP、CRM）
7. content-platform - 内容平台（博客、媒体、社区）
8. e-commerce - 电商平台（交易型产品）

请以JSON格式返回分析结果：
{
  "projectType": "最匹配的项目类型代码",
  "confidence": 0.95,
  "reasoning": "推荐理由（1-2句话）",
  "suggestedStages": ["建议的阶段ID数组"],
  "estimatedDuration": 30,
  "complexity": "low|medium|high",
  "recommendations": [
    "具体建议1",
    "具体建议2"
  ]
}

只返回JSON，不要其他文字。`;

        // 调用AI分析
        const result = await callDeepSeekAPI(
            [{ role: 'user', content: analysisPrompt }],
            null,
            {
                max_tokens: 1000,
                temperature: 0.3  // 降低温度以获得更稳定的分析结果
            }
        );

        // 解析AI返回的JSON
        let analysis;
        try {
            const jsonMatch = result.content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('AI返回格式错误');
            }
            analysis = JSON.parse(jsonMatch[0]);
        } catch (error) {
            console.error('[WorkflowRecommendation] 解析AI结果失败:', error);
            // 使用默认推荐
            analysis = {
                projectType: 'web-app',
                confidence: 0.7,
                reasoning: '基于通用Web应用模板推荐',
                suggestedStages: ['requirement', 'design', 'architecture', 'development', 'testing', 'deployment'],
                estimatedDuration: 30,
                complexity: 'medium',
                recommendations: [
                    '建议按照标准流程执行',
                    '可根据实际情况调整阶段'
                ]
            };
        }

        // 获取推荐的工作流模板
        const template = WORKFLOW_TEMPLATES[analysis.projectType] || WORKFLOW_TEMPLATES['web-app'];

        // 构建完整的工作流配置
        const workflowConfig = {
            template: template,
            stages: analysis.suggestedStages.map(stageId => {
                const stageDef = DEFAULT_WORKFLOW_STAGES.find(s => s.id === stageId);
                return {
                    id: stageId,
                    name: stageDef?.name || stageId,
                    isPriority: template.priority.includes(stageId),
                    isOptional: template.optional.includes(stageId)
                };
            }),
            analysis: {
                projectType: analysis.projectType,
                confidence: analysis.confidence,
                reasoning: analysis.reasoning,
                estimatedDuration: analysis.estimatedDuration,
                complexity: analysis.complexity,
                recommendations: analysis.recommendations
            }
        };

        console.log('[WorkflowRecommendation] ✓ 分析完成');

        res.json({
            code: 0,
            data: workflowConfig
        });

    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/workflow-recommendation/templates
 * 获取所有预设工作流模板
 */
router.get('/templates', (req, res) => {
    res.json({
        code: 0,
        data: {
            templates: Object.entries(WORKFLOW_TEMPLATES).map(([key, template]) => ({
                id: key,
                ...template
            }))
        }
    });
});

/**
 * POST /api/workflow-recommendation/customize
 * 根据用户选择定制工作流
 */
router.post('/customize', (req, res, next) => {
    try {
        const { templateId, selectedStages, customStages } = req.body;

        let stages = [];

        if (customStages && Array.isArray(customStages)) {
            // 用户完全自定义
            stages = customStages;
        } else if (templateId && selectedStages) {
            // 基于模板定制
            const template = WORKFLOW_TEMPLATES[templateId];
            if (!template) {
                return res.status(400).json({
                    code: -1,
                    error: '模板不存在'
                });
            }

            stages = selectedStages.map(stageId => {
                const stageDef = DEFAULT_WORKFLOW_STAGES.find(s => s.id === stageId);
                return {
                    id: stageId,
                    name: stageDef?.name || stageId,
                    description: stageDef?.description || '',
                    status: 'pending'
                };
            });
        } else {
            return res.status(400).json({
                code: -1,
                error: '请提供模板ID和选择的阶段，或自定义阶段'
            });
        }

        console.log('[WorkflowRecommendation] 定制工作流完成');

        res.json({
            code: 0,
            data: {
                workflow: {
                    stages,
                    customized: true,
                    createdAt: Date.now()
                }
            }
        });

    } catch (error) {
        next(error);
    }
});

export default router;
