export const pdfGenerationHtmlBaseMethods = {
  buildHtmlContent(exportEntity) {
    const options = exportEntity.options.value;
    const content = JSON.parse(exportEntity.content);

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${exportEntity.title}</title>
        <style>
          body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
          h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
          h2 { color: #34495e; margin-top: 30px; }
          p { margin-bottom: 15px; text-align: justify; }
          .page-break { page-break-before: always; }
          .toc { page-break-after: always; }
          .toc ul { list-style: none; padding-left: 0; }
          .toc li { margin: 10px 0; padding-left: 20px; }
          .toc a { text-decoration: none; color: #3498db; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #f8f9fa; font-weight: bold; }
        </style>
      </head>
      <body>
    `;

    if (options.includeTableOfContents) {
      html += '<div class="toc"><h1>目录</h1><ul>';
      content.forEach((section, index) => {
        html += `<li><a href="#section-${index}">${section.title}</a></li>`;
      });
      html += '</ul></div>';
    }

    content.forEach((section, index) => {
      html += `<div id="section-${index}" class="${index > 0 ? 'page-break' : ''}">`;
      html += `<h1>${section.title}</h1>`;
      html += `<p>${String(section.content || '').replace(/\n/g, '<br>')}</p>`;
      html += '</div>';
    });

    html += '</body></html>';
    return html;
  }
};
