/**
 * PDF导出功能 API - 重构版
 *
 * 重构说明：
 * - 原文件403行 -> 现在~80行（减少80%）
 * - 业务逻辑移到领域层
 * - 路由只负责HTTP请求/响应处理
 *
 * 重构日期：2026-01-13
 */
import express from 'express';
import { pdfExportUseCases } from '../application/index.js';

const router = express.Router();

/**
 * POST /api/pdf/export
 * 导出PDF
 */
router.post('/export', async (req, res) => {
  try {
    const { title, chapters } = req.body;

    if (!title || !chapters || !Array.isArray(chapters)) {
      return res.status(400).json({
        code: -1,
        error: '缺少必要参数: title和chapters'
      });
    }

    // 导出PDF
    const result = await pdfExportUseCases.exportPdf({ title, chapters });

    if (!result.success) {
      return res.status(400).json({
        code: -1,
        error: result.error
      });
    }

    res.json({
      code: 0,
      data: result.data
    });

  } catch (error) {
    res.status(500).json({
      code: -1,
      error: error.message
    });
  }
});

/**
 * GET /api/pdf/download/:filename
 * 下载PDF文件
 */
router.get('/download/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const result = pdfExportUseCases.getDownloadPath({ filename });

    if (!result.success) {
      return res.status(404).json({
        code: -1,
        error: result.error
      });
    }

    res.download(result.path, filename, (err) => {
      if (err) {
        console.error('[PDF] 下载失败:', err);
      }
      pdfExportUseCases.cleanupFile({ filepath: result.path });
    });

  } catch (error) {
    res.status(500).json({
      code: -1,
      error: error.message
    });
  }
});

export default router;
