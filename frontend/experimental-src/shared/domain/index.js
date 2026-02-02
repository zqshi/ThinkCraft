/**
 * 共享领域层模块导出
 */
export { Entity } from './entity.base.js';
export { ValueObject } from './value-object.base.js';
export { AggregateRoot } from './aggregate-root.base.js';
export { DomainEvent } from './domain-event.base.js';

// 异常处理
export * from './exceptions.js';

// 共享值对象
export * from './value-objects/index.js';
