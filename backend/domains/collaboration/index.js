/**
 * Collaboration领域导出
 * 提供领域服务的统一入口
 */

import { CollaborationPlan, CollaborationStatus } from './models/CollaborationPlan.js';
import { CapabilityAnalysis } from './models/valueObjects/CapabilityAnalysis.js';
import { WorkflowStep, StepStatus } from './models/valueObjects/WorkflowStep.js';
import {
  CAPABILITY_ANALYSIS_PROMPT,
  COLLABORATION_MODE_GENERATION_PROMPT,
  ADJUSTMENT_SUGGESTION_PROMPT,
  PromptBuilder
} from './models/valueObjects/CollaborationPrompts.js';

import { CollaborationPlanningService } from './services/CollaborationPlanningService.js';
import { CollaborationExecutionService } from './services/CollaborationExecutionService.js';

// 导入现有的Agent和Task服务
import { agentHireService } from '../agent/index.js';
import { taskAssignmentService } from '../agent/index.js';

/**
 * 创建领域服务实例
 */

// 协同规划服务（需要AgentHireService）
export const collaborationPlanningService = new CollaborationPlanningService(agentHireService);

// 协同执行服务（需要CollaborationPlanningService和TaskAssignmentService）
export const collaborationExecutionService = new CollaborationExecutionService(
  collaborationPlanningService,
  taskAssignmentService
);

/**
 * 导出模型和值对象
 */
export {
  CollaborationPlan,
  CollaborationStatus,
  CapabilityAnalysis,
  WorkflowStep,
  StepStatus,
  PromptBuilder
};

/**
 * 导出服务类（用于测试或扩展）
 */
export {
  CollaborationPlanningService,
  CollaborationExecutionService
};

/**
 * 默认导出（领域门面）
 */
export default {
  // 服务
  planning: collaborationPlanningService,
  execution: collaborationExecutionService,

  // 模型
  CollaborationPlan,
  CollaborationStatus,
  CapabilityAnalysis,
  WorkflowStep,
  StepStatus,

  // 工具
  PromptBuilder
};
