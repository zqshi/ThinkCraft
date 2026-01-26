/**
 * Demo Generator 路由
 * DDD适配层 - 调用对应的DDD模块
 */
import express from 'express';
import { DemoGeneratorController } from './demo-generator.controller.js';

const router = express.Router();
const controller = new DemoGeneratorController();

/**
 * 创建Demo
 * POST /api/demos
 */
router.post('/demos', controller.createDemo.bind(controller));

/**
 * 生成Demo代码
 * POST /api/demos/:demoId/generate
 */
router.post('/demos/:demoId/generate', controller.generateDemo.bind(controller));

/**
 * 获取Demo详情
 * GET /api/demos/:demoId
 */
router.get('/demos/:demoId', controller.getDemo.bind(controller));

/**
 * 获取项目的所有Demo
 * GET /api/projects/:projectId/demos
 */
router.get('/projects/:projectId/demos', controller.getDemosByProject.bind(controller));

/**
 * 删除Demo
 * DELETE /api/demos/:demoId
 */
router.delete('/demos/:demoId', controller.deleteDemo.bind(controller));

export default router;
