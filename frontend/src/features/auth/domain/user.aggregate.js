/**
 * 用户聚合根
 * 维护用户实体的完整性和业务规则
 */
import { Entity } from '../../../../shared/domain/entity.base.js';
import { UserId } from './value-objects/user-id.vo.js';
import { UserEmail } from './value-objects/user-email.vo.js';
import { UserStatus } from './value-objects/user-status.vo.js';
import { UserRole } from './value-objects/user-role.vo.js';
import { UserCreatedEvent } from './events/user-created.event.js';
import { UserLoggedInEvent } from './events/user-logged-in.event.js';
import { UserProfileUpdatedEvent } from './events/user-profile-updated.event.js';

export class User extends Entity {
  constructor(id, props) {
    super(id);
    this._email = props.email;
    this._username = props.username;
    this._password = props.password;
    this._status = props.status || UserStatus.ACTIVE;
    this._role = props.role || UserRole.USER;
    this._profile = props.profile || {};
    this._lastLoginAt = props.lastLoginAt;
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
  }

  /**
   * 创建用户
   */
  static create(props) {
    const userId = new UserId();
    const user = new User(userId, {
      ...props,
      status: UserStatus.ACTIVE,
      role: UserRole.USER
    });

    // 发布用户创建事件
    user.addDomainEvent(
      new UserCreatedEvent({
        userId: userId.value,
        email: props.email.value,
        username: props.username
      })
    );

    return user;
  }

  /**
   * 用户登录
   */
  login() {
    this._lastLoginAt = new Date();
    this._updatedAt = new Date();

    // 发布用户登录事件
    this.addDomainEvent(
      new UserLoggedInEvent({
        userId: this._id.value,
        loginAt: this._lastLoginAt
      })
    );
  }

  /**
   * 更新用户资料
   */
  updateProfile(profileData) {
    this._profile = {
      ...this._profile,
      ...profileData
    };
    this._updatedAt = new Date();

    // 发布资料更新事件
    this.addDomainEvent(
      new UserProfileUpdatedEvent({
        userId: this._id.value,
        updatedFields: Object.keys(profileData)
      })
    );
  }

  /**
   * 激活用户
   */
  activate() {
    if (this._status === UserStatus.ACTIVE) {
      throw new Error('用户已经是激活状态');
    }
    this._status = UserStatus.ACTIVE;
    this._updatedAt = new Date();
  }

  /**
   * 禁用用户
   */
  deactivate() {
    if (this._status === UserStatus.INACTIVE) {
      throw new Error('用户已经是禁用状态');
    }
    this._status = UserStatus.INACTIVE;
    this._updatedAt = new Date();
  }

  /**
   * 验证密码
   */
  validatePassword(password) {
    // 这里应该使用加密算法验证密码
    // 为简化实现，暂时直接比较
    return this._password === password;
  }

  /**
   * 验证实体有效性
   */
  validate() {
    if (!this._email) {
      throw new Error('用户邮箱不能为空');
    }
    if (!this._username || this._username.trim().length === 0) {
      throw new Error('用户名不能为空');
    }
    if (!this._password || this._password.length < 6) {
      throw new Error('密码长度不能少于6位');
    }
    return true;
  }

  // Getters
  get email() {
    return this._email;
  }
  get username() {
    return this._username;
  }
  get status() {
    return this._status;
  }
  get role() {
    return this._role;
  }
  get profile() {
    return this._profile;
  }
  get lastLoginAt() {
    return this._lastLoginAt;
  }

  /**
   * 转换为JSON
   */
  toJSON() {
    return {
      ...super.toJSON(),
      email: this._email.value,
      username: this._username,
      status: this._status.value,
      role: this._role.value,
      profile: this._profile,
      lastLoginAt: this._lastLoginAt
    };
  }
}

/**
 * 用户资料实体
 */
export class UserProfile {
  constructor(props) {
    this.avatar = props.avatar || '';
    this.nickname = props.nickname || '';
    this.bio = props.bio || '';
    this.phone = props.phone || '';
    this.company = props.company || '';
    this.position = props.position || '';
    this.website = props.website || '';
    this.location = props.location || '';
  }

  updateProfile(profileData) {
    Object.keys(profileData).forEach(key => {
      if (this.hasOwnProperty(key)) {
        this[key] = profileData[key];
      }
    });
  }

  toJSON() {
    return { ...this };
  }
}

