/**
 * 任务Prompt模板
 * 从Markdown文件动态加载任务的Prompt模板
 */
import promptLoader from '../../../../utils/prompt-loader.js';

export class TaskPromptTemplates {
  /**
   * 获取任务Prompt
   * @param {string} taskType - 任务类型
   * @param {string} taskContent - 任务内容
   * @returns {string} 任务Prompt
   */
  static getTaskPrompt(taskType, taskContent) {
    // 首先尝试从Markdown文件加载
    const loadedTemplate = promptLoader.getTaskPrompt(taskType);

    if (loadedTemplate) {
      // 替换占位符
      return loadedTemplate.replace(/\{\{taskContent\}\}/g, taskContent);
    }

    // 如果Markdown文件不存在，使用硬编码的备用模板（向后兼容）
    const templates = {
      code_generation: `请生成代码来实现以下需求：

${taskContent}

要求：
1. 代码清晰易读，包含必要注释
2. 考虑边界情况和错误处理
3. 遵循最佳实践和编码规范
4. 提供使用示例（如果适用）`,

      data_analysis: `请分析以下数据或问题：

${taskContent}

要求：
1. 提供关键指标和统计数据
2. 识别趋势和异常
3. 给出数据驱动的洞察
4. 提供可行的建议`,

      task_planning: `请为以下目标制定执行计划：

${taskContent}

要求：
1. 分解为具体的执行步骤
2. 标注步骤间的依赖关系
3. 估算所需资源和时间
4. 识别潜在风险和应对措施`,

      design_proposal: `请为以下需求提供设计方案：

${taskContent}

要求：
1. 提供清晰的设计思路
2. 考虑用户体验和可用性
3. 说明设计决策的理由
4. 提供视觉化的描述`,

      research: `请研究以下主题：

${taskContent}

要求：
1. 系统化收集相关信息
2. 提供有依据的分析
3. 整理关键发现
4. 给出结论和建议`,

      content_writing: `请撰写以下内容：

${taskContent}

要求：
1. 清晰准确的表达
2. 符合目标受众需求
3. 保持风格一致
4. 注重内容的吸引力`,

      problem_solving: `请解决以下问题：

${taskContent}

要求：
1. 分析问题的根本原因
2. 提供多个可行方案
3. 评估各方案的优劣
4. 推荐最佳解决方案`,

      review: `请审查以下内容：

${taskContent}

要求：
1. 识别问题和改进点
2. 提供具体的修改建议
3. 评估整体质量
4. 给出优化方向`
    };

    return templates[taskType] || taskContent;
  }

  /**
   * 获取任务分解Prompt
   * @param {string} taskContent - 任务内容
   * @param {Array<string>} availableCapabilities - 可用能力列表
   * @returns {string} 任务分解Prompt
   */
  static getDecompositionPrompt(taskContent, availableCapabilities) {
    return `请将以下任务分解为可独立执行的子任务。

【原始任务】
${taskContent}

【可用能力】
${availableCapabilities.join(', ')}

【输出要求】
1. 输出JSON数组格式
2. 每个子任务包含：id, type, content, dependencies
3. dependencies是依赖的子任务id数组（如果没有依赖则为空数组）
4. 子任务数量：2-5个
5. 确保子任务之间逻辑清晰，可以独立执行

【输出示例】
[
  {
    "id": "task_1",
    "type": "research",
    "content": "调研市场需求和竞品分析",
    "dependencies": []
  },
  {
    "id": "task_2",
    "type": "design_proposal",
    "content": "基于调研结果设计产品方案",
    "dependencies": ["task_1"]
  }
]

请直接输出JSON数组，不要包含其他说明文字。`;
  }

  /**
   * 获取结果汇总Prompt
   * @param {string} originalTask - 原始任务
   * @param {Array<Object>} results - 各Agent的执行结果
   * @returns {string} 结果汇总Prompt
   */
  static getAggregationPrompt(originalTask, results) {
    const resultsText = results.map((r, i) => {
      return `【Agent ${i + 1}: ${r.agentName || 'Unknown'} (${r.agentType || 'unknown'})】
${r.output}`;
    }).join('\n\n');

    return `请汇总以下多个Agent的执行结果，生成一个完整、连贯的最终答案。

【原始任务】
${originalTask}

【各Agent结果】
${resultsText}

【汇总要求】
1. 整合所有有价值的信息
2. 消除重复内容
3. 保持逻辑连贯
4. 输出结构化结果
5. 突出关键结论和建议

请提供完整的汇总结果：`;
  }
}
