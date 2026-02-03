/**
 * 项目管理路由
 * 提供完整的项目API
 */
import express from 'express';
import { projectController } from './project.controller.js';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { DEFAULT_WORKFLOW_STAGES, ARTIFACT_TYPES } from '../../../../config/workflow-stages.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * POST /api/projects
 * 创建项目
 * 请求体: { ideaId: string, name: string, mode?: 'development' }
 * 响应: { code: number, message: string, data: { project: object, workflow?: object } }
 */
router.post('/', projectController.createProject);

/**
 * POST /api/projects/cleanup
 * 清理项目空间数据（仅开发环境）
 * 响应: { code: number, message: string, data: { projects: number, businessPlans: number, analysisReports: number } }
 */
router.post('/cleanup', projectController.clearProjectSpace);

/**
 * GET /api/projects/:id
 * 获取项目详情
 * 响应: { code: number, message: string, data: { project: object, stages: array, artifacts: array } }
 */
/**
 * PUT /api/projects/:id
 * 更新项目
 * 请求体: { name?: string, status?: string, ... }
 * 响应: { code: number, message: string, data: { project: object } }
 */
router.put('/:id', projectController.updateProject);

/**
 * DELETE /api/projects/:id
 * 删除项目
 * 响应: { code: number, message: string, data: { success: boolean } }
 */
router.delete('/:id', projectController.deleteProject);

/**
 * PUT /api/projects/:id/workflow
 * 自定义工作流
 * 请求体: { stages: array }
 * 响应: { code: number, message: string, data: { workflow: object } }
 */
router.put('/:id/workflow', projectController.customizeWorkflow);

/**
 * GET /api/projects/by-idea/:ideaId
 * 根据创意ID获取项目
 * 响应: { code: number, message: string, data: { project: object } }
 */
router.get('/by-idea/:ideaId', projectController.getProjectByIdeaId);

/**
 * GET /api/projects/:id
 * 获取项目详情
 * 响应: { code: number, message: string, data: { project: object, stages: array, artifacts: array } }
 */
router.get('/:id', projectController.getProject);

/**
 * GET /api/projects
 * 获取所有项目
 * 查询参数: ?mode=development&status=planning|...\u0026limit=10\u0026offset=0\u0026sortBy=updatedAt
 * 响应: { code: number, message: string, data: { projects: array, total: number } }
 */
router.get('/', projectController.getAllProjects);

/**
 * GET /api/projects/statistics
 * 获取项目统计信息
 * 响应: { code: number, message: string, data: { totalCount: number, countByStatus: object, countByMode: object, recentProjects: array } }
 */
router.get('/statistics', projectController.getProjectStatistics);

/**
 * GET /api/projects/search
 * 搜索项目
 * 查询参数: ?q=搜索词\u0026mode=development\u0026status=planning|...
 * 响应: { code: number, message: string, data: { projects: array, total: number } }
 */
router.get('/search', projectController.searchProjects);

/**
 * GET /api/projects/:id/progress
 * 获取项目进度
 * 响应: { code: number, message: string, data: { percentage: number, currentStage: object, completedStages: number, totalStages: number } }
 */
router.get('/:id/progress', projectController.getProjectProgress);

/**
 * GET /api/projects/:id/related
 * 获取相关项目
 * 查询参数: ?limit=5
 * 响应: { code: number, message: string, data: { projects: array, total: number } }
 */
router.get('/:id/related', projectController.getRelatedProjects);

/**
 * POST /api/projects/:id/archive
 * 归档项目
 * 响应: { code: number, message: string, data: { project: object } }
 */
router.post('/:id/archive', projectController.archiveProject);

/**
 * POST /api/projects/:id/duplicate
 * 复制项目
 * 请求体: { name?: string }
 * 响应: { code: number, message: string, data: { project: object, workflow?: object } }
 */
router.post('/:id/duplicate', projectController.duplicateProject);

