/**
 * PDF Export 路由
 * DDD适配层 - 调用对应的DDD模块
 */
import express from 'express';
import { PdfExportController } from './pdf-export.controller.js';

const router = express.Router();
const controller = new PdfExportController();

/**
 * 创建导出任务
 * POST /api/exports
 */
router.post('/exports', controller.createExport.bind(controller));

/**
 * 处理导出任务
 * POST /api/exports/:exportId/process
 */
router.post('/exports/:exportId/process', controller.processExport.bind(controller));

/**
 * 获取导出详情
 * GET /api/exports/:exportId
 */
router.get('/exports/:exportId', controller.getExport.bind(controller));

/**
 * 获取项目的所有导出
 * GET /api/projects/:projectId/exports
 */
router.get('/projects/:projectId/exports', controller.getExportsByProject.bind(controller));

/**
 * 获取指定状态的导出
 * GET /api/exports/status/:status
 */
router.get('/exports/status/:status', controller.getExportsByStatus.bind(controller));

/**
 * 删除导出
 * DELETE /api/exports/:exportId
 */
router.delete('/exports/:exportId', controller.deleteExport.bind(controller));

/**
 * 下载导出文件
 * GET /api/exports/:exportId/download
 */
router.get('/exports/:exportId/download', controller.downloadExport.bind(controller));

/**
 * 快速导出报告为PDF（兼容旧API）
 * POST /api/pdf-export/report
 */
router.post('/report', controller.exportReportPDF.bind(controller));
router.post('/business-plan', controller.exportBusinessPlanPDF.bind(controller));

export default router;
