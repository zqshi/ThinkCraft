import { AggregateRoot } from '../../../shared/domain/aggregate-root.base.js';
import { ShareId } from './value-objects/share-id.vo.js';
import { ShareType } from './value-objects/share-type.vo.js';
import { SharePermission } from './value-objects/share-permission.vo.js';
import { ShareStatus } from './value-objects/share-status.vo.js';
import { ShareTitle } from './value-objects/share-title.vo.js';
import { ShareDescription } from './value-objects/share-description.vo.js';
import { UserId } from '../../shared/value-objects/user-id.vo.js';
import { ShareCreatedEvent } from './events/share-created.event.js';
import { ShareAccessedEvent } from './events/share-accessed.event.js';
import { ShareRevokedEvent } from './events/share-revoked.event.js';
import { ShareExpiredEvent } from './events/share-expired.event.js';

export class Share extends AggregateRoot {
  constructor(
    id,
    resourceId,
    resourceType,
    title,
    description = null,
    shareLink = null,
    permission = null,
    status = null,
    expiresAt = null,
    password = null,
    accessCount = 0,
    lastAccessedAt = null,
    createdBy = null,
    createdAt = null,
    updatedAt = null
  ) {
    super(id);
    this._resourceId = resourceId;
    this._resourceType = resourceType;
    this._title = title;
    this._description = description;
    this._shareLink = shareLink;
    this._permission = permission;
    this._status = status;
    this._expiresAt = expiresAt;
    this._password = password;
    this._accessCount = accessCount;
    this._lastAccessedAt = lastAccessedAt;
    this._createdBy = createdBy;
    this._createdAt = createdAt || new Date();
    this._updatedAt = updatedAt || new Date();
  }

  /**
   * 创建分享
   */
  static create({
    resourceId,
    resourceType,
    title,
    description,
    permission = SharePermission.READ,
    expiresAt,
    password,
    createdBy
  }) {
    const shareId = ShareId.generate();
    const shareTitle = new ShareTitle(title);
    const shareDescription = description ? new ShareDescription(description) : null;
    const shareType =
      resourceType instanceof ShareType ? resourceType : ShareType.fromString(resourceType);
    const sharePermission =
      permission instanceof SharePermission ? permission : SharePermission.fromString(permission);
    const shareLink = Share.generateShareLink();
    const userId = createdBy ? new UserId(createdBy) : null;

    // 设置状态
    let status;
    if (password) {
      status = ShareStatus.PASSWORD_PROTECTED;
    } else if (expiresAt && new Date(expiresAt) < new Date()) {
      status = ShareStatus.EXPIRED;
    } else {
      status = ShareStatus.ACTIVE;
    }

    const share = new Share(
      shareId,
      resourceId,
      shareType,
      shareTitle,
      shareDescription,
      shareLink,
      sharePermission,
      status,
      expiresAt,
      password,
      0,
      null,
      userId
    );

    // 添加领域事件
    share.addDomainEvent(
      new ShareCreatedEvent({
        shareId: shareId.value,
        resourceId,
        resourceType: shareType.value,
        permission: sharePermission.value,
        hasPassword: Boolean(password),
        hasExpiry: Boolean(expiresAt),
        createdBy
      })
    );

    return share;
  }

  /**
   * 访问分享
   */
  access(password) {
    // 检查状态
    if (this._status.isRevoked()) {
      throw new Error('分享已被撤销');
    }

    if (this._status.isExpired()) {
      throw new Error('分享已过期');
    }

    // 检查密码
    if (this._password && this._password !== password) {
      throw new Error('密码错误');
    }

    // 检查过期时间
    if (this._expiresAt && new Date() > new Date(this._expiresAt)) {
      this.expire();
      throw new Error('分享已过期');
    }

    // 更新访问信息
    this._accessCount++;
    this._lastAccessedAt = new Date();
    this._updatedAt = new Date();

    this.addDomainEvent(
      new ShareAccessedEvent({
        shareId: this.id.value,
        resourceId: this._resourceId,
        accessCount: this._accessCount,
        timestamp: new Date()
      })
    );

    return {
      resourceId: this._resourceId,
      resourceType: this._resourceType.value,
      permission: this._permission.value,
      title: this._title.value,
      description: this._description?.value
    };
  }

  /**
   * 撤销分享
   */
  revoke() {
    if (this._status.isRevoked()) {
      throw new Error('分享已被撤销');
    }

    this._status = ShareStatus.REVOKED;
    this._updatedAt = new Date();

    this.addDomainEvent(
      new ShareRevokedEvent({
        shareId: this.id.value,
        resourceId: this._resourceId,
        revokedAt: new Date()
      })
    );
  }

  /**
   * 过期分享
   */
  expire() {
    if (!this._status.isExpired()) {
      this._status = ShareStatus.EXPIRED;
      this._updatedAt = new Date();

      this.addDomainEvent(
        new ShareExpiredEvent({
          shareId: this.id.value,
          resourceId: this._resourceId,
          expiredAt: new Date()
        })
      );
    }
  }

