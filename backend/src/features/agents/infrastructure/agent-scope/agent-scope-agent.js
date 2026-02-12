export class AgentScopeAgent {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.type = config.type;
    this.capabilities = config.capabilities || [];
    this.config = config.config || {};
    this.status = 'idle';
    this.currentTask = null;
    this.lastActiveAt = null;
  }

  setStatus(status) {
    this.status = status;
    this.lastActiveAt = new Date();
  }

  receiveMessage(message, callback) {
    setTimeout(() => {
      const response = {
        id: `resp_${Date.now()}`,
        content: `收到消息: ${message.content}`,
        timestamp: new Date()
      };
      callback(response);
    }, 100);
  }

  async executeTask(task) {
    this.currentTask = task;
    this.setStatus('busy');

    await new Promise(resolve => setTimeout(resolve, 1000));

    const result = {
      success: true,
      output: `任务 ${task.type} 执行完成`,
      metadata: { duration: 1000 }
    };

    this.currentTask = null;
    this.setStatus('idle');

    return result;
  }

  supportsTask(taskType) {
    const basicTasks = ['conversation', 'question_answering', 'information_retrieval'];
    return basicTasks.includes(taskType) || this.capabilities.includes(taskType);
  }

  async decomposeTask(task) {
    return [
      { type: 'subtask_1', content: task.content + ' - 子任务1' },
      { type: 'subtask_2', content: task.content + ' - 子任务2' }
    ];
  }

  async aggregateResults(results) {
    return {
      success: true,
      output: '所有子任务已完成并汇总',
      subResults: results
    };
  }
}
