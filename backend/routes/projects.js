/**
 * 项目管理 API
 * 支持项目创建、查询、更新、删除、模式升级
 */
import express from 'express';
import { initializeDefaultWorkflow } from '../config/workflow-stages.js';

const router = express.Router();

// 项目存储（内存中，后续可改为数据库）
const projects = new Map();

/**
 * POST /api/projects/create
 * 创建项目
 */
router.post('/create', async (req, res, next) => {
    try {
        const { ideaId, mode, name } = req.body;

        // 参数验证
        if (!ideaId) {
            return res.status(400).json({
                code: -1,
                error: '缺少必要参数: ideaId'
            });
        }

        if (!mode || !['demo', 'development'].includes(mode)) {
            return res.status(400).json({
                code: -1,
                error: '无效的开发模式，必须是 demo 或 development'
            });
        }

        // 检查是否已存在该创意的项目
        const existingProject = Array.from(projects.values()).find(p => p.ideaId === ideaId);
        if (existingProject) {
            return res.status(400).json({
                code: -1,
                error: '该创意已创建项目',
                data: { projectId: existingProject.id }
            });
        }

        // 创建项目
        const project = {
            id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            ideaId,
            name: name || `项目-${Date.now()}`,
            mode,
            status: 'planning',
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        // 根据模式初始化数据
        if (mode === 'demo') {
            project.demo = {
                type: null,
                code: null,
                previewUrl: null,
                downloadUrl: null,
                generatedAt: null
            };
        } else if (mode === 'development') {
            project.workflow = {
                currentStageId: 'requirement', // 从需求分析开始
                stages: initializeDefaultWorkflow(), // 初始化7个标准阶段
                isCustom: false
            };
        }

        // 保存项目
        projects.set(project.id, project);

        console.log(`[Projects] 创建项目: ${project.id} (${mode}模式)`);

        res.json({
            code: 0,
            data: {
                project,
                workflow: mode === 'development' ? project.workflow : undefined
            }
        });

    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/projects/:id
 * 获取项目详情
 */
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;

        const project = projects.get(id);
        if (!project) {
            return res.status(404).json({
                code: -1,
                error: '项目不存在'
            });
        }

        // 提取相关信息
        const stages = project.workflow?.stages || [];
        const artifacts = stages.flatMap(s => s.artifacts || []);

        res.json({
            code: 0,
            data: {
                project,
                stages,
                artifacts
            }
        });

    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/projects
 * 获取所有项目
 */
router.get('/', async (req, res, next) => {
    try {
        const { mode, status } = req.query;

        let projectList = Array.from(projects.values());

        // 过滤
        if (mode) {
            projectList = projectList.filter(p => p.mode === mode);
        }
        if (status) {
            projectList = projectList.filter(p => p.status === status);
        }

        // 按更新时间倒序排序
        projectList.sort((a, b) => b.updatedAt - a.updatedAt);

        res.json({
            code: 0,
            data: {
                projects: projectList,
                total: projectList.length
            }
        });

    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/projects/:id
 * 更新项目
 */
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const project = projects.get(id);
        if (!project) {
            return res.status(404).json({
                code: -1,
                error: '项目不存在'
            });
        }

        // 更新项目
        Object.assign(project, updates, { updatedAt: Date.now() });
        projects.set(id, project);

        console.log(`[Projects] 更新项目: ${id}`);

        res.json({
            code: 0,
            data: { project }
        });

    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/projects/:id
 * 删除项目
 */
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!projects.has(id)) {
            return res.status(404).json({
                code: -1,
                error: '项目不存在'
            });
        }

        projects.delete(id);

        console.log(`[Projects] 删除项目: ${id}`);

        res.json({
            code: 0,
            message: '删除成功'
        });

    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/projects/:id/upgrade
 * 升级项目模式（Demo → Development）
 */
router.post('/:id/upgrade', async (req, res, next) => {
    try {
        const { id } = req.params;

        const project = projects.get(id);
        if (!project) {
            return res.status(404).json({
                code: -1,
                error: '项目不存在'
            });
        }

        if (project.mode !== 'demo') {
            return res.status(400).json({
                code: -1,
                error: '只有Demo模式可以升级'
            });
        }

        // 升级到协同开发模式
        project.mode = 'development';
        project.updatedAt = Date.now();

        // 初始化默认工作流（7个标准阶段）
        project.workflow = {
            currentStageId: 'requirement', // 从需求分析开始
            stages: initializeDefaultWorkflow(),
            isCustom: false
        };

        // 如果有Demo代码，迁移到开发阶段的产物
        if (project.demo && project.demo.code) {
            const devStage = project.workflow.stages.find(s => s.id === 'development');
            if (devStage) {
                devStage.artifacts = [{
                    id: `artifact-${Date.now()}`,
                    projectId: id,
                    stageId: 'development',
                    type: 'demo-code',
                    name: 'Demo原型代码',
                    content: project.demo.code,
                    source: 'from-demo',
                    createdAt: Date.now()
                }];
            }
            console.log(`[Projects] 升级项目: ${id}, Demo代码已迁移到开发阶段`);
        }

        projects.set(id, project);

        console.log(`[Projects] 项目模式升级: ${id} (Demo → Development)`);

        res.json({
            code: 0,
            data: {
                project,
                workflow: project.workflow,
                migratedArtifacts: project.demo ? ['demo-code'] : []
            }
        });

    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/projects/:id/workflow
 * 自定义工作流
 */
router.put('/:id/workflow', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { stages } = req.body;

        const project = projects.get(id);
        if (!project) {
            return res.status(404).json({
                code: -1,
                error: '项目不存在'
            });
        }

        if (project.mode !== 'development') {
            return res.status(400).json({
                code: -1,
                error: '只有协同开发模式支持自定义工作流'
            });
        }

        if (!Array.isArray(stages)) {
            return res.status(400).json({
                code: -1,
                error: '无效的工作流阶段'
            });
        }

        // 更新工作流
        project.workflow.stages = stages;
        project.workflow.isCustom = true;
        project.updatedAt = Date.now();

        projects.set(id, project);

        console.log(`[Projects] 自定义工作流: ${id}, ${stages.length} 个阶段`);

        res.json({
            code: 0,
            data: {
                workflow: project.workflow
            }
        });

    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/projects/by-idea/:ideaId
 * 根据创意ID获取项目
 */
router.get('/by-idea/:ideaId', async (req, res, next) => {
    try {
        const { ideaId } = req.params;

        const project = Array.from(projects.values()).find(p => p.ideaId === ideaId);

        if (!project) {
            return res.status(404).json({
                code: -1,
                error: '该创意尚未创建项目'
            });
        }

        res.json({
            code: 0,
            data: { project }
        });

    } catch (error) {
        next(error);
    }
});

export default router;
