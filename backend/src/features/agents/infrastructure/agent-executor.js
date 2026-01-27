/**
 * Agent执行器
 * 封装Agent的执行逻辑，管理与DeepSeek API的交互
 */
import { callDeepSeekAPI } from '../../../infrastructure/ai/deepseek-client.js';
import { logger } from '../../../../middleware/logger.js';

export class AgentExecutor {
  constructor(agent, contextManager) {
    this.agent = agent;
    this.contextManager = contextManager;
    this.systemPrompt = this._buildSystemPrompt(agent);
  }

  /**
   * 构建Agent的System Prompt
   * @param {Object} agent - Agent聚合根
   * @returns {string} System Prompt
   */
  _buildSystemPrompt(agent) {
    const capabilities = agent.capabilities.map(c => `- ${c.description}`).join('\n');

    const typeDescriptions = {
      analyst: '数据分析师，擅长数据分析、趋势识别和洞察提取',
      developer: '软件开发工程师，擅长代码编写、架构设计和技术实现',
      planner: '战略规划专家，擅长任务规划、流程设计和资源协调',
      designer: '创意设计师，擅长UI/UX设计、视觉呈现和用户体验',
      manager: '项目管理专家，擅长项目协调、进度管理和团队协作',
      researcher: '研究员，擅长信息收集、文献调研和知识整理',
      writer: '内容创作者，擅长文案撰写、内容策划和表达优化'
    };

    const typeDesc = typeDescriptions[agent.type.value] || agent.type.description;

    return `你是${agent.name}，一个${typeDesc}。

你的能力：
${capabilities}

你的职责：
- 专注于你的专业领域，发挥你的核心能力
- 提供结构化、清晰、可执行的输出
- 如果任务超出你的能力范围，明确说明并建议合适的处理方式
- 与其他Agent协作时，清晰表达你的观点和建议

工作原则：
1. 专业性：基于你的专业知识提供高质量的输出
2. 清晰性：使用结构化的方式组织信息
3. 实用性：提供可操作的建议和方案
4. 协作性：尊重其他Agent的专业意见`;
  }

  /**
   * 执行任务
   * @param {Object} task - 任务对象
   * @returns {Promise<Object>} 执行结果
   */
  async executeTask(task) {
    try {
      logger.info(`[AgentExecutor] Agent ${this.agent.name} 开始执行任务: ${task.type}`);

      // 构建任务Prompt
      const taskPrompt = this._formatTaskPrompt(task);

      // 获取上下文
      const context = this.contextManager.getContext(this.agent.id.value);

      // 构建消息数组
      const messages = [
        ...context,
        { role: 'user', content: taskPrompt }
      ];

      // 调用DeepSeek API
      const response = await callDeepSeekAPI(
        messages,
        this.systemPrompt,
        {
          temperature: 0.7,
          max_tokens: 2000,
          retry: 3
        }
      );

      // 更新上下文
      this.contextManager.addMessage(this.agent.id.value, 'user', taskPrompt);
      this.contextManager.addMessage(this.agent.id.value, 'assistant', response.content);

      logger.info(`[AgentExecutor] Agent ${this.agent.name} 任务执行完成`);

      return {
        success: true,
        output: response.content,
        usage: response.usage,
        agentId: this.agent.id.value,
        agentName: this.agent.name,
        agentType: this.agent.type.value
      };
    } catch (error) {
      logger.error(`[AgentExecutor] Agent ${this.agent.name} 任务执行失败:`, error);
      throw error;
    }
  }

  /**
   * 格式化任务Prompt
   * @param {Object} task - 任务对象
   * @returns {string} 格式化后的Prompt
   */
  _formatTaskPrompt(task) {
    let prompt = `【任务类型】${task.type}\n\n`;
    prompt += `【任务内容】\n${task.content}\n\n`;

    if (task.context) {
      prompt += `【上下文信息】\n${task.context}\n\n`;
    }

    if (task.previousResults && task.previousResults.length > 0) {
      prompt += `【前序结果】\n`;
      task.previousResults.forEach((result, index) => {
        prompt += `${index + 1}. ${result.agentName || 'Agent'}: ${result.output}\n\n`;
      });
    }

    if (task.requirements && task.requirements.length > 0) {
      prompt += `【要求】\n`;
      task.requirements.forEach((req, index) => {
        prompt += `${index + 1}. ${req}\n`;
      });
      prompt += '\n';
    }

    prompt += `请根据你的专业能力完成这个任务。`;

    return prompt;
  }

  /**
   * 重置Agent的上下文
   */
  reset() {
    this.contextManager.clearContext(this.agent.id.value);
    logger.info(`[AgentExecutor] Agent ${this.agent.name} 上下文已重置`);
  }

  /**
   * 获取Agent信息
   * @returns {Object} Agent信息
   */
  getInfo() {
    return {
      id: this.agent.id.value,
      name: this.agent.name,
      type: this.agent.type.value,
      capabilities: this.agent.capabilities.map(c => c.value),
      contextLength: this.contextManager.getContextLength(this.agent.id.value)
    };
  }
}