/**
 * 用户会话实体
 */
export class UserSession {
  constructor(userId, token, expiresAt) {
    this.userId = userId;
    this.token = token;
    this.createdAt = new Date();
    this.expiresAt = expiresAt;
    this.isActive = true;
  }

  isExpired() {
    return new Date() > this.expiresAt;
  }

  invalidate() {
    this.isActive = false;
  }

  toJSON() {
    return {
      userId: this.userId,
      token: this.token,
      createdAt: this.createdAt,
      expiresAt: this.expiresAt,
      isActive: this.isActive
    };
  }
}

/**
 * 用户认证值对象
 */
export class UserCredentials {
  constructor(email, password) {
    this.email = email;
    this.password = password;
  }

  validate() {
    if (!this.email || !this.email.value) {
      throw new Error('邮箱不能为空');
    }
    if (!this.password || this.password.length === 0) {
      throw new Error('密码不能为空');
    }
    return true;
  }

  toJSON() {
    return {
      email: this.email.value,
      password: this.password
    };
  }
}

/**
 * 用户注册值对象
 */
export class UserRegistration {
  constructor(email, username, password, confirmPassword) {
    this.email = email;
    this.username = username;
    this.password = password;
    this.confirmPassword = confirmPassword;
  }

  validate() {
    if (!this.email || !this.email.value) {
      throw new Error('邮箱不能为空');
    }
    if (!this.username || this.username.trim().length === 0) {
      throw new Error('用户名不能为空');
    }
    if (!this.password || this.password.length < 6) {
      throw new Error('密码长度不能少于6位');
    }
    if (this.password !== this.confirmPassword) {
      throw new Error('两次输入的密码不一致');
    }
    return true;
  }

  toJSON() {
    return {
      email: this.email.value,
      username: this.username,
      password: this.password
    };
  }
}

/**
 * 用户令牌值对象
 */
export class UserToken {
  constructor(token, expiresIn = 24 * 60 * 60 * 1000) {
    // 默认24小时
    this.token = token;
    this.expiresIn = expiresIn;
    this.createdAt = new Date();
    this.expiresAt = new Date(this.createdAt.getTime() + expiresIn);
  }

  isExpired() {
    return new Date() > this.expiresAt;
  }

  toJSON() {
    return {
      token: this.token,
      expiresIn: this.expiresIn,
      createdAt: this.createdAt,
      expiresAt: this.expiresAt
    };
  }
}

/**
 * 用户权限值对象
 */
export class UserPermission {
  constructor(resource, actions) {
    this.resource = resource;
    this.actions = actions; // ['read', 'write', 'delete', ...]
  }

  can(action) {
    return this.actions.includes(action);
  }

  toJSON() {
    return {
      resource: this.resource,
      actions: this.actions
    };
  }
}

/**
 * 用户角色权限值对象
 */
export class UserRolePermissions {
  static getPermissions(role) {
    const permissions = {
      [UserRole.USER.value]: [
        new UserPermission('profile', ['read', 'write']),
        new UserPermission('project', ['read', 'write', 'create']),
        new UserPermission('chat', ['read', 'write', 'create']),
        new UserPermission('business-plan', ['read', 'write', 'create'])
      ],
      [UserRole.ADMIN.value]: [new UserPermission('*', ['read', 'write', 'delete', 'create'])],
      [UserRole.GUEST.value]: [
        new UserPermission('profile', ['read']),
        new UserPermission('project', ['read']),
        new UserPermission('chat', ['read'])
      ]
    };

    return permissions[role.value] || permissions[UserRole.USER.value];
  }
}

/**
 * 用户聚合根工厂
 */
export class UserFactory {
  static createUser(email, username, password) {
    return User.create({
      email: new UserEmail(email),
      username,
      password,
      profile: new UserProfile({})
    });
  }

  static createGuest() {
    const guestId = 'guest_' + Date.now();
    return new User(new UserId(guestId), {
      email: new UserEmail('guest@example.com'),
      username: 'guest',
      password: '',
      status: UserStatus.ACTIVE,
      role: UserRole.GUEST,
      profile: new UserProfile({})
    });
  }
}

/**
 * 用户聚合根构建器
 */
export class UserBuilder {
  constructor() {
    this._id = null;
    this._email = null;
    this._username = null;
    this._password = null;
    this._status = UserStatus.ACTIVE;
    this._role = UserRole.USER;
    this._profile = new UserProfile({});
    this._lastLoginAt = null;
    this._createdAt = new Date();
    this._updatedAt = new Date();
  }

