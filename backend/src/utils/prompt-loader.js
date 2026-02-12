/**
 * 提示词加载工具类
 * 从 docs/prompt 目录加载 Markdown 格式的提示词文件
 */
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { promptLoaderParsingMethods } from './prompt-loader/parsing/prompt-loader-parsing.js';
import { promptLoaderLoadingMethods } from './prompt-loader/loading/prompt-loader-loading.js';
import { promptLoaderRetrievalMethods } from './prompt-loader/retrieval/prompt-loader-retrieval.js';
import { promptLoaderDocumentMethods } from './prompt-loader/document/prompt-loader-document.js';
import { promptLoaderMaintenanceMethods } from './prompt-loader/maintenance/prompt-loader-maintenance.js';

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
    // Agent模板Prompts缓存（来自 prompts/agents/**/templates）
    this.agentTemplatePrompts = new Map();
    this.initialized = false;
  }

  /**
   * 安全解析提示词路径，防止目录穿越
   */
}

Object.assign(
  PromptLoader.prototype,
  promptLoaderParsingMethods,
  promptLoaderLoadingMethods,
  promptLoaderRetrievalMethods,
  promptLoaderDocumentMethods,
  promptLoaderMaintenanceMethods
);

// 导出单例
export default new PromptLoader();
