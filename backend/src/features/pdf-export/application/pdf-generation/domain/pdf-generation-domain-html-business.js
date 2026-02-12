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

export const pdfGenerationHtmlBusinessMethods = {
  buildBusinessPlanHtmlContent(chapters, title) {
    const list = Array.isArray(chapters) ? chapters : [];
    const chapterHtml = list
      .map((chapter, index) => {
        const chapterTitle = chapter?.title || `章节 ${index + 1}`;
        return `
          <section class="chapter ${index > 0 ? 'page-break' : ''}">
            <h2>${escapeHtml(chapterTitle)}</h2>
            ${renderMarkdown(chapter?.content || '')}
          </section>
        `;
      })
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(title || '商业计划书')}</title>
        <style>
          body { font-family: 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif; color: #1f2937; line-height: 1.8; padding: 24px; }
          h1 { font-size: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 12px; }
          h2 { font-size: 22px; margin-top: 24px; color: #0f172a; }
          p { margin: 10px 0; }
          .page-break { page-break-before: always; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title || '商业计划书')}</h1>
        ${chapterHtml || '<p>暂无章节内容</p>'}
      </body>
      </html>
    `;
  }
};