  /**
   * 更新权限
   */
  updatePermission(newPermission) {
    if (this._status.isRevoked()) {
      throw new Error('分享已被撤销，不能更新权限');
    }

    const permission =
      newPermission instanceof SharePermission
        ? newPermission
        : SharePermission.fromString(newPermission);

    this._permission = permission;
    this._updatedAt = new Date();
  }

  /**
   * 更新过期时间
   */
  updateExpiry(expiresAt) {
    if (this._status.isRevoked()) {
      throw new Error('分享已被撤销，不能更新过期时间');
    }

    this._expiresAt = expiresAt;

    // 检查是否立即过期
    if (expiresAt && new Date(expiresAt) < new Date()) {
      this.expire();
    } else if (this._status.isExpired() && (!expiresAt || new Date(expiresAt) > new Date())) {
      // 如果之前已过期但现在设置了未来的时间，则恢复为活跃状态
      this._status = this._password ? ShareStatus.PASSWORD_PROTECTED : ShareStatus.ACTIVE;
    }

    this._updatedAt = new Date();
  }

  /**
   * 更新密码
   */
  updatePassword(password) {
    if (this._status.isRevoked()) {
      throw new Error('分享已被撤销，不能更新密码');
    }

    this._password = password;

    // 更新状态
    if (password) {
      this._status = ShareStatus.PASSWORD_PROTECTED;
    } else if (!this._status.isExpired()) {
      this._status = ShareStatus.ACTIVE;
    }

    this._updatedAt = new Date();
  }

  /**
   * 验证密码
   */
  validatePassword(password) {
    if (!this._password) {
      return true;
    }
    return this._password === password;
  }

  /**
   * 检查是否有效
   */
  isValid() {
    if (this._status.isRevoked() || this._status.isExpired()) {
      return false;
    }

    if (this._expiresAt && new Date() > new Date(this._expiresAt)) {
      this.expire();
      return false;
    }

    return true;
  }

  /**
   * 生成分享链接
   */
  static generateShareLink() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let link = '';
    for (let i = 0; i < 16; i++) {
      link += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return link;
  }

  // Getters
  get resourceId() {
    return this._resourceId;
  }
  get resourceType() {
    return this._resourceType;
  }
  get title() {
    return this._title;
  }
  get description() {
    return this._description;
  }
  get shareLink() {
    return this._shareLink;
  }
  get permission() {
    return this._permission;
  }
  get status() {
    return this._status;
  }
  get expiresAt() {
    return this._expiresAt;
  }
  get password() {
    return this._password;
  }
  get accessCount() {
    return this._accessCount;
  }
  get lastAccessedAt() {
    return this._lastAccessedAt;
  }
  get createdBy() {
    return this._createdBy;
  }
  get createdAt() {
    return this._createdAt;
  }
  get updatedAt() {
    return this._updatedAt;
  }
  get isActive() {
    return this._status.isActive();
  }
  get isPasswordProtected() {
    return this._status.isPasswordProtected();
  }
  get isExpired() {
    return this._status.isExpired();
  }
  get isRevoked() {
    return this._status.isRevoked();
  }

  /**
   * 获取完整分享链接
   */
  getFullShareLink(baseUrl = '') {
    return `${baseUrl}/share/${this._shareLink}`;
  }

  /**
   * 获取分享统计
   */
  getStats() {
    return {
      accessCount: this._accessCount,
      lastAccessedAt: this._lastAccessedAt,
      daysSinceCreated: Math.floor((new Date() - this._createdAt) / (1000 * 60 * 60 * 24)),
      daysSinceLastAccess: this._lastAccessedAt
        ? Math.floor((new Date() - this._lastAccessedAt) / (1000 * 60 * 60 * 24))
        : null,
      isExpired: this.isExpired,
      daysUntilExpiry: this._expiresAt
        ? Math.floor((new Date(this._expiresAt) - new Date()) / (1000 * 60 * 60 * 24))
        : null
    };
  }

  toJSON() {
    return {
      id: this.id.value,
      resourceId: this._resourceId,
      resourceType: this._resourceType.value,
      title: this._title.value,
      description: this._description?.value,
      shareLink: this._shareLink,
      permission: this._permission.value,
      status: this._status.value,
      expiresAt: this._expiresAt,
      hasPassword: Boolean(this._password),
      accessCount: this._accessCount,
      lastAccessedAt: this._lastAccessedAt,
      createdBy: this._createdBy?.value,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      stats: this.getStats()
    };
  }

  /**
   * 从JSON创建分享
   */
  static fromJSON(json) {
    const share = new Share(
      new ShareId(json.id),
      json.resourceId,
      ShareType.fromString(json.resourceType),
      new ShareTitle(json.title),
      json.description ? new ShareDescription(json.description) : null,
      json.shareLink,
      SharePermission.fromString(json.permission),
      ShareStatus.fromString(json.status),
      json.expiresAt,
      json.password,
      json.accessCount,
      json.lastAccessedAt,
      json.createdBy ? new UserId(json.createdBy) : null,
      new Date(json.createdAt),
      new Date(json.updatedAt)
    );

    return share;
  }
}
