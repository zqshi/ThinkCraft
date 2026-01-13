# ThinkCraft 重构实施指南 - 阶段2：后端领域拆分

## 目标

解决后端最大的路由文件，建立清晰的领域驱动设计架构：
- `backend/routes/agents.js` (557行) → 拆分为领域模型 + 服务 + 薄控制器
- `backend/routes/business-plan.js` (437行) → 同上
- `backend/routes/demo-generator.js` (405行) → 同上
- `backend/routes/pdf-export.js` (403行) → 同上

## 一、Agent 领域重构

### 1.1 当前架构问题

```javascript
// 当前：backend/routes/agents.js (557行)
// 混合了：数据定义 + 业务逻辑 + API路由

// 第1-100行：Agent类型定义（AGENT_TYPES对象）
const AGENT_TYPES = {
  'product-manager': { id, name, emoji, desc, skills, salary, level },
  // ... 8个Agent定义
};

// 第101-300行：雇佣逻辑、任务分配、薪资计算
router.post('/hire', async (req, res) => {
  // 大量业务逻辑
});

// 第301-500行：更多路由和业务逻辑
router.post('/assign-task', async (req, res) => {
  // ...
});
```

**问题**：
1. 数据定义和业务逻辑混合
2. 难以测试（路由依赖Express）
3. 难以复用（逻辑绑定在路由中）
4. 违反单一职责原则

### 1.2 目标架构

```
backend/domains/agent/
├── models/
│   ├── Agent.js                    # Agent实体 (~100行)
│   ├── AgentTask.js                # 任务实体 (~80行)
│   └── valueObjects/
│       ├── AgentType.js            # Agent类型定义 (~120行)
│       ├── Skill.js                # 技能值对象 (~30行)
│       └── Salary.js               # 薪资值对象 (~40行)
├── services/
│   ├── AgentHireService.js         # 雇佣服务 (~150行)
│   ├── TaskAssignmentService.js    # 任务分配服务 (~120行)
│   └── SalaryService.js            # 薪资计算服务 (~80行)
├── repositories/
│   └── AgentRepository.js          # 数据访问（可选）(~100行)
└── index.js                        # 导出

backend/routes/agents.js            # 薄控制器 (~100行)
```

### 1.3 实施步骤

#### Step 1: 创建目录结构

```bash
mkdir -p backend/domains/agent/models/valueObjects
mkdir -p backend/domains/agent/services
mkdir -p backend/domains/agent/repositories
```

#### Step 2: 提取 AgentType 值对象

**文件**: `backend/domains/agent/models/valueObjects/AgentType.js`

```javascript
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
  }
};

/**
 * Agent 类型工具类
 */
export class AgentType {
  /**
   * 获取所有Agent类型
   */
  static getAll() {
    return Object.values(AGENT_TYPES);
  }

  /**
   * 根据ID获取Agent类型
   */
  static getById(id) {
    return AGENT_TYPES[id] || null;
  }

  /**
   * 根据分类获取Agent
   */
  static getByCategory(category) {
    return this.getAll().filter(agent => agent.category === category);
  }

  /**
   * 根据级别获取Agent
   */
  static getByLevel(level) {
    return this.getAll().filter(agent => agent.level === level);
  }

  /**
   * 验证Agent类型是否存在
   */
  static exists(id) {
    return !!AGENT_TYPES[id];
  }

  /**
   * 获取所有分类
   */
  static getCategories() {
    return ['product', 'tech', 'operations', 'business'];
  }

  /**
   * 获取所有级别
   */
  static getLevels() {
    return ['junior', 'mid', 'senior'];
  }
}
```

#### Step 3: 创建 Agent 实体

**文件**: `backend/domains/agent/models/Agent.js`

