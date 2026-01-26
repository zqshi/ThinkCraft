import { Workflow, WorkflowFactory } from '../domain/workflow.aggregate.js';
import { WorkflowStatus } from '../domain/value-objects/workflow-status.vo.js';

/**
 * 工作流用例服务
 */
export class WorkflowUseCase {
  constructor(workflowRepository, workflowApiService, eventBus) {
    this.workflowRepository = workflowRepository;
    this.workflowApiService = workflowApiService;
    this.eventBus = eventBus;
  }

  /**
   * 创建工作流
   */
  async createWorkflow({ name, description, type, projectId, createdBy, useTemplate = false }) {
    try {
      let workflow;

      if (useTemplate) {
        // 使用模板创建
        workflow = WorkflowFactory.createFromTemplate(projectId, type, createdBy);
      } else {
        // 自定义创建
        workflow = WorkflowFactory.createCustom(projectId, name, description, type, createdBy);
      }

      // 保存到仓库
      await this.workflowRepository.save(workflow);

      // 发布领域事件
      this.eventBus.publishAll(workflow.getDomainEvents());

      return {
        success: true,
        data: workflow.toJSON()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取工作流
   */
  async getWorkflow(workflowId) {
    try {
      const workflow = await this.workflowRepository.findById(workflowId);
      if (!workflow) {
        throw new Error('工作流不存在');
      }

      return {
        success: true,
        data: workflow.toJSON()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取项目的工作流列表
   */
  async getProjectWorkflows(projectId, filters = {}) {
    try {
      const result = await this.workflowRepository.findByProjectId(projectId, filters);

      return {
        success: true,
        data: {
          workflows: result.items.map(item => item.toJSON()),
          total: result.total
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 启动工作流
   */
  async startWorkflow(workflowId) {
    try {
      const workflow = await this.workflowRepository.findById(workflowId);
      if (!workflow) {
        throw new Error('工作流不存在');
      }

      workflow.start();

      await this.workflowRepository.save(workflow);

      // 发布事件
      this.eventBus.publishAll(workflow.getDomainEvents());

      return {
        success: true,
        data: workflow.toJSON()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 暂停工作流
   */
  async pauseWorkflow(workflowId) {
    try {
      const workflow = await this.workflowRepository.findById(workflowId);
      if (!workflow) {
        throw new Error('工作流不存在');
      }

      workflow.pause();

      await this.workflowRepository.save(workflow);

      // 发布事件
      this.eventBus.publishAll(workflow.getDomainEvents());

      return {
        success: true,
        data: workflow.toJSON()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 恢复工作流
   */
  async resumeWorkflow(workflowId) {
    try {
      const workflow = await this.workflowRepository.findById(workflowId);
      if (!workflow) {
        throw new Error('工作流不存在');
      }

      workflow.resume();

      await this.workflowRepository.save(workflow);

      // 发布事件
      this.eventBus.publishAll(workflow.getDomainEvents());

      return {
        success: true,
        data: workflow.toJSON()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 完成当前步骤
   */
  async completeCurrentStep(workflowId, comment = '') {
    try {
      const workflow = await this.workflowRepository.findById(workflowId);
      if (!workflow) {
        throw new Error('工作流不存在');
      }

      const nextStep = workflow.nextStep();

      await this.workflowRepository.save(workflow);

      return {
        success: true,
        data: {
          workflow: workflow.toJSON(),
          nextStep: nextStep ? nextStep.toJSON() : null,
          isCompleted: workflow.status.value === 'completed'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 取消工作流
   */
  async cancelWorkflow(workflowId, reason) {
    try {
      const workflow = await this.workflowRepository.findById(workflowId);
      if (!workflow) {
        throw new Error('工作流不存在');
      }

      workflow.cancel(reason);

      await this.workflowRepository.save(workflow);

      // 发布事件
      this.eventBus.publishAll(workflow.getDomainEvents());

      return {
        success: true,
        data: workflow.toJSON()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 添加步骤
   */
  async addWorkflowStep(workflowId, stepData) {
    try {
      const workflow = await this.workflowRepository.findById(workflowId);
      if (!workflow) {
        throw new Error('工作流不存在');
      }

      const step = workflow.addStep(
        stepData.name,
        stepData.type,
        stepData.assignee,
        stepData.orderIndex,
        stepData.metadata
      );

      await this.workflowRepository.save(workflow);

      return {
        success: true,
        data: {
          workflow: workflow.toJSON(),
          step: step.toJSON()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 移除步骤
   */
  async removeWorkflowStep(workflowId, stepId) {
    try {
      const workflow = await this.workflowRepository.findById(workflowId);
      if (!workflow) {
        throw new Error('工作流不存在');
      }

      workflow.removeStep(stepId);

      await this.workflowRepository.save(workflow);

      return {
        success: true,
        data: workflow.toJSON()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取工作流统计
   */
  async getWorkflowStats(projectId) {
    try {
      const stats = await this.workflowRepository.getStats(projectId);

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取可用模板
   */
  async getWorkflowTemplates() {
    try {
      const templates = [
        {
          type: 'project_management',
          name: '项目管理流程',
          description: '标准的项目管理生命周期流程',
          steps: [
            { name: '需求分析', type: 'task', assignee: 'analyst' },
            { name: '项目规划', type: 'task', assignee: 'manager' },
            { name: '开发实施', type: 'task', assignee: 'developer' },
            { name: '测试验收', type: 'review', assignee: 'tester' },
            { name: '项目交付', type: 'approval', assignee: 'manager' }
          ]
        },
        {
          type: 'content_creation',
          name: '内容创作流程',
          description: '内容创作和发布审批流程',
          steps: [
            { name: '内容策划', type: 'task', assignee: 'planner' },
            { name: '内容创作', type: 'task', assignee: 'writer' },
            { name: '内容编辑', type: 'review', assignee: 'editor' },
            { name: '内容发布', type: 'approval', assignee: 'publisher' }
          ]
        },
        {
          type: 'review_approval',
          name: '审批流程',
          description: '通用的审批流程模板',
          steps: [
            { name: '提交申请', type: 'task', assignee: 'applicant' },
            { name: '初审', type: 'review', assignee: 'reviewer' },
            { name: '终审', type: 'approval', assignee: 'approver' }
          ]
        }
      ];

      return {
        success: true,
        data: templates
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
