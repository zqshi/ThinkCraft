import fs from 'fs/promises';
import path from 'path';

export const promptLoaderLoadingMethods = {
  async _loadAgentTemplatePrompts() {
    try {
      const templateFiles = await this._listMarkdownFilesByDirName('templates');
      const agentRoot = path.join(this.promptDir, 'agents');
      for (const filePath of templateFiles) {
        if (!filePath.startsWith(agentRoot + path.sep)) {
          continue;
        }
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const parsed = this._parsePromptWithMetadata(content);
          const template = parsed.template || parsed.systemPrompt || '';
          if (!template) {
            continue;
          }
          const templateId = parsed.metadata?.id || path.basename(filePath, '.md');
          if (!templateId) {
            continue;
          }
          this.agentTemplatePrompts.set(templateId, template);
          this.taskPrompts.set(templateId, template);
          console.log(`[PromptLoader] 加载Agent Template Prompt: ${templateId}`);
        } catch (error) {
          console.warn(`[PromptLoader] 加载Agent Template失败: ${filePath}`, error.message);
        }
      }
    } catch (error) {
      console.warn('[PromptLoader] Agent Templates目录不存在或无法访问');
    }
  },

  async _listMarkdownFilesByDirName(dirName) {
    const entries = await this._walkDirectory(this.promptDir);
    return entries
      .filter(
        entry =>
          entry.type === 'file' &&
          entry.path.endsWith('.md') &&
          entry.path.split(path.sep).includes(dirName)
      )
      .map(entry => entry.path);
  },

  async _walkDirectory(dirPath) {
    const results = [];
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        const nested = await this._walkDirectory(entryPath);
        results.push(...nested);
      } else if (entry.isFile()) {
        results.push({ type: 'file', path: entryPath });
      }
    }

    return results;
  },

  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      console.log('[PromptLoader] 开始加载Agent和Task Prompts');
      await this._loadAgentPrompts();
      await this._loadTaskPrompts();
      await this._loadAgentTemplatePrompts();
      this.initialized = true;
      console.log(
        `[PromptLoader] Prompt加载完成 - Agents: ${this.agentPrompts.size}, Tasks: ${this.taskPrompts.size}, AgentTemplates: ${this.agentTemplatePrompts.size}`
      );
    } catch (error) {
      console.error('[PromptLoader] Prompt加载失败:', error);
    }
  },

  async _loadAgentPrompts() {
    try {
      const agentFiles = await this._listMarkdownFilesByDirName('agents');
      for (const filePath of agentFiles) {
        const fileName = path.basename(filePath, '.md');
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const prompt = this._extractPromptTemplate(content);
          if (prompt) {
            this.agentPrompts.set(fileName, prompt);
          }
        } catch (error) {
          console.warn(`[PromptLoader] 加载Agent Prompt失败: ${filePath}`, error.message);
        }
      }
    } catch (error) {
      console.warn('[PromptLoader] Agent Prompts目录不存在或无法访问');
    }
  },

  async _loadTaskPrompts() {
    try {
      const taskFiles = await this._listMarkdownFilesByDirName('tasks');
      for (const filePath of taskFiles) {
        const taskType = path.basename(filePath, '.md');
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const prompt = this._extractPromptTemplate(content);
          if (prompt) {
            this.taskPrompts.set(taskType, prompt);
            console.log(`[PromptLoader] 加载Task Prompt: ${taskType}`);
          }
        } catch (error) {
          console.warn(`[PromptLoader] 加载Task Prompt失败: ${filePath}`, error.message);
        }
      }
    } catch (error) {
      console.warn('[PromptLoader] Task Prompts目录不存在或无法访问');
    }
  },

  async load(promptName) {
    if (this.cacheEnabled && this.cache.has(promptName)) {
      return this.cache.get(promptName);
    }

    try {
      const filePath = this._resolvePromptPath(promptName);
      const content = await fs.readFile(filePath, 'utf-8');
      let cleanedContent = content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '').trim();
      cleanedContent = cleanedContent.replace(/<!--[\s\S]*?-->/g, '').trim();
      if (this.cacheEnabled) {
        this.cache.set(promptName, cleanedContent);
      }
      return cleanedContent;
    } catch (error) {
      throw new Error(`Failed to load prompt "${promptName}": ${error.message}`);
    }
  },

  async list() {
    try {
      const entries = await this._walkDirectory(this.promptDir);
      return entries
        .filter(entry => entry.type === 'file' && entry.path.endsWith('.md'))
        .map(entry => path.relative(this.promptDir, entry.path).replace(/\.md$/, ''))
        .filter(name => !name.endsWith('README'));
    } catch (error) {
      throw new Error(`Failed to list prompts: ${error.message}`);
    }
  },

  async loadBatch(promptNames) {
    const prompts = {};
    await Promise.all(
      promptNames.map(async name => {
        prompts[name] = await this.load(name);
      })
    );
    return prompts;
  },

  async exists(promptName) {
    try {
      const filePath = this._resolvePromptPath(promptName);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
};
