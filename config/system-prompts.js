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

/**
 * 从后端 API 加载系统提示词
 */
async function loadSystemPrompts() {
    if (isLoaded) {
        return SYSTEM_PROMPTS;
    }

    try {
        const response = await fetch('http://localhost:3000/api/prompts/system-default');
        if (!response.ok) {
            throw new Error(`Failed to load system prompt: ${response.statusText}`);
        }

        const promptContent = await response.text();
        SYSTEM_PROMPTS.default = promptContent;
        isLoaded = true;

        console.log('✅ System prompts loaded from API');
        return SYSTEM_PROMPTS;
    } catch (error) {
        console.error('❌ Failed to load system prompts from API:', error);

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

