/**
 * 用户登出领域事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class UserLoggedOutEvent extends DomainEvent {
  constructor(userId, identifier) {
    super('user.logged_out', {
      userId,
      identifier,
      logoutAt: new Date()
    });
  }

  get userId() {
    return this.data.userId;
  }

  get identifier() {
    return this.data.identifier;
  }

  get logoutAt() {
    return this.data.logoutAt;
  }
}