```javascript
import { AgentType } from './valueObjects/AgentType.js';

/**
 * Agent 实体
 * 代表一个已雇佣的数字员工实例
 */
export class Agent {
  constructor(data) {
    this.id = data.id || this._generateId();
    this.typeId = data.typeId; // agent类型ID
    this.name = data.name; // 自定义名称（可选）
    this.hiredAt = data.hiredAt || Date.now();
    this.status = data.status || 'available'; // 'available' | 'working' | '休息'
    this.currentTask = data.currentTask || null;
    this.completedTasks = data.completedTasks || [];
    this.performance = data.performance || {
      totalTasks: 0,
      successRate: 100,
      avgQuality: 0
    };
  }

  /**
   * 生成唯一ID
   */
  _generateId() {
    return `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取Agent类型信息
   */
  getType() {
    return AgentType.getById(this.typeId);
  }

  /**
   * 获取显示名称
   */
  getDisplayName() {
    const type = this.getType();
    return this.name || type?.name || 'Unknown Agent';
  }

  /**
   * 是否可用（可以接新任务）
   */
  isAvailable() {
    return this.status === 'available';
  }

  /**
   * 分配任务
   */
  assignTask(task) {
    if (!this.isAvailable()) {
      throw new Error(`Agent ${this.id} is not available`);
    }

    this.currentTask = task;
    this.status = 'working';
  }

  /**
   * 完成任务
   */
  completeTask(taskResult) {
    if (!this.currentTask) {
      throw new Error(`Agent ${this.id} has no current task`);
    }

    // 记录完成的任务
    this.completedTasks.push({
      taskId: this.currentTask.id,
      completedAt: Date.now(),
      result: taskResult
    });

    // 更新性能统计
    this.performance.totalTasks++;

    // 清空当前任务
    this.currentTask = null;
    this.status = 'available';
  }

  /**
   * 计算月薪
   */
  getMonthlySalary() {
    const type = this.getType();
    return type?.salary || 0;
  }

  /**
   * 计算工作时长（小时）
   */
  getWorkingHours() {
    return Math.floor((Date.now() - this.hiredAt) / (1000 * 60 * 60));
  }

  /**
   * 转换为JSON
   */
  toJSON() {
    return {
      id: this.id,
      typeId: this.typeId,
      name: this.name,
      type: this.getType(),
      hiredAt: this.hiredAt,
      status: this.status,
      currentTask: this.currentTask,
      completedTasks: this.completedTasks,
      performance: this.performance
    };
  }

  /**
   * 从JSON创建实例
   */
  static fromJSON(data) {
    return new Agent(data);
  }
}
```

#### Step 4: 创建业务服务

**文件**: `backend/domains/agent/services/AgentHireService.js`

```javascript
import { Agent } from '../models/Agent.js';
import { AgentType } from '../models/valueObjects/AgentType.js';

/**
 * Agent 雇佣服务
 */
export class AgentHireService {
  constructor(repository) {
    this.repository = repository;
  }

  /**
   * 雇佣一个Agent
   */
  async hireAgent(typeId, customName = null) {
    // 验证类型是否存在
    if (!AgentType.exists(typeId)) {
      throw new Error(`Invalid agent type: ${typeId}`);
    }

    // 创建Agent实例
    const agent = new Agent({
      typeId,
      name: customName
    });

    // 保存到存储（如果有repository）
    if (this.repository) {
      await this.repository.save(agent);
    }

    return agent;
  }

  /**
   * 批量雇佣
   */
  async hireMultiple(typeIds) {
    const agents = [];

    for (const typeId of typeIds) {
      const agent = await this.hireAgent(typeId);
      agents.push(agent);
    }

    return agents;
  }

  /**
   * 解雇Agent
   */
  async fireAgent(agentId) {
    if (this.repository) {
      await this.repository.delete(agentId);
    }

    return { success: true, agentId };
  }

  /**
   * 获取雇佣建议（根据任务类型推荐Agent）
   */
  getHiringRecommendations(taskType) {
    const recommendations = {
      'business-plan': ['product-manager', 'marketing', 'sales'],
      'demo-web': ['frontend-dev', 'backend-dev', 'designer'],
      'demo-app': ['frontend-dev', 'backend-dev', 'designer'],
      'marketing-campaign': ['marketing', 'designer', 'operations']
    };

    const agentTypes = recommendations[taskType] || [];
    return agentTypes.map(typeId => AgentType.getById(typeId));
  }

  /**
   * 计算雇佣成本
   */
  calculateHiringCost(typeIds, months = 1) {
    let totalCost = 0;

    typeIds.forEach(typeId => {
      const type = AgentType.getById(typeId);
      if (type) {
        totalCost += type.salary * months;
      }
    });

    return {
      totalCost,
      months,
      monthlyCost: totalCost / months,
      breakdown: typeIds.map(typeId => {
        const type = AgentType.getById(typeId);
        return {
          typeId,
          name: type?.name,
          salary: type?.salary,
          cost: type?.salary * months
        };
      })
    };
  }
}
```

**文件**: `backend/domains/agent/services/TaskAssignmentService.js`

```javascript
/**
 * 任务分配服务
 * 根据Agent能力和任务需求进行智能匹配
 */
