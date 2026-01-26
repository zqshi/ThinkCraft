/**
 * 商业计划书模块入口
 * 导出模块的核心组件
 */

// 领域层
export { BusinessPlan } from './domain/business-plan.aggregate.js';
export { BusinessPlanStatus } from './domain/value-objects/business-plan-status.vo.js';
export { BusinessPlanId } from './domain/value-objects/business-plan-id.vo.js';
export { ChapterId } from './domain/value-objects/chapter-id.vo.js';
export { IBusinessPlanRepository } from './domain/business-plan.repository.js';

// 应用层
export {
  BusinessPlanApplicationService,
  BusinessPlanUseCase
} from './application/business-plan.use-case.js';
export * from './application/business-plan.dto.js';

// 基础设施层
export { BusinessPlanInMemoryRepository } from './infrastructure/business-plan-inmemory.repository.js';
export { default as BusinessPlanController } from './infrastructure/business-plan.controller.js';

// 领域事件
export { BusinessPlanCreatedEvent } from './domain/events/business-plan-created.event.js';
export { ChapterGeneratedEvent } from './domain/events/chapter-generated.event.js';
export { BusinessPlanCompletedEvent } from './domain/events/business-plan-completed.event.js';
