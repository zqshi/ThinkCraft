/**
 * 项目管理路由
 * 提供完整的项目API
 */
import express from 'express';
import { projectController } from './project.controller.js';

const router = express.Router();

/**
 * POST /api/projects
 * 创建项目
 * 请求体: { ideaId: string, name: string, mode: 'demo' | 'development' }
 * 响应: { code: number, message: string, data: { project: object, workflow?: object, demo?: object } }
 */
router.post('/', projectController.createProject);

/**
 * GET /api/projects/:id
 * 获取项目详情
 * 响应: { code: number, message: string, data: { project: object, stages: array, artifacts: array } }
 */
router.get('/:id', projectController.getProject);

/**
 * GET /api/projects
 * 获取所有项目
 * 查询参数: ?mode=demo|development&status=planning|...\u0026limit=10\u0026offset=0\u0026sortBy=updatedAt
 * 响应: { code: number, message: string, data: { projects: array, total: number } }
 */
router.get('/', projectController.getAllProjects);

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
 * POST /api/projects/:id/upgrade
 * 升级项目模式（Demo → Development）
 * 响应: { code: number, message: string, data: { project: object, workflow: object, migratedArtifacts: array } }
 */
router.post('/:id/upgrade', projectController.upgradeProjectMode);

/**
 * PUT /api/projects/:id/workflow
 * 自定义工作流
 * 请求体: { stages: array }
 * 响应: { code: number, message: string, data: { workflow: object } }
 */
router.put('/:id/workflow', projectController.customizeWorkflow);

/**
 * PUT /api/projects/:id/demo-code
 * 更新Demo代码
 * 请求体: { code?: string, type?: string, previewUrl?: string, downloadUrl?: string }
 * 响应: { code: number, message: string, data: { project: object } }
 */
router.put('/:id/demo-code', projectController.updateDemoCode);

/**
 * GET /api/projects/by-idea/:ideaId
 * 根据创意ID获取项目
 * 响应: { code: number, message: string, data: { project: object } }
 */
router.get('/by-idea/:ideaId', projectController.getProjectByIdeaId);

/**
 * GET /api/projects/statistics
 * 获取项目统计信息
 * 响应: { code: number, message: string, data: { totalCount: number, countByStatus: object, countByMode: object, recentProjects: array } }
 */
router.get('/statistics', projectController.getProjectStatistics);

/**
 * GET /api/projects/search
 * 搜索项目
 * 查询参数: ?q=搜索词\u0026mode=demo|development\u0026status=planning|...
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
 * 响应: { code: number, message: string, data: { project: object, workflow?: object, demo?: object } }
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

export default router;