export class TaskAssignmentService {
  constructor(agentRepository) {
    this.agentRepository = agentRepository;
  }

  /**
   * 为任务分配最合适的Agent
   */
  async assignTaskToAgent(task) {
    // 获取所有可用的Agent
    const availableAgents = await this.getAvailableAgents();

    if (availableAgents.length === 0) {
      throw new Error('No available agents');
    }

    // 找到最匹配的Agent
    const bestAgent = this.findBestMatch(task, availableAgents);

    // 分配任务
    bestAgent.assignTask(task);

    // 更新存储
    if (this.agentRepository) {
      await this.agentRepository.save(bestAgent);
    }

    return bestAgent;
  }

  /**
   * 批量任务分配
   */
  async assignMultipleTasks(tasks) {
    const assignments = [];

    for (const task of tasks) {
      try {
        const agent = await this.assignTaskToAgent(task);
        assignments.push({
          task,
          agent,
          status: 'assigned'
        });
      } catch (error) {
        assignments.push({
          task,
          agent: null,
          status: 'failed',
          error: error.message
        });
      }
    }

    return assignments;
  }

  /**
   * 找到最匹配的Agent（简单实现：基于技能匹配）
   */
  findBestMatch(task, agents) {
    let bestAgent = null;
    let bestScore = -1;

    agents.forEach(agent => {
      const score = this.calculateMatchScore(task, agent);
      if (score > bestScore) {
        bestScore = score;
        bestAgent = agent;
      }
    });

    return bestAgent;
  }

  /**
   * 计算匹配分数
   */
  calculateMatchScore(task, agent) {
    const agentType = agent.getType();
    if (!agentType) return 0;

    let score = 0;

    // 基于任务类型匹配
    if (task.requiredAgentType === agent.typeId) {
      score += 50;
    }

    // 基于技能匹配
    if (task.requiredSkills && agentType.skills) {
      const matchedSkills = task.requiredSkills.filter(skill =>
        agentType.skills.includes(skill)
      );
      score += matchedSkills.length * 10;
    }

    // 基于历史表现
    score += agent.performance.successRate * 0.3;

    return score;
  }

  /**
   * 获取所有可用的Agent
   */
  async getAvailableAgents() {
    if (!this.agentRepository) {
      return [];
    }

    const allAgents = await this.agentRepository.findAll();
    return allAgents.filter(agent => agent.isAvailable());
  }

  /**
   * 获取Agent工作负载统计
   */
  async getWorkloadStats() {
    if (!this.agentRepository) {
      return {};
    }

    const allAgents = await this.agentRepository.findAll();

    return {
      total: allAgents.length,
      available: allAgents.filter(a => a.status === 'available').length,
      working: allAgents.filter(a => a.status === 'working').length,
      utilizationRate: allAgents.length > 0
        ? (allAgents.filter(a => a.status === 'working').length / allAgents.length) * 100
        : 0
    };
  }
}
```

#### Step 5: 重构路由为薄控制器

**文件**: `backend/routes/agents.js` (重构后 ~100行)

```javascript
import express from 'express';
import { AgentType } from '../domains/agent/models/valueObjects/AgentType.js';
import { AgentHireService } from '../domains/agent/services/AgentHireService.js';
import { TaskAssignmentService } from '../domains/agent/services/TaskAssignmentService.js';
import { SalaryService } from '../domains/agent/services/SalaryService.js';

const router = express.Router();

// 初始化服务（实际项目中应使用依赖注入）
const hireService = new AgentHireService();
const taskService = new TaskAssignmentService();
const salaryService = new SalaryService();

/**
 * 获取所有Agent类型
 */
