/**
 * 项目更新领域事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class ProjectUpdatedEvent extends DomainEvent {
  constructor(projectId, oldData, newData) {
    super('project.updated', {
      projectId,
      oldData,
      newData,
      updatedAt: new Date()
    });
  }

  get projectId() {
    return this.data.projectId;
  }

  get oldData() {
    return this.data.oldData;
  }

  get newData() {
    return this.data.newData;
  }
}
