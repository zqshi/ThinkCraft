/**
 * 共享领域层导出
 */

export { Entity } from './entity.base.js';
export { ValueObject } from './value-object.base.js';
export {
  DomainEvent,
  IDomainEventPublisher,
  InMemoryDomainEventPublisher
} from './domain-event.base.js';
export { AggregateRoot } from './aggregate-root.base.js';
export { IRepository, IAggregateRootRepository } from './repository.base.js';
export { IDomainService, DomainService } from './domain-service.base.js';
export {
  DomainException,
  BusinessRuleException,
  EntityNotFoundException,
  EntityValidationException,
  ValueObjectValidationException,
  DomainServiceException
} from './exceptions.js';
