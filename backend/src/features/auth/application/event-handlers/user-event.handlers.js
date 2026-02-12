/**
 * 用户事件处理器
 * 处理用户相关的领域事件
 */
import logger from '../../../../../middleware/logger.js';
import { eventBus } from '../../../../infrastructure/events/event-bus.js';

function buildAuditPayload(event) {
  return {
    userId: event?.userId || event?.payload?.userId || null,
    phone: event?.phone || event?.payload?.phone || null,
    occurredOn: event?.occurredOn || event?.payload?.occurredOn || new Date().toISOString()
  };
}

/**
 * 用户创建事件处理器
 */
export class UserCreatedEventHandler {
  async handle(event) {
    const payload = buildAuditPayload(event);
    logger.info('[UserCreatedEventHandler] 处理用户创建事件', payload);
  }
}

/**
 * 用户登录事件处理器
 */
export class UserLoggedInEventHandler {
  async handle(event) {
    const payload = buildAuditPayload(event);
    logger.info('[UserLoggedInEventHandler] 处理用户登录事件', payload);
  }
}

/**
 * 用户登出事件处理器
 */
export class UserLoggedOutEventHandler {
  async handle(event) {
    const payload = buildAuditPayload(event);
    logger.info('[UserLoggedOutEventHandler] 处理用户登出事件', payload);
  }
}

/**
 * 注册所有用户事件处理器
 */
export function registerUserEventHandlers() {
  const userCreatedHandler = new UserCreatedEventHandler();
  const userLoggedInHandler = new UserLoggedInEventHandler();
  const userLoggedOutHandler = new UserLoggedOutEventHandler();

  // 订阅事件
  eventBus.subscribe('UserCreatedEvent', event => userCreatedHandler.handle(event));
  eventBus.subscribe('UserLoggedInEvent', event => userLoggedInHandler.handle(event));
  eventBus.subscribe('UserLoggedOutEvent', event => userLoggedOutHandler.handle(event));

  logger.info('[UserEventHandlers] 用户事件处理器注册完成');
}
