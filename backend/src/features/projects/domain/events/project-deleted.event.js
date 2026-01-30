/**
 * 项目删除领域事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class ProjectDeletedEvent extends DomainEvent {
  constructor(projectId, name) {
    super('project.deleted', {
      projectId,
      name,
      deletedAt: new Date()
    });
  }

  get projectId() {
    return this.data.projectId;
  }

  get name() {
    return this.data.name;
  }
}
