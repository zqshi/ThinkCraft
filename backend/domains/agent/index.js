/**
 * Agent领域模块统一导出
 * 遵循DDD设计模式，提供清晰的领域接口
 */

// 值对象
export { AgentType, AGENT_TYPES } from './models/valueObjects/AgentType.js';

// 实体
export { Agent, AgentStatus } from './models/Agent.js';

// Repository（持久化）
export { AgentRepository, agentRepository } from './repositories/AgentRepository.js';
export { AgentPostgresRepository, agentPostgresRepository } from './repositories/AgentPostgresRepository.js';

// 领域服务
export { AgentHireService } from './services/AgentHireService.js';
export { TaskAssignmentService, AGENT_TASK_PROMPTS } from './services/TaskAssignmentService.js';
export { SalaryService } from './services/SalaryService.js';

// 创建服务实例（单例模式，便于在路由中使用）
import { AgentHireService } from './services/AgentHireService.js';
import { TaskAssignmentService } from './services/TaskAssignmentService.js';
import { SalaryService } from './services/SalaryService.js';
import { agentRepository } from './repositories/AgentRepository.js';
import { agentPostgresRepository } from './repositories/AgentPostgresRepository.js';

// 选择使用的Repository（可通过环境变量控制）
const USE_POSTGRES = process.env.USE_POSTGRES_AGENT === 'true' || true; // 默认使用PostgreSQL
const selectedRepository = USE_POSTGRES ? agentPostgresRepository : agentRepository;

// 实例化服务（注入Repository依赖）
export const agentHireService = new AgentHireService(selectedRepository);
export const taskAssignmentService = new TaskAssignmentService(agentHireService);
export const salaryService = new SalaryService(agentHireService);

/**
 * Agent领域门面（Facade）
 * 提供统一的领域操作接口
 */
export const AgentDomain = {
  // 雇佣服务
  hire: agentHireService,

  // 任务服务
  task: taskAssignmentService,

  // 薪资服务
  salary: salaryService,

  // Repository
  repository: selectedRepository,

  /**
   * 获取所有服务实例
   */
  getServices() {
    return {
      hireService: agentHireService,
      taskService: taskAssignmentService,
      salaryService: salaryService,
      repository: selectedRepository
    };
  }
};

export default AgentDomain;
