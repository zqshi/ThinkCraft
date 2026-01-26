/**
 * Auth领域模块导出
 */
export { User } from './user.aggregate.js';
export { UserRepository } from './user.repository.js';
export { UserService } from './user.service.js';

// 值对象
export { UserId } from './value-objects/user-id.vo.js';
export { Username } from './value-objects/username.vo.js';
export { Email } from './value-objects/email.vo.js';
export { Password } from './value-objects/password.vo.js';
export { UserStatus } from './value-objects/user-status.vo.js';

// 领域事件
export { UserCreatedEvent } from './events/user-created.event.js';
export { UserLoggedInEvent } from './events/user-logged-in.event.js';
export { UserLoggedOutEvent } from './events/user-logged-out.event.js';
