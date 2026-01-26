/**
 * Agent DTO（数据传输对象）
 * 用于应用层和接口层之间的数据传输
 */

/**
 * 创建Agent DTO
 */
export class CreateAgentDTO {
  constructor(data) {
    this.name = data.name;
    this.description = data.description;
    this.type = data.type;
    this.capabilities = data.capabilities || [];
    this.config = data.config || {};
    this.metadata = data.metadata || {};
  }

  validate() {
    if (!this.name || typeof this.name !== 'string') {
      throw new Error('Agent名称不能为空且必须是字符串');
    }

    if (this.name.length > 100) {
      throw new Error('Agent名称不能超过100个字符');
    }

    if (!this.description || typeof this.description !== 'string') {
      throw new Error('Agent描述不能为空且必须是字符串');
    }

    if (!this.type || typeof this.type !== 'string') {
      throw new Error('Agent类型不能为空且必须是字符串');
    }

    const validTypes = [
      'assistant',
      'analyst',
      'planner',
      'developer',
      'designer',
      'manager',
      'custom'
    ];
    if (!validTypes.includes(this.type)) {
      throw new Error(`Agent类型必须是以下值之一: ${validTypes.join(', ')}`);
    }

    if (!Array.isArray(this.capabilities)) {
      throw new Error('能力列表必须是数组');
    }

    for (const capability of this.capabilities) {
      if (typeof capability !== 'string') {
        throw new Error('所有能力必须是字符串');
      }
    }

    if (typeof this.config !== 'object' || Array.isArray(this.config)) {
      throw new Error('配置必须是对象');
    }

    if (typeof this.metadata !== 'object' || Array.isArray(this.metadata)) {
      throw new Error('元数据必须是对象');
    }
  }
}

/**
 * 更新Agent DTO
 */
export class UpdateAgentDTO {
  constructor(data) {
    this.name = data.name || null;
    this.description = data.description || null;
    this.config = data.config || null;
    this.metadata = data.metadata || null;
    this.capabilities = data.capabilities || null;
  }

  validate() {
    if (this.name !== null) {
      if (typeof this.name !== 'string') {
        throw new Error('Agent名称必须是字符串');
      }
      if (this.name.length > 100) {
        throw new Error('Agent名称不能超过100个字符');
      }
    }

    if (this.description !== null) {
      if (typeof this.description !== 'string') {
        throw new Error('Agent描述必须是字符串');
      }
    }

    if (this.config !== null) {
      if (typeof this.config !== 'object' || Array.isArray(this.config)) {
        throw new Error('配置必须是对象');
      }
    }

    if (this.metadata !== null) {
      if (typeof this.metadata !== 'object' || Array.isArray(this.metadata)) {
        throw new Error('元数据必须是对象');
      }
    }

    if (this.capabilities !== null) {
      if (!Array.isArray(this.capabilities)) {
        throw new Error('能力列表必须是数组');
      }

      for (const capability of this.capabilities) {
        if (typeof capability !== 'string') {
          throw new Error('所有能力必须是字符串');
        }
      }
    }
  }
}

/**
 * Agent响应DTO
 */
export class AgentResponseDTO {
  constructor(agent) {
    this.id = agent.id;
    this.name = agent.name;
    this.description = agent.description;
    this.type = agent.type.value;
    this.typeDescription = agent.type.description;
    this.status = agent.status.value;
    this.capabilities = agent.capabilities.map(cap => ({
      value: cap.value,
      description: cap.description
    }));
    this.config = agent.config;
    this.metadata = agent.metadata;
    this.lastActiveAt = agent.lastActiveAt;
    this.isIdle = agent.status.isIdle;
    this.isActive = agent.status.isActive;
    this.isBusy = agent.status.isBusy;
    this.isInactive = agent.status.isInactive;
    this.isError = agent.status.isError;
    this.canExecuteTask = agent.status.canExecuteTask;
    this.createdAt = agent.createdAt;
    this.updatedAt = agent.updatedAt;
  }
}

/**
 * Agent列表响应DTO
 */
export class AgentListResponseDTO {
  constructor(agents, totalCount, page = 1, pageSize = 20) {
    this.agents = agents.map(agent => new AgentResponseDTO(agent));
    this.totalCount = totalCount;
    this.page = page;
    this.pageSize = pageSize;
    this.totalPages = Math.ceil(totalCount / pageSize);
  }
}

/**
 * Agent类型响应DTO
 */
export class AgentTypeResponseDTO {
  constructor(type) {
    this.type = type.value;
    this.description = type.description;
    this.defaultCapabilities = type.defaultCapabilities;
  }
}

/**
 * Agent能力响应DTO
 */
export class AgentCapabilityResponseDTO {
  constructor(capability) {
    this.capability = capability.value;
    this.description = capability.description;
  }
}

/**
 * 任务分配DTO
 */
export class AssignTaskDTO {
  constructor(data) {
    this.agentId = data.agentId;
    this.task = data.task;
  }

  validate() {
    if (!this.agentId || typeof this.agentId !== 'string') {
      throw new Error('Agent ID不能为空且必须是字符串');
    }

    if (!this.task || typeof this.task !== 'object') {
      throw new Error('任务不能为空且必须是对象');
    }

    if (!this.task.id || typeof this.task.id !== 'string') {
      throw new Error('任务ID不能为空且必须是字符串');
    }

    if (!this.task.type || typeof this.task.type !== 'string') {
      throw new Error('任务类型不能为空且必须是字符串');
    }

    if (!this.task.content || typeof this.task.content !== 'string') {
      throw new Error('任务内容不能为空且必须是字符串');
    }
  }
}

/**
 * 协作任务DTO
 */
export class CollaborateTaskDTO {
  constructor(data) {
    this.agentIds = data.agentIds;
    this.task = data.task;
    this.collaborationType = data.collaborationType || 'parallel';
  }

  validate() {
    if (!Array.isArray(this.agentIds) || this.agentIds.length === 0) {
      throw new Error('Agent ID列表必须是包含至少一个元素的有效数组');
    }

    for (const agentId of this.agentIds) {
      if (typeof agentId !== 'string') {
        throw new Error('所有Agent ID必须是字符串');
      }
    }

    if (!this.task || typeof this.task !== 'object') {
      throw new Error('任务不能为空且必须是对象');
    }

    const validCollaborationTypes = ['parallel', 'sequential', 'hierarchical'];
    if (!validCollaborationTypes.includes(this.collaborationType)) {
      throw new Error(`协作类型必须是以下值之一: ${validCollaborationTypes.join(', ')}`);
    }
  }
}

/**
 * 广播消息DTO
 */
export class BroadcastMessageDTO {
  constructor(data) {
    this.message = data.message;
  }

  validate() {
    if (!this.message || typeof this.message !== 'object') {
      throw new Error('消息不能为空且必须是对象');
    }

    if (!this.message.content || typeof this.message.content !== 'string') {
      throw new Error('消息内容不能为空且必须是字符串');
    }
  }
}
