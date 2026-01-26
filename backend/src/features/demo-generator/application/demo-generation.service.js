/**
 * Demo生成服务
 * 处理实际的代码生成逻辑
 */
import { CodeFile } from '../domain/entities/code-file.entity.js';
import { callDeepSeekAPI } from '../../../../../config/deepseek.js';

export class DemoGenerationService {
  constructor() {
    this.codeGenerationPrompts = {
      web: `你是一个专业的前端开发工程师。基于用户的创意对话，生成一个完整的、可运行的Web应用Demo。

要求：
1. 使用纯HTML + CSS + JavaScript（不需要构建工具）
2. 代码要完整、可直接在浏览器中打开运行
3. UI要美观、现代化，使用渐变色、圆角、阴影等设计元素
4. 响应式设计，适配桌面和移动端
5. 包含基本的交互功能和数据展示
6. 代码要有注释，便于理解

技术栈：
- HTML5
- CSS3（Flexbox、Grid、动画）
- Vanilla JavaScript（ES6+）
- 可以使用CDN引入的库（如Chart.js用于图表）

创意对话内容：
{CONVERSATION}

产品类型：{DEMO_TYPE}

请生成完整的代码文件，包括：
1. index.html - 主页面
2. styles.css - 样式文件
3. script.js - 交互逻辑
4. 如果需要，生成其他相关文件

确保所有文件都是完整的、可运行的。`,

      mobile: `你是一个专业的移动应用开发工程师。基于用户的创意对话，生成一个完整的移动应用Demo代码。

要求：
1. 使用React Native或Flutter（根据用户选择）
2. 代码要完整、结构清晰
3. UI要美观、符合移动应用设计规范
4. 包含基本的交互功能和数据展示
5. 代码要有注释，便于理解

创意对话内容：
{CONVERSATION}

请生成完整的代码文件，包括：
1. 主应用文件
2. 组件文件
3. 样式文件
4. 配置文件

确保所有文件都是完整的、可运行的。`,

      api: `你是一个专业的后端开发工程师。基于用户的创意对话，生成一个完整的API服务Demo。

要求：
1. 使用Node.js + Express或Python + Flask
2. 包含完整的RESTful API设计
3. 包含数据库模型和操作
4. 包含错误处理和验证
5. 代码要有注释，便于理解

创意对话内容：
{CONVERSATION}

请生成完整的代码文件，包括：
1. 主服务器文件
2. 路由文件
3. 控制器文件
4. 模型文件
5. 配置文件

确保所有文件都是完整的、可运行的。`
    };
  }

  /**
   * 生成代码
   */
  async generateCode(demo, conversation, additionalContext = {}) {
    const prompt = this.buildPrompt(demo, conversation, additionalContext);

    try {
      // 调用AI API生成代码
      const response = await callDeepSeekAPI(prompt, {
        temperature: 0.7,
        max_tokens: 4000
      });

      // 解析生成的代码
      const codeFiles = this.parseGeneratedCode(response.content);

      // 创建CodeFile实体
      return codeFiles.map(
        file =>
          new CodeFile(file.filename, {
            filename: file.filename,
            content: file.content,
            language: this.detectLanguage(file.filename),
            size: file.content.length
          })
      );
    } catch (error) {
      console.error('Demo generation failed:', error);
      throw new Error(`Failed to generate demo code: ${error.message}`);
    }
  }

  /**
   * 构建提示词
   */
  buildPrompt(demo, conversation, additionalContext) {
    const promptTemplate =
      this.codeGenerationPrompts[demo.type.value] || this.codeGenerationPrompts.web;

    return promptTemplate
      .replace('{CONVERSATION}', this.formatConversation(conversation))
      .replace('{DEMO_TYPE}', demo.type.value)
      .replace('{ADDITIONAL_CONTEXT}', JSON.stringify(additionalContext, null, 2));
  }

  /**
   * 格式化对话内容
   */
  formatConversation(conversation) {
    if (!Array.isArray(conversation)) {
      return String(conversation);
    }

    return conversation
      .map(msg => {
        const role = msg.role || 'user';
        const content = msg.content || msg.text || '';
        return `${role}: ${content}`;
      })
      .join('\n');
  }

  /**
   * 解析生成的代码
   */
  parseGeneratedCode(content) {
    const files = [];

    // 尝试解析代码块
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)\n```/g;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const language = match[1] || 'text';
      const code = match[2];

      // 尝试从代码中提取文件名
      const filename =
        this.extractFilename(code, language) || this.generateFilename(language, files.length);

      files.push({
        filename,
        content: code,
        language
      });
    }

    // 如果没有找到代码块，尝试按文件分割
    if (files.length === 0) {
      return this.splitIntoFiles(content);
    }

    return files;
  }

  /**
   * 从代码中提取文件名
   */
  extractFilename(code, language) {
    // 根据不同语言尝试提取文件名
    const patterns = {
      html: /<!--\s*File:\s*(.+?)\s*-->/,
      javascript: /\/\/\s*File:\s*(.+?)$/m,
      css: /\/\*\s*File:\s*(.+?)\s*\*\//,
      python: /#\s*File:\s*(.+?)$/m
    };

    const pattern = patterns[language];
    if (pattern) {
      const match = code.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * 生成文件名
   */
  generateFilename(language, index) {
    const extensions = {
      html: 'html',
      javascript: 'js',
      css: 'css',
      python: 'py',
      json: 'json',
      markdown: 'md'
    };

    const ext = extensions[language] || 'txt';
    const names = {
      0: `index.${ext}`,
      1: `styles.${ext}`,
      2: `script.${ext}`,
      3: `config.${ext}`
    };

    return names[index] || `file${index + 1}.${ext}`;
  }

  /**
   * 按文件分割内容
   */
  splitIntoFiles(content) {
    const files = [];

    // 简单的文件分割逻辑
    const sections = content.split(/\n\n===+\n\n/);

    sections.forEach((section, index) => {
      if (section.trim()) {
        files.push({
          filename: this.generateFilename('text', index),
          content: section.trim(),
          language: 'text'
        });
      }
    });

    return files;
  }

  /**
   * 检测编程语言
   */
  detectLanguage(filename) {
    const ext = filename.split('.').pop().toLowerCase();

    const languageMap = {
      html: 'html',
      htm: 'html',
      css: 'css',
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      cs: 'csharp',
      php: 'php',
      rb: 'ruby',
      go: 'go',
      rs: 'rust',
      swift: 'swift',
      kt: 'kotlin',
      json: 'json',
      xml: 'xml',
      yaml: 'yaml',
      yml: 'yaml',
      md: 'markdown'
    };

    return languageMap[ext] || 'text';
  }

  /**
   * 验证生成的代码
   */
  validateCode(codeFiles) {
    const errors = [];

    codeFiles.forEach(file => {
      if (!file.filename || !file.content) {
        errors.push('Invalid file: missing filename or content');
      }

      if (file.content.length > 100000) {
        errors.push(`File ${file.filename} is too large (>100KB)`);
      }
    });

    // 检查必需文件
    const hasIndexFile = codeFiles.some(
      f => f.filename === 'index.html' || f.filename === 'index.js' || f.filename === 'main.js'
    );

    if (!hasIndexFile) {
      errors.push('Missing main entry file (index.html, index.js, or main.js)');
    }

    if (errors.length > 0) {
      throw new Error(`Code validation failed: ${errors.join(', ')}`);
    }

    return true;
  }
}

export default DemoGenerationService;
