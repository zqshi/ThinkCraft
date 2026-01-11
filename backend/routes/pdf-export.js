/**
 * PDF导出功能 API
 * 支持报告导出为PDF格式
 */
import express from 'express';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// 确保临时目录存在
const TEMP_DIR = path.join(__dirname, '../../temp');
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * 添加中文字体支持
 * @param {PDFDocument} doc - PDF文档对象
 */
function setupChineseFont(doc) {
    // 注意：这里使用系统字体，生产环境需要准备字体文件
    try {
        // macOS系统字体路径
        const fontPath = '/System/Library/Fonts/STHeiti Light.ttc';
        if (fs.existsSync(fontPath)) {
            doc.font(fontPath);
            return;
        }
    } catch (error) {
        console.warn('[PDF] 中文字体加载失败，使用默认字体');
    }

    // 降级到默认字体（可能不支持中文）
    doc.font('Helvetica');
}

/**
 * 格式化Markdown为PDF内容
 * @param {PDFDocument} doc - PDF文档对象
 * @param {String} content - Markdown内容
 * @param {Number} yOffset - Y轴偏移量
 */
function renderMarkdownContent(doc, content, yOffset = 100) {
    const lines = content.split('\n');
    let y = yOffset;
    const margin = 50;
    const maxWidth = doc.page.width - 2 * margin;

    lines.forEach(line => {
        // 检查是否需要换页
        if (y > doc.page.height - 100) {
            doc.addPage();
            y = 50;
        }

        const trimmed = line.trim();

        // 标题处理
        if (trimmed.startsWith('####')) {
            y += 15;
            doc.fontSize(12).fillColor('#333333')
                .text(trimmed.replace(/^####\s*/, ''), margin, y);
            y += 20;
        } else if (trimmed.startsWith('###')) {
            y += 20;
            doc.fontSize(14).fillColor('#222222')
                .text(trimmed.replace(/^###\s*/, ''), margin, y);
            y += 25;
        } else if (trimmed.startsWith('##')) {
            y += 25;
            doc.fontSize(16).fillColor('#111111')
                .text(trimmed.replace(/^##\s*/, ''), margin, y);
            y += 30;
        } else if (trimmed.startsWith('#')) {
            y += 30;
            doc.fontSize(18).fillColor('#000000')
                .text(trimmed.replace(/^#\s*/, ''), margin, y);
            y += 35;
        }
        // 列表处理
        else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            doc.fontSize(10).fillColor('#444444')
                .text('  • ' + trimmed.substring(2), margin + 10, y, { width: maxWidth - 10 });
            y += 18;
        }
        // 数字列表
        else if (/^\d+\.\s/.test(trimmed)) {
            doc.fontSize(10).fillColor('#444444')
                .text('  ' + trimmed, margin + 10, y, { width: maxWidth - 10 });
            y += 18;
        }
        // 粗体处理
        else if (trimmed.includes('**')) {
            const parts = trimmed.split('**');
            let x = margin;
            parts.forEach((part, index) => {
                if (index % 2 === 1) {
                    // 粗体部分
                    doc.fontSize(10).fillColor('#000000').font('Helvetica-Bold');
                } else {
                    // 普通部分
                    doc.fontSize(10).fillColor('#555555').font('Helvetica');
                }
                doc.text(part, x, y, { continued: index < parts.length - 1, width: maxWidth });
                x = doc.x;
            });
            y += 18;
        }
        // 普通段落
        else if (trimmed.length > 0) {
            doc.fontSize(10).fillColor('#555555').font('Helvetica')
                .text(trimmed, margin, y, { width: maxWidth, align: 'left' });
            y += 18;
        }
        // 空行
        else {
            y += 10;
        }
    });
}

/**
 * POST /api/pdf-export/report
 * 导出分析报告为PDF
 */
router.post('/report', async (req, res, next) => {
    try {
        const { reportData, ideaTitle } = req.body;

        if (!reportData) {
            return res.status(400).json({
                code: -1,
                error: '缺少报告数据'
            });
        }

        const title = ideaTitle || '创意分析报告';
        const timestamp = new Date().toLocaleDateString('zh-CN');

        // 创建PDF文档
        const doc = new PDFDocument({
            size: 'A4',
            margin: 50,
            info: {
                Title: `${title} - ThinkCraft`,
                Author: 'ThinkCraft AI',
                Subject: '创意分析报告',
                Keywords: '创意,分析,AI'
            }
        });

        const filename = `report_${Date.now()}.pdf`;
        const filepath = path.join(TEMP_DIR, filename);
        const stream = fs.createWriteStream(filepath);

        doc.pipe(stream);

        // 封面
        doc.fontSize(28).fillColor('#1a1a1a')
            .text(title, { align: 'center' });

        doc.moveDown(1);
        doc.fontSize(14).fillColor('#666666')
            .text('ThinkCraft AI 创意思维结构化分析', { align: 'center' });

        doc.moveDown(0.5);
        doc.fontSize(12).fillColor('#999999')
            .text(`生成日期：${timestamp}`, { align: 'center' });

        // 添加分隔线
        doc.moveDown(3);
        doc.strokeColor('#cccccc')
            .lineWidth(1)
            .moveTo(100, doc.y)
            .lineTo(500, doc.y)
            .stroke();

        doc.moveDown(2);

        // 摘要信息
        doc.fontSize(12).fillColor('#333333');
        doc.text(`核心定义：${reportData.coreDefinition || ''}`, { width: 450 });
        doc.moveDown(0.5);
        doc.text(`目标用户：${reportData.targetUser || ''}`, { width: 450 });
        doc.moveDown(0.5);
        doc.text(`解决方案：${reportData.solution || ''}`, { width: 450 });

        // 新增页面开始章节内容
        doc.addPage();

        // 渲染各章节
        const chapters = reportData.chapters || {};
        Object.values(chapters).forEach((chapter, index) => {
            if (index > 0) {
                doc.addPage();
            }

            // 章节标题
            doc.fontSize(20).fillColor('#000000')
                .text(chapter.title || `第${index + 1}章`, { align: 'left' });

            doc.moveDown(1);

            // 章节内容（简化处理）
            if (chapter.originalIdea) {
                doc.fontSize(12).fillColor('#555555')
                    .text(`原始创意：${chapter.originalIdea}`, { width: 450 });
                doc.moveDown(0.5);
            }

            if (chapter.evolution) {
                doc.fontSize(12).fillColor('#555555')
                    .text(`演变说明：${chapter.evolution}`, { width: 450 });
                doc.moveDown(0.5);
            }

            if (chapter.surfaceNeed) {
                doc.fontSize(12).fillColor('#555555')
                    .text(`表层需求：${chapter.surfaceNeed}`, { width: 450 });
                doc.moveDown(0.5);
            }

            if (chapter.deepMotivation) {
                doc.fontSize(12).fillColor('#555555')
                    .text(`深层动力：${chapter.deepMotivation}`, { width: 450 });
                doc.moveDown(0.5);
            }

            if (chapter.assumptions && Array.isArray(chapter.assumptions)) {
                doc.moveDown(0.5);
                doc.fontSize(12).fillColor('#333333').text('核心假设：');
                chapter.assumptions.forEach((assumption, i) => {
                    doc.fontSize(11).fillColor('#555555')
                        .text(`  ${i + 1}. ${assumption}`, { width: 450 });
                });
            }

            if (chapter.idealScenario) {
                doc.moveDown(0.5);
                doc.fontSize(12).fillColor('#555555')
                    .text(`理想场景：${chapter.idealScenario}`, { width: 450 });
            }

            if (chapter.limitations && Array.isArray(chapter.limitations)) {
                doc.moveDown(0.5);
                doc.fontSize(12).fillColor('#333333').text('限制因素：');
                chapter.limitations.forEach((limit, i) => {
                    doc.fontSize(11).fillColor('#555555')
                        .text(`  ${i + 1}. ${limit}`, { width: 450 });
                });
            }
        });

        // 页脚
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
            doc.switchToPage(i);
            doc.fontSize(10).fillColor('#999999')
                .text(
                    `第 ${i + 1} 页，共 ${pages.count} 页`,
                    50,
                    doc.page.height - 50,
                    { align: 'center' }
                );
        }

        // 完成PDF生成
        doc.end();

        // 等待文件写入完成
        stream.on('finish', () => {
            // 返回PDF文件
            res.download(filepath, `${title}.pdf`, (err) => {
                if (err) {
                    console.error('[PDF] 下载失败:', err);
                }
                // 删除临时文件
                setTimeout(() => {
                    if (fs.existsSync(filepath)) {
                        fs.unlinkSync(filepath);
                    }
                }, 5000);
            });
        });

        stream.on('error', (error) => {
            console.error('[PDF] 文件写入失败:', error);
            throw error;
        });

    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/pdf-export/business-plan
 * 导出商业计划书为PDF
 */
router.post('/business-plan', async (req, res, next) => {
    try {
        const { chapters, title, type } = req.body;

        if (!chapters || !Array.isArray(chapters)) {
            return res.status(400).json({
                code: -1,
                error: '缺少章节数据'
            });
        }

        const docTitle = title || (type === 'business' ? '商业计划书' : '产品立项材料');
        const timestamp = new Date().toLocaleDateString('zh-CN');

        // 创建PDF文档
        const doc = new PDFDocument({
            size: 'A4',
            margin: 50
        });

        const filename = `business_plan_${Date.now()}.pdf`;
        const filepath = path.join(TEMP_DIR, filename);
        const stream = fs.createWriteStream(filepath);

        doc.pipe(stream);

        // 封面
        doc.fontSize(30).fillColor('#1a1a1a')
            .text(docTitle, { align: 'center' });

        doc.moveDown(2);
        doc.fontSize(16).fillColor('#666666')
            .text('ThinkCraft AI 生成', { align: 'center' });

        doc.moveDown(1);
        doc.fontSize(12).fillColor('#999999')
            .text(`生成日期：${timestamp}`, { align: 'center' });

        // 渲染章节
        chapters.forEach((chapter, index) => {
            doc.addPage();

            // 章节标题
            doc.fontSize(18).fillColor('#000000')
                .text(`${index + 1}. ${chapter.title}`, { align: 'left' });

            doc.moveDown(0.5);

            doc.fontSize(12).fillColor('#666666')
                .text(`${chapter.emoji || ''} ${chapter.agent || ''}`, { align: 'left' });

            doc.moveDown(1);

            // 渲染Markdown内容
            if (chapter.content) {
                renderMarkdownContent(doc, chapter.content, doc.y);
            }
        });

        // 页脚
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
            doc.switchToPage(i);
            doc.fontSize(10).fillColor('#999999')
                .text(
                    `第 ${i + 1} 页，共 ${pages.count} 页 | ThinkCraft AI`,
                    50,
                    doc.page.height - 50,
                    { align: 'center' }
                );
        }

        doc.end();

        stream.on('finish', () => {
            res.download(filepath, `${docTitle}.pdf`, (err) => {
                if (err) {
                    console.error('[PDF] 下载失败:', err);
                }
                setTimeout(() => {
                    if (fs.existsSync(filepath)) {
                        fs.unlinkSync(filepath);
                    }
                }, 5000);
            });
        });

        stream.on('error', (error) => {
            console.error('[PDF] 文件写入失败:', error);
            throw error;
        });

    } catch (error) {
        next(error);
    }
});

export default router;