/**
 * POST /api/projects/batch-update-status
 * 批量更新项目状态
 * 请求体: { projectIds: array, status: string }
 * 响应: { code: number, message: string, data: { results: array, total: number, successCount: number, failureCount: number } }
 */
router.post('/batch-update-status', projectController.batchUpdateStatus);

/**
 * 健康检查端点
 */
router.get('/health', (req, res) => {
  res.json({
    code: 0,
    message: 'Projects服务正常运行',
    data: {
      service: 'projects',
      status: 'healthy',
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * GET /api/projects/workflow-config/:category
 * 获取指定类型的工作流配置
 * 参数: category - 工作流类型（如 'product-development'）
 * 响应: { code: number, message: string, data: { workflowId, workflowName, description, stages } }
 */
router.get('/workflow-config/:category', async (req, res) => {
  try {
    const { category } = req.params;
    let config = null;
    try {
      const workflowPath = path.join(
        __dirname,
        '../../../../../prompts/scene-2-agent-orchestration',
        category,
        'workflow.json'
      );
      const content = await fsPromises.readFile(workflowPath, 'utf-8');
      config = JSON.parse(content);
    } catch (error) {
      // 配置缺失时回退到默认工作流
      console.warn('加载workflow.json失败，使用默认工作流配置:', error.message);
    }

    if (config?.phases?.length) {
      // 转换为前端需要的格式
      const stages = config.phases.map((phase, index) => ({
        id: phase.phase_id,
        name: phase.phase_name,
        description: phase.description || '',
        agents: phase.agents.map(a => a.agent_id),
        agentRoles: phase.agents.map(a => ({
          id: a.agent_id,
          role: a.role,
          tasks: a.tasks
        })),
        dependencies: phase.dependencies || [],
        outputs: phase.outputs || [],
        outputsDetailed: buildOutputsDetailed(phase.outputs || []),
        order: index + 1
      }));

      res.json({
        code: 0,
        message: 'success',
        data: {
          workflowId: config.workflow_id,
          workflowName: config.workflow_name,
          description: config.description,
          stages
        }
      });
      return;
    }

    const stages = DEFAULT_WORKFLOW_STAGES.map((stage, index) => ({
      id: stage.id,
      name: stage.name,
      description: stage.description || '',
      agents: stage.recommendedAgents || [],
      agentRoles: (stage.recommendedAgents || []).map(agentId => ({
        id: agentId,
        role: stage.name,
        tasks: []
      })),
      dependencies: index > 0 ? [DEFAULT_WORKFLOW_STAGES[index - 1].id] : [],
      outputs: stage.artifactTypes || [],
      outputsDetailed: buildOutputsDetailed(stage.artifactTypes || []),
      order: index + 1
    }));

    res.json({
      code: 0,
      message: 'success',
      data: {
        workflowId: category,
        workflowName: '默认产品开发流程',
        description: '使用内置默认工作流配置',
        stages
      }
    });
  } catch (error) {
    console.error('加载工作流配置失败:', error);
    res.status(500).json({
      code: -1,
      message: '加载工作流配置失败',
      error: error.message
    });
  }
});

function buildOutputsDetailed(outputs = []) {
  const projectRoot = process.cwd();
  return outputs.map(outputId => {
    const def = ARTIFACT_TYPES[outputId];
    if (!def) {
      return { id: outputId, name: outputId, promptTemplates: [], missingPromptTemplates: [] };
    }
    const promptTemplates = Array.isArray(def.promptTemplates) ? def.promptTemplates : [];
    const missing = [];
    const existing = promptTemplates.filter(tpl => {
      const abs = path.resolve(projectRoot, tpl);
      const ok = fs.existsSync(abs);
      if (!ok) missing.push(tpl);
      return ok;
    });
    return {
      id: outputId,
      name: def.name,
      promptTemplates: existing,
      missingPromptTemplates: missing
    };
  });
}

export default router;
