/**
 * Report 路由
 * DDD适配层 - 调用对应的DDD模块
 */
import express from 'express';
import { ReportController } from './report.controller.js';

const router = express.Router();
const controller = new ReportController();

/**
 * 创建报告
 * POST /api/reports
 */
router.post('/reports', controller.createReport.bind(controller));

/**
 * 获取报告列表
 * GET /api/reports
 */
router.get('/reports', controller.getReports.bind(controller));

/**
 * 获取报告详情
 * GET /api/reports/:reportId
 */
router.get('/reports/:reportId', controller.getReport.bind(controller));

/**
 * 更新报告
 * PUT /api/reports/:reportId
 */
router.put('/reports/:reportId', controller.updateReport.bind(controller));

/**
 * 删除报告
 * DELETE /api/reports/:reportId
 */
router.delete('/reports/:reportId', controller.deleteReport.bind(controller));

/**
 * 归档报告
 * POST /api/reports/:reportId/archive
 */
router.post('/reports/:reportId/archive', controller.archiveReport.bind(controller));

/**
 * 添加报告章节
 * POST /api/reports/:reportId/sections
 */
router.post('/reports/:reportId/sections', controller.addSection.bind(controller));

/**
 * 更新报告章节
 * PUT /api/reports/:reportId/sections/:sectionId
 */
router.put('/reports/:reportId/sections/:sectionId', controller.updateSection.bind(controller));

/**
 * 删除报告章节
 * DELETE /api/reports/:reportId/sections/:sectionId
 */
router.delete('/reports/:reportId/sections/:sectionId', controller.removeSection.bind(controller));

/**
 * 生成报告
 * POST /api/reports/:reportId/generate
 */
router.post('/reports/:reportId/generate', controller.generateReport.bind(controller));

/**
 * 获取报告导出格式
 * GET /api/reports/:reportId/export-formats
 */
router.get('/reports/:reportId/export-formats', controller.getReportExportFormats.bind(controller));

/**
 * 获取报告模板
 * GET /api/reports/templates/:reportType
 */
router.get('/reports/templates/:reportType', controller.getReportTemplates.bind(controller));

/**
 * 兼容旧API - 生成报告
 * POST /api/reports/generate
 */
router.post('/reports/generate', controller.generateReport.bind(controller));

/**
 * 兼容旧API - 生成报告（单数路径）
 * POST /api/report/generate
 */
router.post('/generate', controller.generateReport.bind(controller));

export default router;
