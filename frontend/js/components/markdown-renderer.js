/**
 * Markdown 渲染器
 * 用于将Markdown文本转换为HTML并美化显示
 */

class MarkdownRenderer {
    constructor() {
        // 配置选项
        this.options = {
            breaks: true,          // 支持GFM换行
            gfm: true,             // 启用GitHub风格Markdown
            headerIds: true,       // 自动生成标题ID
            highlight: true,       // 代码高亮
            sanitize: false        // 不进行HTML清理（信任AI生成的内容）
        };

        console.log('[MarkdownRenderer] Markdown渲染器已初始化');
    }

    /**
     * 渲染Markdown到HTML
     * @param {String} markdown - Markdown文本
     * @param {Object} options - 渲染选项
     * @returns {String} HTML字符串
     */
    render(markdown, options = {}) {
        if (!markdown) return '';

        const opts = { ...this.options, ...options };

        try {
            const normalized = this.normalizeSoftLineBreaks(markdown);
            // 简单的Markdown渲染实现
            let html = normalized;

            // 1. 代码块（```）- 先处理，避免内部内容被误解析
            html = this.renderCodeBlocks(html);

            // 2. 行内代码 - 也要先处理
            html = this.renderInlineCode(html);

            // 3. 标题（# ## ###）
            html = this.renderHeaders(html);

            // 4. 引用块
            html = this.renderBlockquotes(html);

            // 5. 水平线
            html = this.renderHorizontalRules(html);

            // 6. 列表
            html = this.renderLists(html);

            // 7. 粗体和斜体
            html = this.renderEmphasis(html);

            // 8. 链接
            html = this.renderLinks(html);

            // 9. 图片
            html = this.renderImages(html);

            // 10. 段落和换行处理（智能处理，不破坏已有HTML）
            if (opts.breaks) {
                // 只处理普通文本行的换行，保留HTML标签完整性
                // 不对已经是HTML块级元素的内容添加<br>
                const lines = html.split('\n');
                const processedLines = lines.map((line, index) => {
                    // 如果是HTML标签行或空行，不处理
                    if (line.trim() === '' ||
                        line.match(/^<(h[1-6]|ul|ol|li|pre|blockquote|hr|p|div)/i) ||
                        line.match(/<\/(h[1-6]|ul|ol|li|pre|blockquote|p|div)>$/i)) {
                        return line;
                    }
                    // 如果下一行是HTML块级元素开始，不添加<br>
                    if (index < lines.length - 1 &&
                        lines[index + 1].match(/^<(h[1-6]|ul|ol|li|pre|blockquote|hr|p|div)/i)) {
                        return line;
                    }
                    // 如果当前行在HTML块级元素内部，不添加<br>
                    if (line.match(/^<\/?(li|code|strong|em|a|span)/i)) {
                        return line;
                    }
                    // 普通文本行，如果不是最后一行且下一行不是空行，添加<br>
                    if (index < lines.length - 1 && lines[index + 1].trim() !== '') {
                        return line + '<br>';
                    }
                    return line;
                });
                html = processedLines.join('\n');
            }

            return html;

        } catch (error) {
            console.error('[MarkdownRenderer] 渲染失败:', error);
            return this.escapeHtml(markdown);
        }
    }

