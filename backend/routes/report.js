import express from 'express';
import { callDeepSeekAPI } from '../config/deepseek.js';

const router = express.Router();

// 报告生成专用系统提示词
const REPORT_GENERATION_PROMPT = `你是ThinkCraft的专业报告分析师。你的任务是基于用户与AI助手的对话历史，生成一份结构化的创意分析报告。

**重要要求：**
1. 仔细阅读整个对话历史，提取关键信息
2. 如果信息不足，用合理的推断补充，但要标注为"推测"
3. 输出必须是严格的JSON格式，不要有任何额外文字
4. 保持专业、客观、建设性的分析态度

**输出JSON结构：**
{
  "initialIdea": "用户最初提出的创意（从第一条用户消息提取）",
  "coreDefinition": "经过澄清后的精准定义（一句话概括）",
  "targetUser": "目标用户群体",
  "problem": "要解决的核心痛点",
  "solution": "解决方案描述",
  "validation": "验证指标或成功标准",
  "chapters": {
    "chapter1": {
      "title": "第一章：创意定义与演化",
      "originalIdea": "原始表述",
      "evolution": "从原始想法到精准定义的关键转变点"
    },
    "chapter2": {
      "title": "第二章：核心洞察与根本假设",
      "surfaceNeed": "表层需求",
      "deepMotivation": "深层动力",
      "assumptions": ["假设1", "假设2", "假设3"]
    },
    "chapter3": {
      "title": "第三章：边界条件与应用场景",
      "idealScenario": "最佳应用场景描述",
      "limitations": ["限制条件1", "限制条件2"],
      "prerequisites": {
        "technical": "技术前置条件",
        "resources": "资源要求",
        "partnerships": "合作基础"
      }
    },
    "chapter4": {
      "title": "第四章：可行性分析与关键挑战",
      "stages": [
        {"stage": "第一阶段", "goal": "目标", "tasks": "关键任务"},
        {"stage": "第二阶段", "goal": "目标", "tasks": "关键任务"}
      ],
      "biggestRisk": "最大风险点",
      "mitigation": "应对措施"
    },
    "chapter5": {
      "title": "第五章：思维盲点与待探索问题",
      "blindSpots": ["盲区1", "盲区2", "盲区3"],
      "keyQuestions": [
        {"question": "问题1", "validation": "验证方法"},
        {"question": "问题2", "validation": "验证方法"}
      ]
    },
    "chapter6": {
      "title": "第六章：结构化行动建议",
      "immediateActions": ["本周行动1", "本周行动2", "本周行动3"],
      "midtermPlan": {
        "userResearch": "用户研究计划",
        "marketResearch": "市场调研",
        "prototyping": "原型开发",
        "partnerships": "合作探索"
      },
      "extendedIdeas": ["延伸创意1", "延伸创意2"]
    }
  }
}

**分析要求：**
- 如果对话中明确提到某些信息，直接使用
- 如果对话中未明确提到，基于上下文合理推断，并在描述中使用"可能"、"建议"等词
- 保持客观中立，既要肯定优势，也要指出风险
- 行动建议要具体可执行，避免空泛的建议

现在，请分析以下对话历史并生成报告：`;

router.post('/generate', async (req, res, next) => {
    try {
        const { messages } = req.body;

        // 参数验证
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({
                code: -1,
                error: '必须提供有效的对话历史'
            });
        }

        // 构建用于报告生成的消息
        const conversationSummary = messages
            .map(msg => `${msg.role === 'user' ? '用户' : 'AI助手'}: ${msg.content}`)
            .join('\n\n');

        const reportMessages = [
            {
                role: 'user',
                content: `${REPORT_GENERATION_PROMPT}\n\n=== 对话历史 ===\n${conversationSummary}`
            }
        ];

        // 调用DeepSeek API生成报告
        const response = await callDeepSeekAPI(reportMessages, null);

        // 解析JSON响应
        let reportData;
        try {
            // 尝试提取JSON（AI可能会在JSON前后添加说明文字）
            const jsonMatch = response.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                reportData = JSON.parse(jsonMatch[0]);
            } else {
                reportData = JSON.parse(response.content);
            }
        } catch (parseError) {
            console.error('JSON解析失败:', response.content);
            return res.status(500).json({
                code: -1,
                error: 'AI返回的报告格式无效',
                rawResponse: response.content
            });
        }

        res.json({
            code: 0,
            data: {
                report: reportData,
                tokens: {
                    prompt: response.usage.prompt_tokens,
                    completion: response.usage.completion_tokens,
                    total: response.usage.total_tokens
                }
            }
        });

    } catch (error) {
        next(error);
    }
});

export default router;
