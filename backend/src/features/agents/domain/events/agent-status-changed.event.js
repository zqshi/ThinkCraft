/**
 * Agent状态变更事件
 */
import { DomainEvent } from '../../../../shared/domain/index.js';

export class AgentStatusChangedEvent extends DomainEvent {
  constructor(data) {
    super('agent.status.changed', data);
  }
}
