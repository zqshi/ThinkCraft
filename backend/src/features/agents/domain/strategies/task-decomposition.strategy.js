/**
 * 任务分解策略
 * 使用DeepSeek API智能分解任务
 */
import { callDeepSeekAPI } from '../../../../infrastructure/ai/deepseek-client.js';
import { TaskPromptTemplates } from '../../infrastructure/prompt-templates/task-prompts.js';
import { Task } from '../task.entity.js';
import { logger } from '../../../../middleware/logger.js';

export class TaskDecompositionStrategy {
  /**
   * 分解任务
   * @param {string} taskContent - 任务内容
   * @param {Array<string>} availableCapabilities - 可用能力列表
   * @returns {Promise<Array<Task>>} 子任务列表
   */
  async decompose(taskContent, availableCapabilities) {
    try {
      logger.info('[TaskDecomposition] 开始分解任务');

      const prompt = TaskPromptTemplates.getDecompositionPrompt(
        taskContent,
        availableCapabilities
      );

      const response = await callDeepSeekAPI(
        [{ role: 'user', content: prompt }],
        '你是一个任务分解专家，擅长将复杂任务拆解为可执行的子任务。',
        {
          temperature: 0.3,
          max_tokens: 1500,
          retry: 3
        }
      );

      // 解析JSON响应
      const subTasks = this._parseSubTasks(response.content);

      logger.info(`[TaskDecomposition] 任务分解完成，生成 ${subTasks.length} 个子任务`);

      return subTasks;
    } catch (error) {
      logger.error('[TaskDecomposition] 任务分解失败:', error);
      throw error;
    }
  }

  /**
   * 解析子任务
   * @param {string} content - API响应内容
   * @returns {Array<Task>} 子任务列表
   */
  _parseSubTasks(content) {
    try {
      // 尝试直接解析JSON
      const parsed = JSON.parse(content);
      return this._validateAndCreateTasks(parsed);
    } catch (error) {
      // 如果直接解析失败，尝试提取JSON
      logger.warn('[TaskDecomposition] 直接解析失败，尝试提取JSON');
      return this._extractAndParseTasks(content);
    }
  }

  /**
   * 从文本中提取并解析任务
   * @param {string} content - 文本内容
   * @returns {Array<Task>} 子任务列表
   */
  _extractAndParseTasks(content) {
    // 尝试提取JSON数组
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return this._validateAndCreateTasks(parsed);
      } catch (error) {
        logger.error('[TaskDecomposition] JSON提取失败:', error);
      }
    }

    // 如果提取失败，返回默认的单个任务
    logger.warn('[TaskDecomposition] 无法解析子任务，返回原始任务');
    return [
      Task.create('general', content, {
        id: 'task_1',
        dependencies: []
      })
    ];
  }

  /**
   * 验证并创建任务
   * @param {Array} parsed - 解析后的数据
   * @returns {Array<Task>} 任务列表
   */
  _validateAndCreateTasks(parsed) {
    if (!Array.isArray(parsed)) {
      throw new Error('解析结果不是数组');
    }

    const tasks = [];
    for (const item of parsed) {
      if (!item.id || !item.type || !item.content) {
        logger.warn('[TaskDecomposition] 跳过无效的子任务:', item);
        continue;
      }

      const task = Task.create(item.type, item.content, {
        id: item.id,
        dependencies: item.dependencies || [],
        requirements: item.requirements || []
      });

      tasks.push(task);
    }

    if (tasks.length === 0) {
      throw new Error('没有有效的子任务');
    }

    return tasks;
  }
}