  withId(id) {
    this._id = id;
    return this;
  }

  withEmail(email) {
    this._email = email;
    return this;
  }

  withUsername(username) {
    this._username = username;
    return this;
  }

  withPassword(password) {
    this._password = password;
    return this;
  }

  withStatus(status) {
    this._status = status;
    return this;
  }

  withRole(role) {
    this._role = role;
    return this;
  }

  withProfile(profile) {
    this._profile = profile;
    return this;
  }

  withLastLoginAt(lastLoginAt) {
    this._lastLoginAt = lastLoginAt;
    return this;
  }

  withCreatedAt(createdAt) {
    this._createdAt = createdAt;
    return this;
  }

  withUpdatedAt(updatedAt) {
    this._updatedAt = updatedAt;
    return this;
  }

  build() {
    if (!this._id) {
      this._id = new UserId();
    }
    if (!this._email) {
      throw new Error('用户邮箱不能为空');
    }
    if (!this._username) {
      throw new Error('用户名不能为空');
    }
    if (!this._password) {
      throw new Error('用户密码不能为空');
    }

    return new User(this._id, {
      email: this._email,
      username: this._username,
      password: this._password,
      status: this._status,
      role: this._role,
      profile: this._profile,
      lastLoginAt: this._lastLoginAt,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt
    });
  }
}

/**
 * 用户聚合根仓库接口
 */
export class IUserRepository {
  async save(user) {
    throw new Error('必须实现save方法');
  }

  async findById(id) {
    throw new Error('必须实现findById方法');
  }

  async findByEmail(email) {
    throw new Error('必须实现findByEmail方法');
  }

  async findByUsername(username) {
    throw new Error('必须实现findByUsername方法');
  }

  async delete(id) {
    throw new Error('必须实现delete方法');
  }

  async exists(email) {
    throw new Error('必须实现exists方法');
  }
}

/**
 * 用户会话仓库接口
 */
export class IUserSessionRepository {
  async save(session) {
    throw new Error('必须实现save方法');
  }

  async findByToken(token) {
    throw new Error('必须实现findByToken方法');
  }

  async findByUserId(userId) {
    throw new Error('必须实现findByUserId方法');
  }

  async delete(token) {
    throw new Error('必须实现delete方法');
  }

  async deleteByUserId(userId) {
    throw new Error('必须实现deleteByUserId方法');
  }

  async deleteExpired() {
    throw new Error('必须实现deleteExpired方法');
  }
}

/**
 * 用户领域服务
 */
export class UserDomainService {
  constructor(userRepository, userSessionRepository) {
    this._userRepository = userRepository;
    this._userSessionRepository = userSessionRepository;
  }

  /**
   * 用户注册
   */
  async register(registration) {
    registration.validate();

    // 检查邮箱是否已存在
    const exists = await this._userRepository.exists(registration.email);
    if (exists) {
      throw new Error('该邮箱已被注册');
    }

    // 检查用户名是否已存在
    const existingUser = await this._userRepository.findByUsername(registration.username);
    if (existingUser) {
      throw new Error('该用户名已被使用');
    }

    // 创建用户
    const user = UserFactory.createUser(
      registration.email.value,
      registration.username,
      registration.password
    );

    // 保存用户
    await this._userRepository.save(user);

    return user;
  }

  /**
   * 用户登录
   */
  async login(credentials) {
    credentials.validate();

    // 查找用户
    const user = await this._userRepository.findByEmail(credentials.email);
    if (!user) {
      throw new Error('用户不存在');
    }

    // 验证密码
    if (!user.validatePassword(credentials.password)) {
      throw new Error('密码错误');
    }

    // 检查用户状态
    if (user.status !== UserStatus.ACTIVE) {
      throw new Error('用户账户已被禁用');
    }

    // 记录登录时间
    user.login();
    await this._userRepository.save(user);

    return user;
  }

  /**
   * 用户登出
   */
  async logout(token) {
    await this._userSessionRepository.delete(token);
  }

  /**
   * 验证用户令牌
   */
  async validateToken(token) {
    const session = await this._userSessionRepository.findByToken(token);
    if (!session) {
      throw new Error('无效的令牌');
    }

    if (session.isExpired()) {
      await this._userSessionRepository.delete(token);
      throw new Error('令牌已过期');
    }

    return session;
  }

