/**
 * 用户登出领域事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class UserLoggedOutEvent extends DomainEvent {
  constructor(userId, username) {
    super('user.logged_out', {
      userId,
      username,
      logoutAt: new Date()
    });
  }

  get userId() {
    return this.data.userId;
  }

  get username() {
    return this.data.username;
  }

  get logoutAt() {
    return this.data.logoutAt;
  }
}
