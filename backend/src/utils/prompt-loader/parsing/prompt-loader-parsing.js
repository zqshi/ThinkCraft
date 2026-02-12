import path from 'path';

export const promptLoaderParsingMethods = {
  _formatConversation(conversationHistory) {
    if (!Array.isArray(conversationHistory)) {
      return '';
    }
    return conversationHistory
      .map(msg => `${msg.role === 'user' ? '用户' : 'AI助手'}: ${msg.content}`)
      .join('\n\n');
  },

  /**
   * 根据用户选择的章节，动态构建完整的prompt
   * @param {Object} chaptersConfig - 章节配置对象
   * @param {Array<string>} selectedChapterIds - 用户选择的章节ID数组
   * @param {string} conversationHistory - 对话历史
   * @returns {string} 完整的prompt
   */

  _parseYAMLValue(value) {
    // 移除引号
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      return value.slice(1, -1);
    }

    // 布尔值
    if (value === 'true') {
      return true;
    }
    if (value === 'false') {
      return false;
    }

    // 数字
    if (!isNaN(value) && value !== '') {
      return Number(value);
    }

    return value;
  },

  /**
   * 获取Agent Prompt
   */

  _resolvePromptPath(promptName) {
    if (!promptName || typeof promptName !== 'string') {
      throw new Error('Invalid prompt path');
    }

    const normalized = promptName.replace(/\\/g, '/').trim();
    if (
      normalized.startsWith('/') ||
      normalized.includes('..') ||
      normalized.includes('\0')
    ) {
      throw new Error('Invalid prompt path');
    }

    const filePath = path.resolve(this.promptDir, `${normalized}.md`);
    if (!filePath.startsWith(this.promptDir + path.sep)) {
      throw new Error('Invalid prompt path');
    }

    return filePath;
  },

  /**
   * 初始化加载所有Agent和Task Prompts
   */

  _extractSystemPrompt(content) {
    // 查找 ## System Prompt 部分的代码块
    const match = content.match(/## System Prompt\s*```\s*([\s\S]*?)```/);
    if (match && match[1]) {
      return match[1].trim();
    }

    // 如果没有找到，尝试查找第一个代码块
    const codeBlockMatch = content.match(/```\s*([\s\S]*?)```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      return codeBlockMatch[1].trim();
    }

    return null;
  },

  /**
   * 从Markdown中提取Prompt模板
   */

  _parseYAML(yamlString) {
    const lines = yamlString.split('\n');
    const result = {};
    const currentObject = result;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      if (trimmed.includes(':')) {
        const colonIndex = trimmed.indexOf(':');
        const key = trimmed.substring(0, colonIndex).trim();
        const value = trimmed.substring(colonIndex + 1).trim();

        if (value) {
          // 简单值
          currentObject[key] = this._parseYAMLValue(value);
        } else {
          // 嵌套对象
          currentObject[key] = {};
        }
      }
    }

    return result;
  },

  /**
   * 解析YAML值
   */

  _extractPromptTemplate(content) {
    // 查找 ## Prompt模板 部分的代码块
    const match = content.match(/## Prompt模板\s*```\s*([\s\S]*?)```/);
    if (match && match[1]) {
      return match[1].trim();
    }

    // 如果没有找到，尝试查找第一个代码块
    const codeBlockMatch = content.match(/```\s*([\s\S]*?)```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      return codeBlockMatch[1].trim();
    }

    // 如果没有代码块，查找 ## Prompt模板 后的所有内容
    const templateMatch = content.match(/## Prompt模板\s*([\s\S]*?)(?=\n##|$)/);
    if (templateMatch && templateMatch[1]) {
      return templateMatch[1].trim();
    }

    return null;
  },

  /**
   * 解析带元数据的提示词文件（支持YAML frontmatter）
   */

  _parsePromptWithMetadata(content) {
    // 提取YAML frontmatter
    const metadataMatch = content.match(/^---\n([\s\S]*?)\n---/);
    let metadata = {};
    let mainContent = content;

    if (metadataMatch) {
      metadata = this._parseYAML(metadataMatch[1]);
      mainContent = content.substring(metadataMatch[0].length).trim();
    }

    // 提取System Prompt和Prompt模板
    const systemPrompt = this._extractSystemPrompt(mainContent);
    const template = this._extractPromptTemplate(mainContent);

    return { metadata, systemPrompt, template: template || mainContent };
  }

  /**
   * 简单的YAML解析器（用于解析元数据）
   */
};
