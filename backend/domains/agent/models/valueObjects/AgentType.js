/**
 * Agent 类型定义（值对象）
 * 包含所有可用的Agent类型及其属性
 */

export const AGENT_TYPES = {
  // 产品类
  'product-manager': {
    id: 'product-manager',
    name: '产品经理',
    emoji: '📱',
    desc: '负责产品规划、需求分析、竞品研究',
    skills: ['需求分析', '产品规划', '竞品分析', '用户研究'],
    salary: 15000,
    level: 'senior',
    category: 'product'
  },
  'designer': {
    id: 'designer',
    name: 'UI/UX设计师',
    emoji: '🎨',
    desc: '负责界面设计、用户体验优化',
    skills: ['界面设计', 'UX设计', '原型制作', '设计规范'],
    salary: 12000,
    level: 'mid',
    category: 'product'
  },

  // 技术类
  'frontend-dev': {
    id: 'frontend-dev',
    name: '前端工程师',
    emoji: '💻',
    desc: '负责前端开发、页面实现',
    skills: ['React', 'Vue', 'HTML/CSS', 'JavaScript'],
    salary: 18000,
    level: 'senior',
    category: 'tech'
  },
  'backend-dev': {
    id: 'backend-dev',
    name: '后端工程师',
    emoji: '⚙️',
    desc: '负责后端开发、API设计、数据库',
    skills: ['Node.js', 'Python', 'SQL', 'API设计'],
    salary: 20000,
    level: 'senior',
    category: 'tech'
  },

  // 运营类
  'marketing': {
    id: 'marketing',
    name: '营销专员',
    emoji: '📈',
    desc: '负责市场营销、用户增长',
    skills: ['内容营销', 'SEO/SEM', '社交媒体', '数据分析'],
    salary: 10000,
    level: 'mid',
    category: 'operations'
  },
  'operations': {
    id: 'operations',
    name: '运营专员',
    emoji: '📊',
    desc: '负责产品运营、用户运营',
    skills: ['用户运营', '活动策划', '数据分析', '内容运营'],
    salary: 9000,
    level: 'mid',
    category: 'operations'
  },

  // 商务类
  'sales': {
    id: 'sales',
    name: '销售经理',
    emoji: '💼',
    desc: '负责销售、商务谈判',
    skills: ['销售技巧', '商务谈判', '客户管理', '合同管理'],
    salary: 12000,
    level: 'mid',
    category: 'business'
  },
  'customer-service': {
    id: 'customer-service',
    name: '客服专员',
    emoji: '👔',
    desc: '负责客户支持、售后服务',
    skills: ['客户沟通', '问题解决', '服务意识', '情绪管理'],
    salary: 6000,
    level: 'junior',
    category: 'business'
  },

  // 财务法务类
  'accountant': {
    id: 'accountant',
    name: '财务专员',
    emoji: '💰',
    desc: '负责财务管理、成本控制',
    skills: ['财务分析', '预算管理', '成本控制', '报表制作'],
    salary: 11000,
    level: 'mid',
    category: 'finance'
  },
  'legal': {
    id: 'legal',
    name: '法务顾问',
    emoji: '⚖️',
    desc: '负责合同审核、法律咨询',
    skills: ['合同审核', '法律咨询', '知识产权', '风险控制'],
    salary: 15000,
    level: 'senior',
    category: 'finance'
  },

  // 战略类
  'consultant': {
    id: 'consultant',
    name: '商业顾问',
    emoji: '🎯',
    desc: '负责战略规划、商业分析',
    skills: ['战略规划', '商业分析', '市场洞察', '决策支持'],
    salary: 25000,
    level: 'expert',
    category: 'strategy'
  },
  'data-analyst': {
    id: 'data-analyst',
    name: '数据分析师',
    emoji: '📉',
    desc: '负责数据分析、商业智能',
    skills: ['数据分析', 'SQL', 'Python', '可视化'],
    salary: 16000,
    level: 'senior',
    category: 'strategy'
  }
};

/**
 * Agent 类型工具类
 */
export class AgentType {
  /**
   * 获取所有Agent类型
   * @returns {Array}
   */
  static getAll() {
    return Object.values(AGENT_TYPES);
  }

  /**
   * 根据ID获取Agent类型
   * @param {string} id - Agent类型ID
   * @returns {Object|null}
   */
  static getById(id) {
    return AGENT_TYPES[id] || null;
  }

  /**
   * 根据分类获取Agent
   * @param {string} category - 分类
   * @returns {Array}
   */
  static getByCategory(category) {
    return this.getAll().filter(agent => agent.category === category);
  }

  /**
   * 根据级别获取Agent
   * @param {string} level - 级别 (junior/mid/senior/expert)
   * @returns {Array}
   */
  static getByLevel(level) {
    return this.getAll().filter(agent => agent.level === level);
  }

  /**
   * 验证Agent类型是否存在
   * @param {string} id - Agent类型ID
   * @returns {boolean}
   */
  static exists(id) {
    return !!AGENT_TYPES[id];
  }

  /**
   * 获取所有分类
   * @returns {Array<string>}
   */
  static getCategories() {
    return ['product', 'tech', 'operations', 'business', 'finance', 'strategy'];
  }

  /**
   * 获取所有级别
   * @returns {Array<string>}
   */
  static getLevels() {
    return ['junior', 'mid', 'senior', 'expert'];
  }

  /**
   * 根据技能搜索Agent
   * @param {string} skill - 技能关键词
   * @returns {Array}
   */
  static searchBySkill(skill) {
    const lowerSkill = skill.toLowerCase();
    return this.getAll().filter(agent =>
      agent.skills.some(s => s.toLowerCase().includes(lowerSkill))
    );
  }

  /**
   * 获取薪资范围内的Agent
   * @param {number} minSalary - 最低薪资
   * @param {number} maxSalary - 最高薪资
   * @returns {Array}
   */
  static getBySalaryRange(minSalary, maxSalary) {
    return this.getAll().filter(agent =>
      agent.salary >= minSalary && agent.salary <= maxSalary
    );
  }

  /**
   * 计算平均薪资
   * @param {string} category - 分类（可选）
   * @returns {number}
   */
  static getAverageSalary(category = null) {
    const agents = category ? this.getByCategory(category) : this.getAll();
    if (agents.length === 0) return 0;

    const totalSalary = agents.reduce((sum, agent) => sum + agent.salary, 0);
    return Math.round(totalSalary / agents.length);
  }
}
