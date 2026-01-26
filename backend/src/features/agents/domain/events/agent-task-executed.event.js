/**
 * Agent任务执行事件
 */
import { DomainEvent } from '../../../../shared/domain/index.js';

export class AgentTaskExecutedEvent extends DomainEvent {
  constructor(data) {
    super('agent.task.executed', data);
  }
}
