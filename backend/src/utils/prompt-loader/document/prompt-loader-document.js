import fs from 'fs/promises';
import path from 'path';

export const promptLoaderDocumentMethods = {
  async loadChaptersConfig(type) {
    let filePath = path.join(this.promptDir, `scene-1-dialogue/${type}/chapters-config.json`);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      // 旧路径兼容
      filePath = path.join(this.promptDir, `${type}/chapters-config.json`);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content);
      } catch (fallbackError) {
        throw new Error(`Failed to load chapters config for "${type}": ${error.message}`);
      }
    }
  },

  /**
   * 格式化对话历史
   * @param {Array} conversationHistory - 对话历史数组
   * @returns {string} 格式化后的对话历史
   */

  async loadFullDocumentPrompt(type) {
    let filePath = path.join(this.promptDir, `scene-1-dialogue/${type}/full-document.md`);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return this._parsePromptWithMetadata(content);
    } catch (error) {
      // 旧路径兼容
      filePath = path.join(this.promptDir, `${type}/full-document.md`);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        return this._parsePromptWithMetadata(content);
      } catch (fallbackError) {
        throw new Error(`Failed to load full document prompt for "${type}": ${error.message}`);
      }
    }
  },

  /**
   * 加载章节模板
   * @param {string} type - 文档类型 ('business-plan' 或 'proposal')
   * @param {string} chapterId - 章节ID
   * @returns {Promise<string>} 章节模板内容
   */

  async loadBusinessPlanChaptersConfig() {
    const filePath = path.join(this.promptDir, 'business-plan/chapters-config.json');
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.warn('[PromptLoader] 商业计划书章节配置不存在');
      return null;
    }
  },

  /**
   * 加载产品立项材料章节配置
   * @returns {Promise<Object>} 章节配置对象
   */

  async loadProposalChaptersConfig() {
    let filePath = path.join(this.promptDir, 'scene-1-dialogue/proposal/chapters-config.json');
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      // 旧路径兼容
      filePath = path.join(this.promptDir, 'proposal/chapters-config.json');
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content);
      } catch (fallbackError) {
        console.warn('[PromptLoader] 产品立项材料章节配置不存在');
        return null;
      }
    }
  },

  /**
   * 加载完整文档提示词
   * @param {string} type - 文档类型 ('business-plan' 或 'proposal' 或 'analysis-report')
   * @returns {Promise<Object>} 解析后的提示词对象 { metadata, systemPrompt, template }
   */

  async loadProposalChapters() {
    try {
      const config = await this.loadChaptersConfig('proposal');
      const chapters = {};

      await Promise.all(
        config.chapters.map(async chapter => {
          const content = await this.loadChapterTemplate('proposal', chapter.id);
          chapters[chapter.id] = content;
        })
      );

      return chapters;
    } catch (error) {
      console.warn('[PromptLoader] 加载产品立项材料章节失败，尝试使用旧方式:', error.message);
      // 向后兼容：如果新方式失败，尝试旧方式
      const chapterMapping = {
        'project-summary': 'proposal/proposal-project-summary',
        'problem-insight': 'proposal/proposal-problem-insight',
        'product-solution': 'proposal/proposal-product-solution',
        'implementation-path': 'proposal/proposal-implementation-path',
        'budget-planning': 'proposal/proposal-budget-planning',
        'risk-control': 'proposal/proposal-risk-control'
      };

      const chapters = {};
      await Promise.all(
        Object.entries(chapterMapping).map(async ([chapterId, promptName]) => {
          try {
            chapters[chapterId] = await this.load(promptName);
          } catch (err) {
            console.warn(`[PromptLoader] 跳过章节: ${chapterId}`);
          }
        })
      );
      return chapters;
    }
  },

  /**
   * 清除缓存
   */

  buildDocumentPrompt(chaptersConfig, selectedChapterIds, conversationHistory) {
    const selectedChapters = chaptersConfig.chapters.filter(c => selectedChapterIds.includes(c.id));

    const chapterPrompts = selectedChapters
      .map(chapter => {
        return `## ${chapter.name}\n\n${chapter.prompt_template}`;
      })
      .join('\n\n');

    return `你是专业的商业文档撰写专家。请基于用户与AI的对话历史，生成包含以下章节的完整文档：

${chapterPrompts}

## 对话历史
${conversationHistory}

## 输出要求
1. 严格按照上述章节顺序输出
2. 每个章节使用Markdown格式
3. 章节之间用分隔线（---）分隔
4. 确保内容连贯、逻辑清晰
5. 输出格式：
\`\`\`markdown
# 文档标题

## 章节1名称
[章节1内容]

---

## 章节2名称
[章节2内容]

---

...
\`\`\`

请直接输出完整的Markdown文档，不要包含其他说明文字。`;
  },

  /**
   * 列出所有可用的提示词文件
   * @returns {Promise<string[]>} 提示词名称数组
   */

  async loadChapterTemplate(type, chapterId) {
    // 尝试新的目录结构（scene-1-dialogue）
    let filePath = path.join(this.promptDir, `scene-1-dialogue/${type}/chapters/${chapterId}.md`);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = this._parsePromptWithMetadata(content);
      // 返回模板内容，优先使用template，如果没有则使用systemPrompt
      return parsed.template || parsed.systemPrompt;
    } catch (error) {
      // 如果新路径失败，尝试旧路径（向后兼容）
      filePath = path.join(this.promptDir, `${type}/chapters/${chapterId}.md`);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const parsed = this._parsePromptWithMetadata(content);
        return parsed.template || parsed.systemPrompt;
      } catch (fallbackError) {
        throw new Error(
          `Failed to load chapter template "${chapterId}" for "${type}": ${error.message}`
        );
      }
    }
  },

  /**
   * 加载章节配置
   * @param {string} type - 文档类型 ('business-plan' 或 'proposal')
   * @returns {Promise<Object>} 章节配置对象
   */

  async buildPromptWithChapters(type, selectedChapterIds, conversationHistory) {
    try {
      // 1. 加载完整文档提示词
      const fullDoc = await this.loadFullDocumentPrompt(type);

      // 2. 加载章节配置
      const config = await this.loadChaptersConfig(type);

      // 3. 分类章节
      const requiredChapters = [];
      const optionalChapters = [];

      for (const chapterId of selectedChapterIds) {
        const chapterTemplate = await this.loadChapterTemplate(type, chapterId);
        const chapterConfig = config.chapters.find(c => c.id === chapterId);

        if (!chapterConfig) {
          console.warn(`[PromptLoader] 章节配置不存在: ${chapterId}`);
          continue;
        }

        if (chapterConfig.required) {
          requiredChapters.push(chapterTemplate);
        } else {
          optionalChapters.push(chapterTemplate);
        }
      }

      // 4. 格式化对话历史
      const formattedConversation = this._formatConversation(conversationHistory);

      // 5. 替换占位符
      let finalPrompt = fullDoc.template || fullDoc.systemPrompt;
      finalPrompt = finalPrompt
        .replace('{CONVERSATION_HISTORY}', formattedConversation)
        .replace('{REQUIRED_CHAPTERS}', requiredChapters.join('\n\n'))
        .replace('{OPTIONAL_CHAPTERS}', optionalChapters.join('\n\n'));

      return {
        systemPrompt: fullDoc.systemPrompt,
        prompt: finalPrompt,
        metadata: fullDoc.metadata
      };
    } catch (error) {
      throw new Error(`Failed to build prompt with chapters for "${type}": ${error.message}`);
    }
  },

  /**
   * 加载所有商业计划书章节提示词
   * @returns {Promise<Object>} 章节提示词对象 { chapterId: content }
   */

  async loadBusinessPlanChapters() {
    try {
      const config = await this.loadChaptersConfig('business-plan');
      const chapters = {};

      await Promise.all(
        config.chapters.map(async chapter => {
          const content = await this.loadChapterTemplate('business-plan', chapter.id);
          chapters[chapter.id] = content;
        })
      );

      return chapters;
    } catch (error) {
      console.warn('[PromptLoader] 加载商业计划书章节失败，尝试使用旧方式:', error.message);
      // 向后兼容：如果新方式失败，尝试旧方式
      const chapterIds = [
        'executive-summary',
        'market-analysis',
        'solution',
        'business-model',
        'competitive-landscape',
        'marketing-strategy',
        'team-structure',
        'financial-projection',
        'risk-assessment'
      ];

      const chapters = {};
      await Promise.all(
        chapterIds.map(async id => {
          try {
            const promptName = `business-plan/business-plan-${id}`;
            chapters[id] = await this.load(promptName);
          } catch (err) {
            console.warn(`[PromptLoader] 跳过章节: ${id}`);
          }
        })
      );
      return chapters;
    }
  }

  /**
   * 加载所有产品立项材料章节提示词
   * @returns {Promise<Object>} 章节提示词对象 { chapterId: content }
   */
};
