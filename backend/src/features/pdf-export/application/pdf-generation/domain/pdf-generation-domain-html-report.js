function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderMarkdown(value) {
  const text = escapeHtml(String(value || ''));
  return text
    .split(/\r?\n\r?\n/g)
    .map(block => `<p>${block.replace(/\r?\n/g, '<br>')}</p>`)
    .join('');
}

function chapterBlock(title, body, pageBreak = true) {
  return `
    <section class="chapter ${pageBreak ? 'page-break' : ''}">
      <h1>${escapeHtml(title)}</h1>
      ${body || '<p>暂无内容</p>'}
    </section>
  `;
}

export const pdfGenerationHtmlReportMethods = {
  buildReportHtmlContent(reportData, title) {
    const chapters = reportData?.chapters || {};

    const overview = `
      <div class="summary-box">
        ${reportData?.initialIdea ? `<p><strong>初始创意：</strong>${renderMarkdown(reportData.initialIdea)}</p>` : ''}
        ${reportData?.coreDefinition ? `<p><strong>核心定义：</strong>${renderMarkdown(reportData.coreDefinition)}</p>` : ''}
        ${reportData?.problem ? `<p><strong>解决问题：</strong>${renderMarkdown(reportData.problem)}</p>` : ''}
        ${reportData?.solution ? `<p><strong>解决方案：</strong>${renderMarkdown(reportData.solution)}</p>` : ''}
        ${reportData?.targetUser ? `<p><strong>目标用户：</strong>${renderMarkdown(reportData.targetUser)}</p>` : ''}
      </div>
    `;

    const chapterEntries = [
      ['创意定义与演化', chapters.chapter1],
      ['核心洞察与根本假设', chapters.chapter2],
      ['边界条件与应用场景', chapters.chapter3],
      ['可行性分析与关键挑战', chapters.chapter4],
      ['思维盲点与待探索问题', chapters.chapter5],
      ['结构化行动建议', chapters.chapter6]
    ];

    const chapterHtml = chapterEntries
      .map(([defaultTitle, chapter], idx) => {
        if (!chapter) {
          return '';
        }
        const chapterTitle = chapter.title || defaultTitle;
        const content = typeof chapter === 'string' ? chapter : chapter.content || JSON.stringify(chapter, null, 2);
        return chapterBlock(chapterTitle, renderMarkdown(content), idx !== 0);
      })
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(title || '创意分析报告')}</title>
        <style>
          body { font-family: 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif; color: #1f2937; line-height: 1.8; padding: 24px; }
          .cover { text-align: center; padding: 80px 40px; page-break-after: always; }
          .cover h1 { font-size: 34px; color: #0f172a; margin-bottom: 12px; }
          .meta { color: #6b7280; }
          .summary-box { background: #f8fafc; border-left: 4px solid #3b82f6; padding: 16px; margin-bottom: 24px; }
          .chapter h1 { font-size: 26px; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; margin-bottom: 12px; }
          .page-break { page-break-before: always; }
          p { margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="cover">
          <h1>${escapeHtml(title || '创意分析报告')}</h1>
          <div class="meta">生成时间：${new Date().toLocaleString('zh-CN')}</div>
        </div>
        ${overview}
        ${chapterHtml || '<p>暂无章节内容</p>'}
      </body>
      </html>
    `;
  }
};
