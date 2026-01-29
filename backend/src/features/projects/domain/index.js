/**
 * Projects领域模块导出
 */
export { Project } from './project.aggregate.js';
export { ProjectRepository } from './project.repository.js';
export { ProjectService } from './project.service.js';

// 值对象
export { ProjectId } from './value-objects/project-id.vo.js';
export { ProjectName } from './value-objects/project-name.vo.js';
export { ProjectMode } from './value-objects/project-mode.vo.js';
export { ProjectStatus } from './value-objects/project-status.vo.js';
export { IdeaId } from './value-objects/idea-id.vo.js';

// 实体
export { Workflow } from './entities/workflow.entity.js';

// 领域事件
export { ProjectCreatedEvent } from './events/project-created.event.js';
export { ProjectUpdatedEvent } from './events/project-updated.event.js';
export { ProjectDeletedEvent } from './events/project-deleted.event.js';