  /**
   * 生成用户令牌
   */
  async generateToken(userId) {
    // 删除用户现有的所有会话
    await this._userSessionRepository.deleteByUserId(userId);

    // 生成新令牌
    const token = this._generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24小时后过期

    const session = new UserSession(userId, token, expiresAt);
    await this._userSessionRepository.save(session);

    return new UserToken(token, 24 * 60 * 60 * 1000);
  }

  /**
   * 生成随机令牌
   */
  _generateToken() {
    return 'token_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 检查用户权限
   */
  checkPermission(user, resource, action) {
    const permissions = UserRolePermissions.getPermissions(user.role);

    for (const permission of permissions) {
      if (permission.resource === '*' || permission.resource === resource) {
        if (permission.can(action)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 清理过期会话
   */
  async cleanupExpiredSessions() {
    await this._userSessionRepository.deleteExpired();
  }
}

/**
 * 用户应用服务
 */
export class UserApplicationService {
  constructor(userRepository, userSessionRepository) {
    this._domainService = new UserDomainService(userRepository, userSessionRepository);
  }

  /**
   * 用户注册
   */
  async register(registrationDto) {
    const user = await this._domainService.register(registrationDto);
    return UserResponseDto.fromAggregate(user);
  }

  /**
   * 用户登录
   */
  async login(loginDto) {
    const user = await this._domainService.login(loginDto);
    const token = await this._domainService.generateToken(user.id.value);

    return {
      user: UserResponseDto.fromAggregate(user),
      token: token.toJSON()
    };
  }

  /**
   * 用户登出
   */
  async logout(token) {
    await this._domainService.logout(token);
  }

  /**
   * 验证用户令牌
   */
  async validateToken(token) {
    const session = await this._domainService.validateToken(token);
    return session;
  }

  /**
   * 获取用户信息
   */
  async getUserInfo(userId) {
    const user = await this._userRepository.findById(userId);
    if (!user) {
      throw new Error('用户不存在');
    }
    return UserResponseDto.fromAggregate(user);
  }

  /**
   * 更新用户资料
   */
  async updateProfile(userId, profileDto) {
    const user = await this._userRepository.findById(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    user.updateProfile(profileDto);
    await this._userRepository.save(user);

    return UserResponseDto.fromAggregate(user);
  }

  /**
   * 检查用户权限
   */
  checkPermission(user, resource, action) {
    return this._domainService.checkPermission(user, resource, action);
  }

  /**
   * 清理过期会话
   */
  async cleanupExpiredSessions() {
    await this._domainService.cleanupExpiredSessions();
  }
}

/**
 * 用户响应DTO
 */
export class UserResponseDto {
  static fromAggregate(user) {
    return {
      id: user.id.value,
      email: user.email.value,
      username: user.username,
      status: user.status.value,
      role: user.role.value,
      profile: user.profile,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }
}

/**
 * 用户会话响应DTO
 */
export class UserSessionResponseDto {
  static fromAggregate(session) {
    return {
      userId: session.userId,
      token: session.token,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      isActive: session.isActive
    };
  }
}

/**
 * 用户令牌响应DTO
 */
export class UserTokenResponseDto {
  static fromAggregate(token) {
    return {
      token: token.token,
      expiresIn: token.expiresIn,
      expiresAt: token.expiresAt
    };
  }
}

/**
 * 用户权限响应DTO
 */
export class UserPermissionResponseDto {
  static fromAggregate(permission) {
    return {
      resource: permission.resource,
      actions: permission.actions
    };
  }
}

/**
 * 用户角色权限响应DTO
 */
export class UserRolePermissionsResponseDto {
  static fromAggregate(role) {
    const permissions = UserRolePermissions.getPermissions(role);
    return permissions.map(permission => UserPermissionResponseDto.fromAggregate(permission));
  }
}

/**
 * 用户聚合根构建器工厂
 */
export class UserBuilderFactory {
  static create() {
    return new UserBuilder();
  }

  static createGuest() {
    return UserFactory.createGuest();
  }

  static createUser(email, username, password) {
    return UserFactory.createUser(email, username, password);
  }
}

/**
 * 用户聚合根仓库工厂
 */
export class UserRepositoryFactory {
  static createInMemoryRepository() {
    return new UserInMemoryRepository();
  }

  static createSessionInMemoryRepository() {
    return new UserSessionInMemoryRepository();
  }
}

/**
 * 用户内存仓库实现
 */
export class UserInMemoryRepository extends IUserRepository {
  constructor() {
    super();
    this._users = new Map();
    this._emailIndex = new Map();
    this._usernameIndex = new Map();
  }

  async save(user) {
    this._users.set(user.id.value, user);
    this._emailIndex.set(user.email.value, user.id.value);
    this._usernameIndex.set(user.username, user.id.value);
    return user;
  }

  async findById(id) {
    return this._users.get(id.value) || null;
  }

  async findByEmail(email) {
    const userId = this._emailIndex.get(email.value);
    return userId ? this._users.get(userId) : null;
  }

  async findByUsername(username) {
    const userId = this._usernameIndex.get(username);
    return userId ? this._users.get(userId) : null;
  }

  async delete(id) {
    const user = this._users.get(id.value);
    if (user) {
      this._users.delete(id.value);
      this._emailIndex.delete(user.email.value);
      this._usernameIndex.delete(user.username);
      return true;
    }
    return false;
  }

  async exists(email) {
    return this._emailIndex.has(email.value);
  }

  async clear() {
    this._users.clear();
    this._emailIndex.clear();
    this._usernameIndex.clear();
  }

  get count() {
    return this._users.size;
  }
}

/**
 * 用户会话内存仓库实现
 */
export class UserSessionInMemoryRepository extends IUserSessionRepository {
  constructor() {
    super();
    this._sessions = new Map();
    this._userIdIndex = new Map();
  }

  async save(session) {
    this._sessions.set(session.token, session);

    if (!this._userIdIndex.has(session.userId)) {
      this._userIdIndex.set(session.userId, new Set());
    }
    this._userIdIndex.get(session.userId).add(session.token);

    return session;
  }

  async findByToken(token) {
    return this._sessions.get(token) || null;
  }

  async findByUserId(userId) {
    const tokens = this._userIdIndex.get(userId);
    if (!tokens) {
      return [];
    }

    const sessions = [];
    for (const token of tokens) {
      const session = this._sessions.get(token);
      if (session) {
        sessions.push(session);
      }
    }
    return sessions;
  }

  async delete(token) {
    const session = this._sessions.get(token);
    if (session) {
      this._sessions.delete(token);

      const userTokens = this._userIdIndex.get(session.userId);
      if (userTokens) {
        userTokens.delete(token);
        if (userTokens.size === 0) {
          this._userIdIndex.delete(session.userId);
        }
      }

      return true;
    }
    return false;
  }

  async deleteByUserId(userId) {
    const tokens = this._userIdIndex.get(userId);
    if (tokens) {
      for (const token of tokens) {
        this._sessions.delete(token);
      }
      this._userIdIndex.delete(userId);
      return true;
    }
    return false;
  }

  async deleteExpired() {
    const now = new Date();
    const expiredTokens = [];

    for (const [token, session] of this._sessions) {
      if (session.isExpired()) {
        expiredTokens.push(token);
      }
    }

    for (const token of expiredTokens) {
      await this.delete(token);
    }

    return expiredTokens.length;
  }

  async clear() {
    this._sessions.clear();
    this._userIdIndex.clear();
  }

  get count() {
    return this._sessions.size;
  }
}

/**
 * 用户应用服务工厂
 */
export class UserApplicationServiceFactory {
  static create() {
    const userRepository = UserRepositoryFactory.createInMemoryRepository();
    const userSessionRepository = UserRepositoryFactory.createSessionInMemoryRepository();
    return new UserApplicationService(userRepository, userSessionRepository);
  }
}

/**
 * 用户聚合根入口
 */
export {
  User,
  UserProfile,
  UserSession,
  UserCredentials,
  UserRegistration,
  UserToken,
  UserPermission,
  UserRolePermissions,
  UserFactory,
  UserBuilder,
  IUserRepository,
  IUserSessionRepository,
  UserDomainService,
  UserApplicationService,
  UserResponseDto,
  UserSessionResponseDto,
  UserTokenResponseDto,
  UserPermissionResponseDto,
  UserRolePermissionsResponseDto,
  UserInMemoryRepository,
  UserSessionInMemoryRepository,
  UserBuilderFactory,
  UserRepositoryFactory,
  UserApplicationServiceFactory
};
