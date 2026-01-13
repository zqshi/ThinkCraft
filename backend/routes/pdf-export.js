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
import fs from 'fs';
import { pdfExportService } from '../domains/pdfExport/index.js';

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
    const result = await pdfExportService.exportToPDF(title, chapters);

    res.json({
      code: 0,
      data: {
        filename: result.filename,
        downloadUrl: `/api/pdf/download/${result.filename}`
      }
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
    const filepath = `./temp/${filename}`;

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({
        code: -1,
        error: 'PDF文件不存在'
      });
    }

    res.download(filepath, filename, (err) => {
      if (err) {
        console.error('[PDF] 下载失败:', err);
      }
      // 下载后删除临时文件
      setTimeout(() => {
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
      }, 1000);
    });

  } catch (error) {
    res.status(500).json({
      code: -1,
      error: error.message
    });
  }
});

export default router;
