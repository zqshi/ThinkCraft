/**
 * Agent创建事件
 */
import { DomainEvent } from '../../../../shared/domain/index.js';

export class AgentCreatedEvent extends DomainEvent {
  constructor(data) {
    super('agent.created', data);
  }
}
