/**
 * 用户事件处理器
 * 处理用户相关的领域事件
 */
import logger from '../../../../../middleware/logger.js';
import { eventBus } from '../../../infrastructure/events/event-bus.js';

/**
 * 用户创建事件处理器
 */
export class UserCreatedEventHandler {
  async handle(event) {
    logger.info('[UserCreatedEventHandler] 处理用户创建事件', {
      userId: event.userId,
      phone: event.phone
    });

    // TODO: 实现具体的业务逻辑
    // 例如：发送欢迎邮件、创建默认设置、记录审计日志等
  }
}

/**
 * 用户登录事件处理器
 */
export class UserLoggedInEventHandler {
  async handle(event) {
    logger.info('[UserLoggedInEventHandler] 处理用户登录事件', {
      userId: event.userId,
      timestamp: event.occurredOn
    });

    // TODO: 实现具体的业务逻辑
    // 例如：更新最后登录时间、记录登录日志、检测异常登录等
  }
}

/**
 * 用户登出事件处理器
 */
export class UserLoggedOutEventHandler {
  async handle(event) {
    logger.info('[UserLoggedOutEventHandler] 处理用户登出事件', {
      userId: event.userId,
      timestamp: event.occurredOn
    });

    // TODO: 实现具体的业务逻辑
    // 例如：清理会话、记录登出日志等
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
