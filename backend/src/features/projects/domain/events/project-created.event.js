/**
 * 项目创建领域事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class ProjectCreatedEvent extends DomainEvent {
  constructor(projectId, ideaId, name, mode) {
    super('project.created', {
      projectId,
      ideaId,
      name,
      mode,
      createdAt: new Date()
    });
  }

  get projectId() {
    return this.data.projectId;
  }

  get ideaId() {
    return this.data.ideaId;
  }

  get name() {
    return this.data.name;
  }

  get mode() {
    return this.data.mode;
  }
}
