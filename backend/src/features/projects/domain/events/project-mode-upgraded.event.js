/**
 * 项目模式升级领域事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class ProjectModeUpgradedEvent extends DomainEvent {
  constructor(projectId, oldMode, newMode) {
    super({
      aggregateId: projectId,
      eventType: 'project.mode_upgraded',
      data: {
        projectId,
        oldMode,
        newMode,
        upgradedAt: new Date()
      }
    });
  }

  get projectId() {
    return this.data.projectId;
  }

  get oldMode() {
    return this.data.oldMode;
  }

  get newMode() {
    return this.data.newMode;
  }
}
