/**
 * Agent能力值对象
 */
import { ValueObject } from '../../../shared/domain/index.js';

export class AgentCapability extends ValueObject {
  /**
   * 常见能力枚举
   */
  static get CONVERSATION() {
    return new AgentCapability({ value: 'conversation' });
  }

  static get QUESTION_ANSWERING() {
    return new AgentCapability({ value: 'question_answering' });
  }

  static get INFORMATION_RETRIEVAL() {
    return new AgentCapability({ value: 'information_retrieval' });
  }

  static get DATA_ANALYSIS() {
    return new AgentCapability({ value: 'data_analysis' });
  }

  static get REPORT_GENERATION() {
    return new AgentCapability({ value: 'report_generation' });
  }

  static get TREND_PREDICTION() {
    return new AgentCapability({ value: 'trend_prediction' });
  }

  static get PROJECT_PLANNING() {
    return new AgentCapability({ value: 'project_planning' });
  }

  static get TASK_SCHEDULING() {
    return new AgentCapability({ value: 'task_scheduling' });
  }

  static get RESOURCE_ALLOCATION() {
    return new AgentCapability({ value: 'resource_allocation' });
  }

  static get CODE_GENERATION() {
    return new AgentCapability({ value: 'code_generation' });
  }

  static get DEBUGGING() {
    return new AgentCapability({ value: 'debugging' });
  }

  static get TECHNICAL_DOCUMENTATION() {
    return new AgentCapability({ value: 'technical_documentation' });
  }

  static get UI_DESIGN() {
    return new AgentCapability({ value: 'ui_design' });
  }

  static get VISUAL_CREATION() {
    return new AgentCapability({ value: 'visual_creation' });
  }

  static get USER_EXPERIENCE() {
    return new AgentCapability({ value: 'user_experience' });
  }

  static get TASK_COORDINATION() {
    return new AgentCapability({ value: 'task_coordination' });
  }

  static get PROGRESS_TRACKING() {
    return new AgentCapability({ value: 'progress_tracking' });
  }

  static get TEAM_COLLABORATION() {
    return new AgentCapability({ value: 'team_collaboration' });
  }

  /**
   * 创建Agent能力
   */
  static create(value) {
    // 如果已经存在对应的能力对象，直接返回
    switch (value) {
    case 'conversation':
      return AgentCapability.CONVERSATION;
    case 'question_answering':
      return AgentCapability.QUESTION_ANSWERING;
    case 'information_retrieval':
      return AgentCapability.INFORMATION_RETRIEVAL;
    case 'data_analysis':
      return AgentCapability.DATA_ANALYSIS;
    case 'report_generation':
      return AgentCapability.REPORT_GENERATION;
    case 'trend_prediction':
      return AgentCapability.TREND_PREDICTION;
    case 'project_planning':
      return AgentCapability.PROJECT_PLANNING;
    case 'task_scheduling':
      return AgentCapability.TASK_SCHEDULING;
    case 'resource_allocation':
      return AgentCapability.RESOURCE_ALLOCATION;
    case 'code_generation':
      return AgentCapability.CODE_GENERATION;
    case 'debugging':
      return AgentCapability.DEBUGGING;
    case 'technical_documentation':
      return AgentCapability.TECHNICAL_DOCUMENTATION;
    case 'ui_design':
      return AgentCapability.UI_DESIGN;
    case 'visual_creation':
      return AgentCapability.VISUAL_CREATION;
    case 'user_experience':
      return AgentCapability.USER_EXPERIENCE;
    case 'task_coordination':
      return AgentCapability.TASK_COORDINATION;
    case 'progress_tracking':
      return AgentCapability.PROGRESS_TRACKING;
    case 'team_collaboration':
      return AgentCapability.TEAM_COLLABORATION;
    default:
      return new AgentCapability({ value: value });
    }
  }

  /**
   * 获取能力值
   */
  get value() {
    return this.props.value;
  }

  /**
   * 验证能力值
   */
  validate() {
    if (!this.props.value || typeof this.props.value !== 'string') {
      throw new Error('能力值不能为空且必须是字符串');
    }

    if (this.props.value.length > 100) {
      throw new Error('能力值不能超过100个字符');
    }

    // 只能包含字母、数字和下划线
    if (!/^[a-zA-Z0-9_]+$/.test(this.props.value)) {
      throw new Error('能力值只能包含字母、数字和下划线');
    }
  }

  /**
   * 获取能力描述
   */
  get description() {
    const descriptions = {
      conversation: '进行自然语言对话',
      question_answering: '回答问题',
      information_retrieval: '检索信息',
      data_analysis: '分析数据',
      report_generation: '生成报告',
      trend_prediction: '预测趋势',
      project_planning: '制定项目计划',
      task_scheduling: '安排任务',
      resource_allocation: '分配资源',
      code_generation: '生成代码',
      debugging: '调试代码',
      technical_documentation: '编写技术文档',
      ui_design: '设计用户界面',
      visual_creation: '创建视觉内容',
      user_experience: '优化用户体验',
      task_coordination: '协调任务',
      progress_tracking: '跟踪进度',
      team_collaboration: '团队协作'
    };
    return descriptions[this.props.value] || '自定义能力';
  }

  /**
   * 检查是否支持特定任务类型
   */
  supportsTask(taskType) {
    const taskCapabilityMap = {
      code_review: ['code_generation', 'debugging'],
      code_generation: ['code_generation'],
      bug_fix: ['debugging'],
      data_analysis: ['data_analysis'],
      report_writing: ['report_generation'],
      planning: ['project_planning'],
      scheduling: ['task_scheduling'],
      ui_design: ['ui_design'],
      visualization: ['visual_creation'],
      team_meeting: ['team_collaboration'],
      progress_report: ['progress_tracking']
    };

    const supportedCapabilities = taskCapabilityMap[taskType] || [];
    return supportedCapabilities.includes(this.props.value);
  }
}
