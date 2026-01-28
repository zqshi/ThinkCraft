/**
 * ThinkCraft 系统提示词配置
 *
 * 使用说明：
 * 1. 提示词现在从 docs/prompt 目录的 markdown 文件加载
 * 2. 修改提示词请编辑 docs/prompt/*.md 文件
 * 3. 重启后端服务即可生效
 * 4. 本文件负责从后端 API 加载提示词
 */

const SYSTEM_PROMPTS = {};
let isLoaded = false;

// 默认使用哪个预设
const DEFAULT_PROMPT = 'default';

console.log('[SystemPrompts] script loaded');

function extractSystemPrompt(rawContent) {
    if (!rawContent) {
        return rawContent;
    }
    const markerMatch = rawContent.match(/##\s*System Prompt[\s\S]*/i);
    if (markerMatch && markerMatch[0]) {
        return markerMatch[0].replace(/##\s*System Prompt\s*/i, '').trim();
    }
    return rawContent.trim();
}

/**
 * 从后端 API 加载系统提示词
 */
async function loadSystemPrompts() {
    if (isLoaded) {
        return SYSTEM_PROMPTS;
    }

    try {
        const savedSettings = JSON.parse(localStorage.getItem('thinkcraft_settings') || '{}');
        const apiBase =
            savedSettings.apiUrl ||
            window.appState?.settings?.apiUrl ||
            'http://localhost:3000';
        const response = await fetch(
            `${apiBase}/api/prompts/scene-1-dialogue/dialogue-guide/system-default`
        );
        if (!response.ok) {
            throw new Error(`Failed to load system prompt: ${response.statusText}`);
        }

        const promptContent = await response.text();
        SYSTEM_PROMPTS.default = extractSystemPrompt(promptContent);
        isLoaded = true;

        console.log('✅ System prompts loaded from API');
        console.log(
            '[SystemPrompts] default key:',
            DEFAULT_PROMPT,
            'len:',
            SYSTEM_PROMPTS.default ? SYSTEM_PROMPTS.default.length : 0
        );
        return SYSTEM_PROMPTS;
    } catch (error) {
        console.error('❌ Failed to load system prompts from API:', error);
    }

    try {
        const localResponse = await fetch(
            '/prompts/scene-1-dialogue/dialogue-guide/system-default.md'
        );
        if (!localResponse.ok) {
            throw new Error(`Failed to load local prompt: ${localResponse.statusText}`);
        }
        let promptContent = await localResponse.text();
        // 兼容本地文件：移除 front matter 和注释
        promptContent = promptContent
            .replace(/^---\s*[\s\S]*?\s*---\s*/m, '')
            .replace(/<!--[\s\S]*?-->/g, '')
            .trim();

        SYSTEM_PROMPTS.default = extractSystemPrompt(promptContent);
        isLoaded = true;
        console.log('✅ System prompts loaded from local file');
        console.log(
            '[SystemPrompts] default key:',
            DEFAULT_PROMPT,
            'len:',
            SYSTEM_PROMPTS.default ? SYSTEM_PROMPTS.default.length : 0
        );
        return SYSTEM_PROMPTS;
    } catch (error) {
        console.error('❌ Failed to load system prompts from local file:', error);

        // 降级方案：使用内置的默认提示词
        SYSTEM_PROMPTS.default = `# 系统提示词：结构化战略思考引导者 (ThinkCraft Pro)

## 核心身份与定位
你是 **ThinkCraft Pro**，一位融合了 **麦肯锡结构化问题解决方法论** 与 **苏格拉底式启发对话艺术** 的顶级战略顾问与思维教练。你的核心使命是：通过一个清晰、强大的 **"定义-拆解-验证-解决"引导流程**，帮助用户将任何模糊的创意、挑战或商业问题，转化为定义清晰、逻辑严谨、可验证、可执行的行动蓝图。

欢迎使用ThinkCraft Pro。让我们从最核心的开始：**您今天想探讨或解决的核心课题是什么？**`;

        console.warn('⚠️ Using fallback system prompt');
        isLoaded = true;
        return SYSTEM_PROMPTS;
    }
}

// 页面加载时自动加载提示词
if (typeof window !== 'undefined') {
    loadSystemPrompts().then(() => {
        window.SYSTEM_PROMPTS = SYSTEM_PROMPTS;
        window.DEFAULT_PROMPT = DEFAULT_PROMPT;
    });
}

// 导出配置
if (typeof window !== 'undefined') {
    window.SYSTEM_PROMPTS = SYSTEM_PROMPTS;
    window.DEFAULT_PROMPT = DEFAULT_PROMPT;
    window.loadSystemPrompts = loadSystemPrompts;
}
