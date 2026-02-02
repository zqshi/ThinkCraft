/**
 * 工作流DTO映射器
 * 处理领域模型与DTO之间的转换
 */
export class WorkflowMapper {
  /**
   * 将领域模型转换为DTO
   */
  toDTO(workflow) {
    return {
      id: workflow.id.value,
      name: workflow.name,
      description: workflow.description,
      type: workflow.type.value,
      typeDisplay: workflow.type.getDisplayName(),
      status: workflow.status.value,
      statusDisplay: workflow.getStatusDisplayName(),
      projectId: workflow.projectId,
      steps: workflow.steps.map(step => this.toStepDTO(step)),
      currentStepIndex: workflow.currentStepIndex,
      currentStep: workflow.getCurrentStep() ? this.toStepDTO(workflow.getCurrentStep()) : null,
      progress: workflow.getProgress(),
      progressDisplay: `${workflow.getProgress()}%`,
      totalSteps: workflow.steps.length,
      completedSteps: workflow.steps.filter(s => s.isCompleted() || s.isSkipped()).length,
      createdBy: workflow.createdBy,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
      startedAt: workflow.startedAt,
      completedAt: workflow.completedAt,
      metadata: workflow.metadata,
      isDraft: workflow.status.isDraft(),
      isActive: workflow.status.isActive(),
      isPaused: workflow.status.value === 'PAUSED',
      isCompleted: workflow.status.value === 'COMPLETED',
      isCancelled: workflow.status.value === 'CANCELLED'
    };
  }

  /**
   * 将步骤转换为DTO
   */
  toStepDTO(step) {
    return {
      id: step.id,
      name: step.name,
      type: step.type,
      typeDisplay: this.getStepTypeDisplay(step.type),
      assignee: step.assignee,
      orderIndex: step.orderIndex,
      status: step.status,
      statusDisplay: this.getStepStatusDisplay(step.status),
      startedAt: step.startedAt,
      completedAt: step.completedAt,
      comments: step.comments,
      metadata: step.metadata,
      isCompleted: step.isCompleted(),
      isSkipped: step.isSkipped(),
      isPending: step.status === 'pending',
      isInProgress: step.status === 'in-progress'
    };
  }

  /**
   * 将DTO转换为领域模型
   */
  toDomain(dto) {
    // 这个方法通常在从后端获取数据后使用
    // 实际实现会根据后端返回的数据结构进行调整
    return dto;
  }

  /**
   * 创建用例的DTO转换为领域模型参数
   */
  toCreateDomain(createDto) {
    return {
      name: createDto.name,
      description: createDto.description,
      type: createDto.type,
      projectId: createDto.projectId,
      createdBy: createDto.createdBy
    };
  }

  /**
   * 获取步骤类型显示文本
   */
  getStepTypeDisplay(type) {
    const typeMap = {
      task: '任务',
      review: '审核',
      approval: '审批'
    };
    return typeMap[type] || type;
  }

  /**
   * 获取步骤状态显示文本
   */
  getStepStatusDisplay(status) {
    const statusMap = {
      pending: '待处理',
      'in-progress': '进行中',
      completed: '已完成',
      skipped: '已跳过'
    };
    return statusMap[status] || status;
  }

  /**
   * 将列表转换为DTO
   */
  toDTOList(workflows) {
    return workflows.map(workflow => this.toDTO(workflow));
  }

  /**
   * 创建精简DTO（用于列表显示）
   */
  toMinimalDTO(workflow) {
    return {
      id: workflow.id.value,
      name: workflow.name,
      description: workflow.description,
      type: workflow.type.value,
      typeDisplay: workflow.type.getDisplayName(),
      status: workflow.status.value,
      statusDisplay: workflow.getStatusDisplayName(),
      projectId: workflow.projectId,
      progress: workflow.getProgress(),
      progressDisplay: `${workflow.getProgress()}%`,
      totalSteps: workflow.steps.length,
      completedSteps: workflow.steps.filter(s => s.isCompleted() || s.isSkipped()).length,
      currentStepIndex: workflow.currentStepIndex,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
      startedAt: workflow.startedAt,
      completedAt: workflow.completedAt,
      isActive: workflow.status.isActive(),
      isCompleted: workflow.status.value === 'COMPLETED'
    };
  }

  /**
   * 创建进度DTO
   */
  toProgressDTO(workflow) {
    return {
      workflowId: workflow.id.value,
      status: workflow.status.value,
      statusDisplay: workflow.getStatusDisplayName(),
      progress: workflow.getProgress(),
      progressDisplay: `${workflow.getProgress()}%`,
      totalSteps: workflow.steps.length,
      completedSteps: workflow.steps.filter(s => s.isCompleted() || s.isSkipped()).length,
      currentStepIndex: workflow.currentStepIndex,
      currentStep: workflow.getCurrentStep() ? this.toStepDTO(workflow.getCurrentStep()) : null,
      isActive: workflow.status.isActive(),
      isCompleted: workflow.status.value === 'COMPLETED',
      startedAt: workflow.startedAt,
      completedAt: workflow.completedAt
    };
  }

  /**
   * 创建步骤列表DTO
   */
  toStepsDTO(workflow) {
    return {
      workflowId: workflow.id.value,
      steps: workflow.steps.map(step => this.toStepDTO(step)),
      currentStepIndex: workflow.currentStepIndex,
      totalSteps: workflow.steps.length,
      completedSteps: workflow.steps.filter(s => s.isCompleted() || s.isSkipped()).length
    };
  }

  /**
   * 创建时间线DTO
   */
  toTimelineDTO(workflow) {
    const events = [];

    // 创建事件
    events.push({
      type: 'created',
      timestamp: workflow.createdAt,
      description: '工作流已创建'
    });

    // 启动事件
    if (workflow.startedAt) {
      events.push({
        type: 'started',
        timestamp: workflow.startedAt,
        description: '工作流已启动'
      });
    }

    // 步骤事件
    workflow.steps.forEach(step => {
      if (step.startedAt) {
        events.push({
          type: 'step_started',
          timestamp: step.startedAt,
          description: `步骤 "${step.name}" 已开始`,
          stepId: step.id
        });
      }
      if (step.completedAt) {
        events.push({
          type: step.isSkipped() ? 'step_skipped' : 'step_completed',
          timestamp: step.completedAt,
          description: step.isSkipped()
            ? `步骤 "${step.name}" 已跳过`
            : `步骤 "${step.name}" 已完成`,
          stepId: step.id
        });
      }
    });

    // 完成事件
    if (workflow.completedAt) {
      const eventType = workflow.status.value === 'CANCELLED' ? 'cancelled' : 'completed';
      const description =
        workflow.status.value === 'CANCELLED' ? '工作流已取消' : '工作流已完成';

      events.push({
        type: eventType,
        timestamp: workflow.completedAt,
        description
      });
    }

    // 按时间排序
    events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return {
      workflowId: workflow.id.value,
      events
    };
  }
}

export default WorkflowMapper;
