/**
 * 用户创建领域事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class UserCreatedEvent extends DomainEvent {
  constructor(userId, phone) {
    super('user.created', {
      userId,
      phone
    });
  }

  get userId() {
    return this.data.userId;
  }

  get phone() {
    return this.data.phone;
  }
}
