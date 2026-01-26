/**
 * 用户创建领域事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class UserCreatedEvent extends DomainEvent {
  constructor(userId, username, email) {
    super('user.created', {
      userId,
      username,
      email
    });
  }

  get userId() {
    return this.data.userId;
  }

  get username() {
    return this.data.username;
  }

  get email() {
    return this.data.email;
  }
}