router.get('/types', (req, res) => {
  try {
    const types = AgentType.getAll();
    res.json({
      success: true,
      data: types
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 根据分类获取Agent类型
 */
router.get('/types/category/:category', (req, res) => {
  try {
    const { category } = req.params;
    const types = AgentType.getByCategory(category);

    res.json({
      success: true,
      data: types
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 雇佣Agent
 */
router.post('/hire', async (req, res) => {
  try {
    const { typeId, customName } = req.body;

    if (!typeId) {
      return res.status(400).json({
        success: false,
        error: 'typeId is required'
      });
    }

    const agent = await hireService.hireAgent(typeId, customName);

    res.json({
      success: true,
      data: agent.toJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 批量雇佣
 */
router.post('/hire-batch', async (req, res) => {
  try {
    const { typeIds } = req.body;

    if (!Array.isArray(typeIds) || typeIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'typeIds must be a non-empty array'
      });
    }

    const agents = await hireService.hireMultiple(typeIds);

    res.json({
      success: true,
      data: agents.map(a => a.toJSON())
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取雇佣建议
 */
router.get('/recommendations/:taskType', (req, res) => {
  try {
    const { taskType } = req.params;
    const recommendations = hireService.getHiringRecommendations(taskType);

    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 计算雇佣成本
 */
router.post('/cost-calculation', (req, res) => {
  try {
    const { typeIds, months = 1 } = req.body;

    if (!Array.isArray(typeIds)) {
      return res.status(400).json({
        success: false,
        error: 'typeIds must be an array'
      });
    }

    const cost = hireService.calculateHiringCost(typeIds, months);

    res.json({
      success: true,
      data: cost
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 分配任务
 */
router.post('/assign-task', async (req, res) => {
  try {
    const { task } = req.body;

    if (!task) {
      return res.status(400).json({
        success: false,
        error: 'task is required'
      });
    }

    const agent = await taskService.assignTaskToAgent(task);

    res.json({
      success: true,
      data: agent.toJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取工作负载统计
 */
router.get('/workload', async (req, res) => {
  try {
    const stats = await taskService.getWorkloadStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
```

---

## 二、Generation 领域重构

### 2.1 目标架构

```
backend/domains/generation/
├── models/
│   ├── BusinessPlan.js             # 商业计划书实体 (~100行)
│   ├── Chapter.js                  # 章节实体 (~60行)
│   └── valueObjects/
│       └── GenerationType.js       # 生成类型 (~40行)
├── services/
│   ├── BusinessPlanService.js      # 商业计划书服务 (~200行)
│   ├── TemplateService.js          # 模板管理服务 (~100行)
│   └── AIOrchestrationService.js   # AI调用编排 (~150行)
└── index.js

backend/routes/business-plan.js     # 薄控制器 (~100行)
```

### 2.2 实施步骤

#### Step 1: 创建 BusinessPlan 实体

**文件**: `backend/domains/generation/models/BusinessPlan.js`

```javascript
/**
 * 商业计划书实体
 */
export class BusinessPlan {
  constructor(data) {
    this.id = data.id || this._generateId();
    this.title = data.title;
    this.createdAt = data.createdAt || Date.now();
    this.updatedAt = data.updatedAt || Date.now();
    this.chapters = data.chapters || []; // Chapter[]
    this.metadata = data.metadata || {
      industry: null,
      targetMarket: null,
      fundingGoal: null
    };
    this.status = data.status || 'draft'; // 'draft' | 'generating' | 'completed'
    this.progress = data.progress || {
      total: 0,
      completed: 0,
      percentage: 0
    };
  }

  _generateId() {
    return `bp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 添加章节
   */
  addChapter(chapter) {
    this.chapters.push(chapter);
    this.updatedAt = Date.now();
  }

  /**
   * 更新章节
   */
  updateChapter(chapterId, content) {
    const chapter = this.chapters.find(c => c.id === chapterId);
    if (chapter) {
      chapter.content = content;
      chapter.generatedAt = Date.now();
      this.updatedAt = Date.now();
    }
  }

  /**
   * 更新进度
   */
  updateProgress() {
    const completedChapters = this.chapters.filter(c => c.status === 'completed');
    this.progress = {
      total: this.chapters.length,
      completed: completedChapters.length,
      percentage: this.chapters.length > 0
        ? Math.round((completedChapters.length / this.chapters.length) * 100)
        : 0
    };
  }

  /**
   * 是否完成
   */
  isCompleted() {
    return this.progress.percentage === 100;
  }

  /**
   * 转换为JSON
   */
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      chapters: this.chapters.map(c => c.toJSON ? c.toJSON() : c),
      metadata: this.metadata,
      status: this.status,
      progress: this.progress
    };
  }
}
```

#### Step 2: 创建 BusinessPlanService

**文件**: `backend/domains/generation/services/BusinessPlanService.js`

```javascript
import { BusinessPlan } from '../models/BusinessPlan.js';
import { TemplateService } from './TemplateService.js';
import { AIOrchestrationService } from './AIOrchestrationService.js';

/**
 * 商业计划书生成服务
 */
export class BusinessPlanService {
  constructor() {
    this.templateService = new TemplateService();
    this.aiService = new AIOrchestrationService();
  }

  /**
   * 创建商业计划书
   */
  async createBusinessPlan(userData, selectedChapters) {
    // 创建实体
    const plan = new BusinessPlan({
      title: `${userData.projectName || '项目'} 商业计划书`,
      metadata: {
        industry: userData.industry,
        targetMarket: userData.targetMarket,
        fundingGoal: userData.fundingGoal
      }
    });

    // 初始化章节
    selectedChapters.forEach(chapterId => {
      const template = this.templateService.getChapterTemplate(chapterId);
      plan.addChapter({
        id: chapterId,
        title: template.title,
        status: 'pending',
        content: null
      });
    });

    plan.updateProgress();
    return plan;
  }

  /**
   * 生成单个章节
   */
  async generateChapter(plan, chapterId, userData) {
    const chapter = plan.chapters.find(c => c.id === chapterId);
    if (!chapter) {
      throw new Error(`Chapter ${chapterId} not found`);
    }

    // 获取章节模板
    const template = this.templateService.getChapterTemplate(chapterId);

    // 使用AI生成内容
    const content = await this.aiService.generateChapterContent(
      template,
      userData,
      plan
    );

    // 更新章节
    chapter.content = content;
    chapter.status = 'completed';
    chapter.generatedAt = Date.now();

    // 更新进度
    plan.updateProgress();

    return chapter;
  }

  /**
   * 生成完整商业计划书
   */
  async generateComplete(userData, selectedChapters, onProgress) {
    // 创建计划书
    const plan = await this.createBusinessPlan(userData, selectedChapters);
    plan.status = 'generating';

    // 逐章生成
    for (let i = 0; i < plan.chapters.length; i++) {
      const chapter = plan.chapters[i];

      try {
        await this.generateChapter(plan, chapter.id, userData);

        // 进度回调
        if (onProgress) {
          onProgress({
            current: i + 1,
            total: plan.chapters.length,
            chapter: chapter.title
          });
        }
      } catch (error) {
        chapter.status = 'error';
        chapter.error = error.message;
      }
    }

    plan.status = 'completed';
    return plan;
  }

  /**
   * 导出为Markdown
   */
  exportToMarkdown(plan) {
    let markdown = `# ${plan.title}\n\n`;
    markdown += `生成时间：${new Date(plan.createdAt).toLocaleString()}\n\n`;
    markdown += `---\n\n`;

    plan.chapters.forEach(chapter => {
      if (chapter.content) {
        markdown += `## ${chapter.title}\n\n`;
        markdown += `${chapter.content}\n\n`;
      }
    });

    return markdown;
  }
}
```

#### Step 3: 重构路由

**文件**: `backend/routes/business-plan.js` (重构后 ~100行)

```javascript
import express from 'express';
import { BusinessPlanService } from '../domains/generation/services/BusinessPlanService.js';

const router = express.Router();
const service = new BusinessPlanService();

/**
 * 获取可用章节模板
 */
router.get('/templates', (req, res) => {
  try {
    const templates = service.templateService.getAllTemplates();

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 生成商业计划书
 */
router.post('/generate', async (req, res) => {
  try {
    const { userData, selectedChapters } = req.body;

    if (!userData || !selectedChapters) {
      return res.status(400).json({
        success: false,
        error: 'userData and selectedChapters are required'
      });
    }

    // 设置SSE响应头（流式返回进度）
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 生成计划书，并实时返回进度
    const plan = await service.generateComplete(
      userData,
      selectedChapters,
      (progress) => {
        res.write(`data: ${JSON.stringify(progress)}\n\n`);
      }
    );

    // 发送最终结果
    res.write(`data: ${JSON.stringify({ type: 'complete', plan: plan.toJSON() })}\n\n`);
    res.end();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 生成单个章节
 */
router.post('/generate-chapter', async (req, res) => {
  try {
    const { planId, chapterId, userData } = req.body;

    // 这里需要从存储中获取plan，简化示例省略
    const plan = { /* ... */ };

    const chapter = await service.generateChapter(plan, chapterId, userData);

    res.json({
      success: true,
      data: chapter
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 导出为Markdown
 */
router.get('/export/:planId', async (req, res) => {
  try {
    const { planId } = req.params;

    // 从存储获取plan
    const plan = { /* ... */ };

    const markdown = service.exportToMarkdown(plan);

    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="business-plan-${planId}.md"`);
    res.send(markdown);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
```

---

## 三、Demo 领域和 Export 领域

类似的拆分方式，创建对应的领域模型、服务和薄控制器。

---

## 四、代码质量提升

### 4.1 输入验证中间件

**文件**: `backend/middleware/validation.js`

```javascript
/**
 * 请求参数验证中间件
 */
export function validateRequest(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map(d => d.message)
      });
    }

    next();
  };
}

/**
 * 验证必填字段
 */
export function requireFields(...fields) {
  return (req, res, next) => {
    const missing = fields.filter(field => !req.body[field]);

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missing.join(', ')}`
      });
    }

    next();
  };
}
```

### 4.2 使用验证中间件

```javascript
import { requireFields } from '../middleware/validation.js';

router.post('/hire',
  requireFields('typeId'),
  async (req, res) => {
    // 业务逻辑
  }
);
```

---

## 五、测试示例

**文件**: `backend/domains/agent/__tests__/AgentHireService.test.js`

```javascript
import { AgentHireService } from '../services/AgentHireService.js';
import { Agent } from '../models/Agent.js';

describe('AgentHireService', () => {
  let service;

  beforeEach(() => {
    service = new AgentHireService();
  });

  test('should hire an agent successfully', async () => {
    const agent = await service.hireAgent('product-manager');

    expect(agent).toBeInstanceOf(Agent);
    expect(agent.typeId).toBe('product-manager');
    expect(agent.status).toBe('available');
  });

  test('should throw error for invalid agent type', async () => {
    await expect(service.hireAgent('invalid-type'))
      .rejects
      .toThrow('Invalid agent type');
  });

  test('should calculate hiring cost correctly', () => {
    const cost = service.calculateHiringCost(['product-manager', 'designer'], 3);

    expect(cost.months).toBe(3);
    expect(cost.totalCost).toBe((15000 + 12000) * 3);
  });

  test('should provide hiring recommendations', () => {
    const recommendations = service.getHiringRecommendations('business-plan');

    expect(recommendations).toHaveLength(3);
    expect(recommendations.map(r => r.id)).toContain('product-manager');
  });
});
```

---

## 六、执行清单

### Week 1: Agent 领域拆分

- [ ] Day 1: 创建 AgentType 值对象
- [ ] Day 2: 创建 Agent 实体和 AgentTask 实体
- [ ] Day 3: 创建 AgentHireService
- [ ] Day 4: 创建 TaskAssignmentService
- [ ] Day 5: 重构路由，测试验证

### Week 2: Generation 领域拆分

- [ ] Day 1-2: 创建领域模型（BusinessPlan, Chapter）
- [ ] Day 3-4: 创建服务（BusinessPlanService, TemplateService, AIOrchestrationService）
- [ ] Day 5: 重构 business-plan.js 路由，测试验证

### Week 3: Demo 和 Export 领域

- [ ] Day 1-2: 拆分 demo-generator.js
- [ ] Day 3-4: 拆分 pdf-export.js
- [ ] Day 5: 整体测试，文档更新

---

## 七、预期效果

| 指标 | 重构前 | 重构后 | 改进 |
|------|--------|--------|------|
| agents.js 行数 | 557 | ~100 | ↓ 82% |
| business-plan.js 行数 | 437 | ~100 | ↓ 77% |
| demo-generator.js 行数 | 405 | ~100 | ↓ 75% |
| 可测试性 | 低 | 高 | 业务逻辑可独立测试 |
| 代码复用性 | 低 | 高 | 服务可在多处复用 |
| 可维护性 | 中 | 高 | 职责清晰，易于修改 |

---

**文档版本**: v1.0
**创建日期**: 2026-01-13
**预计工作量**: 3周
**状态**: 待执行
