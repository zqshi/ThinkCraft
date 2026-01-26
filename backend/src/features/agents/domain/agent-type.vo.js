/**
 * Agent类型值对象
 */
import { ValueObject } from '../../../shared/domain/index.js';

export class AgentType extends ValueObject {
  /**
   * Agent类型枚举
   */
  static get ASSISTANT() {
    return new AgentType({ value: 'assistant' });
  }

  static get ANALYST() {
    return new AgentType({ value: 'analyst' });
  }

  static get PLANNER() {
    return new AgentType({ value: 'planner' });
  }

  static get DEVELOPER() {
    return new AgentType({ value: 'developer' });
  }

  static get DESIGNER() {
    return new AgentType({ value: 'designer' });
  }

  static get MANAGER() {
    return new AgentType({ value: 'manager' });
  }

  static get CUSTOM() {
    return new AgentType({ value: 'custom' });
  }

  /**
   * 创建Agent类型
   */
  static create(value) {
    switch (value) {
    case 'assistant':
      return AgentType.ASSISTANT;
    case 'analyst':
      return AgentType.ANALYST;
    case 'planner':
      return AgentType.PLANNER;
    case 'developer':
      return AgentType.DEVELOPER;
    case 'designer':
      return AgentType.DESIGNER;
    case 'manager':
      return AgentType.MANAGER;
    case 'custom':
      return AgentType.CUSTOM;
    default:
      throw new Error(`无效的Agent类型: ${value}`);
    }
  }

  /**
   * 获取类型值
   */
  get value() {
    return this.props.value;
  }

  /**
   * 验证类型值
   */
  validate() {
    const validValues = [
      'assistant',
      'analyst',
      'planner',
      'developer',
      'designer',
      'manager',
      'custom'
    ];
    if (!validValues.includes(this.props.value)) {
      throw new Error(`Agent类型必须是以下值之一: ${validValues.join(', ')}`);
    }
  }

  /**
   * 获取类型描述
   */
  get description() {
    const descriptions = {
      assistant: '智能助手，提供对话和问答服务',
      analyst: '数据分析师，处理数据和生成报告',
      planner: '规划师，制定计划和策略',
      developer: '开发者，编写代码和解决问题',
      designer: '设计师，创建视觉和交互设计',
      manager: '管理者，协调任务和项目管理',
      custom: '自定义Agent，根据需求定制功能'
    };
    return descriptions[this.props.value];
  }

  /**
   * 获取默认能力
   */
  get defaultCapabilities() {
    const capabilities = {
      assistant: ['conversation', 'question_answering', 'information_retrieval'],
      analyst: ['data_analysis', 'report_generation', 'trend_prediction'],
      planner: ['project_planning', 'task_scheduling', 'resource_allocation'],
      developer: ['code_generation', 'debugging', 'technical_documentation'],
      designer: ['ui_design', 'visual_creation', 'user_experience'],
      manager: ['task_coordination', 'progress_tracking', 'team_collaboration'],
      custom: []
    };
    return capabilities[this.props.value] || [];
  }

  /**
   * 检查是否为助手类型
   */
  get isAssistant() {
    return this.props.value === 'assistant';
  }

  /**
   * 检查是否为分析师类型
   */
  get isAnalyst() {
    return this.props.value === 'analyst';
  }

  /**
   * 检查是否为规划师类型
   */
  get isPlanner() {
    return this.props.value === 'planner';
  }

  /**
   * 检查是否为开发者类型
   */
  get isDeveloper() {
    return this.props.value === 'developer';
  }

  /**
   * 检查是否为设计师类型
   */
  get isDesigner() {
    return this.props.value === 'designer';
  }

  /**
   * 检查是否为管理者类型
   */
  get isManager() {
    return this.props.value === 'manager';
  }

  /**
   * 检查是否为自定义类型
   */
  get isCustom() {
    return this.props.value === 'custom';
  }
}
