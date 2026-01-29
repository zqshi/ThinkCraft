/**
 * 用户登录领域事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class UserLoggedInEvent extends DomainEvent {
  constructor(userId, identifier) {
    super('user.logged_in', {
      userId,
      identifier,
      loginAt: new Date()
    });
  }

  get userId() {
    return this.data.userId;
  }

  get identifier() {
    return this.data.identifier;
  }

  get loginAt() {
    return this.data.loginAt;
  }
}
