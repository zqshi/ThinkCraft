/**
 * 提示词加载工具类
 * 从 docs/prompt 目录加载 Markdown 格式的提示词文件
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PromptLoader {
  constructor() {
    // 提示词文件根目录（项目根目录的 prompts）
    this.promptDir = path.join(__dirname, '../../../prompts');
    // 提示词缓存
    this.cache = new Map();
    // 是否启用缓存
    this.cacheEnabled = process.env.NODE_ENV === 'production';
    // Agent和Task Prompts缓存
    this.agentPrompts = new Map();
    this.taskPrompts = new Map();
    this.initialized = false;
  }

  /**
   * 初始化加载所有Agent和Task Prompts
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      console.log('[PromptLoader] 开始加载Agent和Task Prompts');

      // 加载Agent Prompts
      await this._loadAgentPrompts();

      // 加载Task Prompts
      await this._loadTaskPrompts();

      this.initialized = true;
      console.log(
        `[PromptLoader] Prompt加载完成 - Agents: ${this.agentPrompts.size}, Tasks: ${this.taskPrompts.size}`
      );
    } catch (error) {
      console.error('[PromptLoader] Prompt加载失败:', error);
    }
  }

  /**
   * 加载所有Agent Prompts
   */
  async _loadAgentPrompts() {
    const agentsDir = path.join(this.promptDir, 'agents');

    try {
      const files = await fs.readdir(agentsDir);

      for (const file of files) {
        if (!file.endsWith('.md')) {
          continue;
        }

        const agentType = path.basename(file, '.md');
        const filePath = path.join(agentsDir, file);

        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const prompt = this._extractSystemPrompt(content);

          if (prompt) {
            this.agentPrompts.set(agentType, prompt);
            console.log(`[PromptLoader] 加载Agent Prompt: ${agentType}`);
          }
        } catch (error) {
          console.warn(`[PromptLoader] 加载Agent Prompt失败: ${file}`, error.message);
        }
      }
    } catch (error) {
      console.warn('[PromptLoader] Agent Prompts目录不存在或无法访问');
    }
  }

  /**
   * 加载所有Task Prompts
   */
  async _loadTaskPrompts() {
    const tasksDir = path.join(this.promptDir, 'tasks');

    try {
      const files = await fs.readdir(tasksDir);

      for (const file of files) {
        if (!file.endsWith('.md')) {
          continue;
        }

        const taskType = path.basename(file, '.md');
        const filePath = path.join(tasksDir, file);

        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const prompt = this._extractPromptTemplate(content);

          if (prompt) {
            this.taskPrompts.set(taskType, prompt);
            console.log(`[PromptLoader] 加载Task Prompt: ${taskType}`);
          }
        } catch (error) {
          console.warn(`[PromptLoader] 加载Task Prompt失败: ${file}`, error.message);
        }
      }
    } catch (error) {
      console.warn('[PromptLoader] Task Prompts目录不存在或无法访问');
    }
  }

  /**
   * 从Markdown中提取System Prompt
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
  }

  /**
   * 从Markdown中提取Prompt模板
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
  }

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
  }

  /**
   * 解析YAML值
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
  }

  /**
   * 获取Agent Prompt
   */
  getAgentPrompt(agentType) {
    return this.agentPrompts.get(agentType) || null;
  }

  /**
   * 获取Task Prompt
   */
  getTaskPrompt(taskType) {
    return this.taskPrompts.get(taskType) || null;
  }

  /**
   * 获取所有可用的Agent类型
   */
  getAvailableAgentTypes() {
    return Array.from(this.agentPrompts.keys());
  }

  /**
   * 获取所有可用的Task类型
   */
  getAvailableTaskTypes() {
    return Array.from(this.taskPrompts.keys());
  }

  /**
   * 加载提示词文件
   * @param {string} promptName - 提示词名称（不含 .md 后缀）
   * @returns {Promise<string>} 提示词内容
   */
  async load(promptName) {
    // 检查缓存
    if (this.cacheEnabled && this.cache.has(promptName)) {
      return this.cache.get(promptName);
    }

    try {
      const filePath = path.join(this.promptDir, `${promptName}.md`);
      const content = await fs.readFile(filePath, 'utf-8');

      // 移除 YAML front matter（--- ... ---）
      let cleanedContent = content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '').trim();

      // 移除 Markdown 注释（<!-- ... -->）
      cleanedContent = cleanedContent.replace(/<!--[\s\S]*?-->/g, '').trim();

      // 缓存内容
      if (this.cacheEnabled) {
        this.cache.set(promptName, cleanedContent);
      }

      return cleanedContent;
    } catch (error) {
      throw new Error(`Failed to load prompt "${promptName}": ${error.message}`);
    }
  }

  /**
   * 批量加载提示词
   * @param {string[]} promptNames - 提示词名称数组
   * @returns {Promise<Object>} 提示词对象 { promptName: content }
   */
  async loadBatch(promptNames) {
    const prompts = {};
    await Promise.all(
      promptNames.map(async name => {
        prompts[name] = await this.load(name);
      })
    );
    return prompts;
  }

  /**
   * 构建带章节注入的完整文档提示词
   * @param {string} type - 文档类型 ('business-plan' 或 'proposal')
   * @param {Array<string>} selectedChapterIds - 用户选择的章节ID数组
   * @param {Array} conversationHistory - 对话历史数组
   * @returns {Promise<Object>} { systemPrompt, prompt, metadata }
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
  }

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
          chapters[chapter.id.replace(/-/g, '_')] = content;
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
        'risk-assessment',
        'implementation-plan',
        'appendix'
      ];

      const chapters = {};
      await Promise.all(
        chapterIds.map(async id => {
          try {
            const promptName = `business-plan/business-plan-${id}`;
            chapters[id.replace(/-/g, '_')] = await this.load(promptName);
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
  async loadProposalChapters() {
    try {
      const config = await this.loadChaptersConfig('proposal');
      const chapters = {};

      await Promise.all(
        config.chapters.map(async chapter => {
          const content = await this.loadChapterTemplate('proposal', chapter.id);
          chapters[chapter.id.replace(/-/g, '_')] = content;
        })
      );

      return chapters;
    } catch (error) {
      console.warn('[PromptLoader] 加载产品立项材料章节失败，尝试使用旧方式:', error.message);
      // 向后兼容：如果新方式失败，尝试旧方式
      const chapterMapping = {
        executive_summary: 'proposal/proposal-project-summary',
        market_analysis: 'proposal/proposal-problem-insight',
        solution: 'proposal/proposal-product-solution',
        implementation_plan: 'proposal/proposal-implementation-path',
        competitive_landscape: 'proposal/proposal-competitive-analysis',
        financial_projection: 'proposal/proposal-budget-planning',
        risk_assessment: 'proposal/proposal-risk-control'
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
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * 重新加载所有提示词（清除缓存并重新加载）
   */
  async reload() {
    this.clearCache();
    this.agentPrompts.clear();
    this.taskPrompts.clear();
    this.initialized = false;
    await this.initialize();
    console.log('Prompt cache cleared and reloaded');
  }

  /**
   * 加载workflow配置
   * @param {string} workflowId - workflow ID (agent-product 或 traditional-product)
   * @returns {Promise<Object>} workflow配置对象
   */
  async loadWorkflowConfig(workflowId) {
    const filePath = path.join(this.promptDir, `workflows/${workflowId}-workflow.json`);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(`[PromptLoader] Workflow配置不存在: ${workflowId}`);
      return null;
    }
  }

  /**
   * 获取workflow的所有Agent
   * @param {string} workflowId - workflow ID
   * @returns {Promise<Array>} Agent列表
   */
  async getWorkflowAgents(workflowId) {
    const config = await this.loadWorkflowConfig(workflowId);
    if (!config) {
      return [];
    }

    const agents = [];
    for (const phase of config.phases) {
      for (const agent of phase.agents) {
        agents.push({
          agentId: agent.agent_id,
          role: agent.role,
          tasks: agent.tasks,
          phase: phase.phase_id
        });
      }
    }
    return agents;
  }

  /**
   * 加载商业计划书章节配置
   * @returns {Promise<Object>} 章节配置对象
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
  }

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
  }

  /**
   * 加载完整文档提示词
   * @param {string} type - 文档类型 ('business-plan' 或 'proposal' 或 'analysis-report')
   * @returns {Promise<Object>} 解析后的提示词对象 { metadata, systemPrompt, template }
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
  }

  /**
   * 加载章节模板
   * @param {string} type - 文档类型 ('business-plan' 或 'proposal')
   * @param {string} chapterId - 章节ID
   * @returns {Promise<string>} 章节模板内容
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
  }

  /**
   * 加载章节配置
   * @param {string} type - 文档类型 ('business-plan' 或 'proposal')
   * @returns {Promise<Object>} 章节配置对象
   */
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
  }

  /**
   * 格式化对话历史
   * @param {Array} conversationHistory - 对话历史数组
   * @returns {string} 格式化后的对话历史
   */
  _formatConversation(conversationHistory) {
    if (!Array.isArray(conversationHistory)) {
      return '';
    }
    return conversationHistory
      .map(msg => `${msg.role === 'user' ? '用户' : 'AI助手'}: ${msg.content}`)
      .join('\n\n');
  }

  /**
   * 根据用户选择的章节，动态构建完整的prompt
   * @param {Object} chaptersConfig - 章节配置对象
   * @param {Array<string>} selectedChapterIds - 用户选择的章节ID数组
   * @param {string} conversationHistory - 对话历史
   * @returns {string} 完整的prompt
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
  }

  /**
   * 列出所有可用的提示词文件
   * @returns {Promise<string[]>} 提示词名称数组
   */
  async list() {
    try {
      const files = await fs.readdir(this.promptDir);
      return files
        .filter(file => file.endsWith('.md') && file !== 'README.md')
        .map(file => file.replace('.md', ''));
    } catch (error) {
      throw new Error(`Failed to list prompts: ${error.message}`);
    }
  }

  /**
   * 检查提示词文件是否存在
   * @param {string} promptName - 提示词名称
   * @returns {Promise<boolean>}
   */
  async exists(promptName) {
    try {
      const filePath = path.join(this.promptDir, `${promptName}.md`);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

// 导出单例
export default new PromptLoader();