    /**
     * 折叠普通文本的软换行，保留段落/列表/标题等结构
     */
    normalizeSoftLineBreaks(text) {
        const lines = text.split('\n');
        const result = [];
        let inCodeBlock = false;

        const isBlockLine = (line) => {
            return /^(#{1,6}\s|>|\* |\-\s|•\s|\d+\.\s)/.test(line.trim());
        };

        for (const line of lines) {
            if (line.trim().startsWith('```')) {
                inCodeBlock = !inCodeBlock;
                result.push(line);
                continue;
            }

            if (inCodeBlock) {
                result.push(line);
                continue;
            }

            if (line.trim() === '') {
                continue;
            }

            const prev = result[result.length - 1] || '';
            if (prev && prev.trim() !== '' && !isBlockLine(prev) && !isBlockLine(line)) {
                result[result.length - 1] = `${prev} ${line.trim()}`;
            } else {
                result.push(line);
            }
        }

        return result.join('\n');
    }

    /**
     * 渲染代码块
     */
    renderCodeBlocks(text) {
        // 匹配 ```语言\n代码\n```
        return text.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            const language = lang || 'plaintext';
            const escapedCode = this.escapeHtml(code.trim());
            return `<pre class="code-block" data-lang="${language}"><code>${escapedCode}</code></pre>`;
        });
    }

    /**
     * 渲染标题
     */
    renderHeaders(text) {
        // H1
        text = text.replace(/^# (.+)$/gm, '<h1 class="md-h1">$1</h1>');
        // H2
        text = text.replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>');
        // H3
        text = text.replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>');
        // H4
        text = text.replace(/^#### (.+)$/gm, '<h4 class="md-h4">$1</h4>');
        // H5
        text = text.replace(/^##### (.+)$/gm, '<h5 class="md-h5">$1</h5>');
        // H6
        text = text.replace(/^###### (.+)$/gm, '<h6 class="md-h6">$1</h6>');

        return text;
    }

    /**
     * 渲染列表
     */
    renderLists(text) {
        const lines = text.split('\n');
        const result = [];
        let inList = false;
        let listType = null; // 'ul' or 'ol'

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // 检测无序列表
            const ulMatch = line.match(/^[\*\-•]\s+(.+)$/);
            // 检测有序列表
            const olMatch = line.match(/^\d+\.\s+(.+)$/);

            if (ulMatch) {
                if (!inList || listType !== 'ul') {
                    if (inList && listType === 'ol') {
                        result.push('</ol>');
                    }
                    result.push('<ul class="md-ul">');
                    inList = true;
                    listType = 'ul';
                }
                result.push(`<li class="md-li">${ulMatch[1]}</li>`);
            } else if (olMatch) {
                if (!inList || listType !== 'ol') {
                    if (inList && listType === 'ul') {
                        result.push('</ul>');
                    }
                    result.push('<ol class="md-ol">');
                    inList = true;
                    listType = 'ol';
                }
                result.push(`<li class="md-li-ordered">${olMatch[1]}</li>`);
            } else {
                if (inList) {
                    result.push(listType === 'ul' ? '</ul>' : '</ol>');
                    inList = false;
                    listType = null;
                }
                result.push(line);
            }
        }

        // 关闭未闭合的列表
        if (inList) {
            result.push(listType === 'ul' ? '</ul>' : '</ol>');
        }

        return result.join('\n');
    }

    /**
     * 渲染粗体和斜体
     */
    renderEmphasis(text) {
        // 粗体 **text** 或 __text__
        text = text.replace(/\*\*(.+?)\*\*/g, '<strong class="md-strong">$1</strong>');
        text = text.replace(/__(.+?)__/g, '<strong class="md-strong">$1</strong>');

        // 斜体 *text* 或 _text_
        text = text.replace(/\*(.+?)\*/g, '<em class="md-em">$1</em>');
        text = text.replace(/_(.+?)_/g, '<em class="md-em">$1</em>');

        return text;
    }

    /**
     * 渲染链接
     */
    renderLinks(text) {
        // [文本](URL)
        return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="md-link" target="_blank" rel="noopener noreferrer">$1</a>');
    }

    /**
     * 渲染图片
     */
    renderImages(text) {
        // ![alt](URL)
        return text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="md-image" />');
    }

    /**
     * 渲染水平线
     */
    renderHorizontalRules(text) {
        // --- 或 ***
        text = text.replace(/^---$/gm, '<hr class="md-hr">');
        text = text.replace(/^\*\*\*$/gm, '<hr class="md-hr">');
        return text;
    }

    /**
     * 渲染引用块
     */
    renderBlockquotes(text) {
        // > 引用文本
        return text.replace(/^> (.+)$/gm, '<blockquote class="md-blockquote">$1</blockquote>');
    }

    /**
     * 渲染行内代码
     */
    renderInlineCode(text) {
        // `code`
        return text.replace(/`([^`]+)`/g, '<code class="md-code">$1</code>');
    }

    /**
     * HTML转义
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 渲染到DOM元素
     * @param {String} markdown - Markdown文本
     * @param {HTMLElement|String} container - 容器元素或ID
     * @param {Object} options - 渲染选项
     */
    renderToElement(markdown, container, options = {}) {
        const element = typeof container === 'string'
            ? document.getElementById(container)
            : container;

        if (!element) {
            console.error('[MarkdownRenderer] 容器元素不存在');
            return;
        }

        const html = this.render(markdown, options);
        element.innerHTML = html;

        // 添加样式类
        element.classList.add('markdown-content');
    }

    /**
     * 添加默认样式
     */
    injectStyles() {
        if (document.getElementById('markdown-renderer-styles')) {
            return; // 样式已注入
        }

        const style = document.createElement('style');
        style.id = 'markdown-renderer-styles';
        style.textContent = `
            /* Markdown渲染样式 */
            .markdown-content {
                line-height: 1.6;
                color: #4b5563;
                font-size: 15px;
            }

            .markdown-content .md-h1 {
                font-size: 26px;
                font-weight: 700;
                margin: 18px 0 10px 0;
                padding-bottom: 6px;
                border-bottom: 2px solid #eee;
                color: #4b5563;
            }

            .markdown-content .md-h2 {
                font-size: 22px;
                font-weight: 600;
                margin: 16px 0 8px 0;
                padding-bottom: 4px;
                border-bottom: 1px solid #f0f0f0;
                color: #4b5563;
            }

            .markdown-content .md-h3 {
                font-size: 19px;
                font-weight: 600;
                margin: 12px 0 6px 0;
                color: #4b5563;
            }

            .markdown-content .md-h4 {
                font-size: 17px;
                font-weight: 600;
                margin: 10px 0 6px 0;
                color: #5b6472;
            }

            .markdown-content .md-h5,
            .markdown-content .md-h6 {
                font-size: 15px;
                font-weight: 600;
                margin: 8px 0 4px 0;
                color: #5b6472;
            }

            .markdown-content .md-ul,
            .markdown-content .md-ol {
                margin: 8px 0;
                padding-left: 20px;
            }

            .markdown-content .md-li,
            .markdown-content .md-li-ordered {
                margin: 4px 0;
                line-height: 1.5;
            }

            .markdown-content .md-strong {
                font-weight: 600;
                color: #4b5563;
            }

            .markdown-content .md-em {
                font-style: italic;
                color: #4b5563;
            }

            .markdown-content .md-link {
                color: #667eea;
                text-decoration: none;
                border-bottom: 1px solid rgba(102, 126, 234, 0.3);
                transition: all 0.2s;
            }

            .markdown-content .md-link:hover {
                color: #764ba2;
                border-bottom-color: #764ba2;
            }

            .markdown-content .md-code {
                background: #f3f4f6;
                padding: 2px 6px;
                border-radius: 4px;
                font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
                font-size: 13px;
                color: #b4236a;
            }

            .markdown-content .code-block {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                padding: 12px;
                margin: 12px 0;
                overflow-x: auto;
                position: relative;
            }

            .markdown-content .code-block::before {
                content: attr(data-lang);
                position: absolute;
                top: 8px;
                right: 12px;
                font-size: 11px;
                color: #6c757d;
                text-transform: uppercase;
                font-weight: 600;
            }

            .markdown-content .code-block code {
                font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
                font-size: 13px;
                line-height: 1.6;
                color: #333;
                display: block;
            }

            .markdown-content .md-blockquote {
                border-left: 4px solid #9aa7f3;
                padding: 10px 14px;
                margin: 12px 0;
                background: #f5f7ff;
                color: #4a5160;
                font-style: italic;
            }

            .markdown-content .md-hr {
                border: none;
                border-top: 2px solid #e9ecef;
                margin: 16px 0;
            }

            .markdown-content .md-image {
                max-width: 100%;
                height: auto;
                border-radius: 8px;
                margin: 12px 0;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }

            .markdown-content p,
            .markdown-content .md-p {
                margin: 8px 0;
                line-height: 1.6;
            }

            /* 消息中的markdown样式优化 */
            .message-text.markdown-content {
                font-size: 15px;
                line-height: 1.55;
                color: #4b5563;
            }

            .message-text.markdown-content .md-h1,
            .message-text.markdown-content .md-h2,
            .message-text.markdown-content .md-h3 {
                margin-top: 12px;
                margin-bottom: 6px;
            }

            .message-text.markdown-content .md-h1,
            .message-text.markdown-content .md-h2,
            .message-text.markdown-content .md-h3,
            .message-text.markdown-content .md-h4,
            .message-text.markdown-content .md-h5,
            .message-text.markdown-content .md-h6,
            .message-text.markdown-content .md-strong {
                color: #4b5563;
            }

            .message-text.markdown-content .md-ul,
            .message-text.markdown-content .md-ol {
                margin: 6px 0;
            }

            .message-text.markdown-content .code-block {
                margin: 10px 0;
                font-size: 13px;
            }
        `;

        document.head.appendChild(style);
        console.log('[MarkdownRenderer] 样式已注入');
    }
}

// 导出（浏览器环境）
if (typeof window !== 'undefined') {
    window.MarkdownRenderer = MarkdownRenderer;
    window.markdownRenderer = new MarkdownRenderer();

    // 自动注入样式
    window.markdownRenderer.injectStyles();

    console.log('[MarkdownRenderer] Markdown渲染器已加载');
}
