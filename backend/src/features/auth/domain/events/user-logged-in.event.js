/**
 * 用户登录领域事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class UserLoggedInEvent extends DomainEvent {
  constructor(userId, username) {
    super('user.logged_in', {
      userId,
      username,
      loginAt: new Date()
    });
  }

  get userId() {
    return this.data.userId;
  }

  get username() {
    return this.data.username;
  }

  get loginAt() {
    return this.data.loginAt;
  }
}
