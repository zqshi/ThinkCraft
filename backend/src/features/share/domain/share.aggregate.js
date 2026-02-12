/**
 * Share聚合根
 */
import { AggregateRoot } from '../../../shared/domain/aggregate-root.base.js';
import { ShareId } from './value-objects/share-id.vo.js';
import { ShareType } from './value-objects/share-type.vo.js';
import { SharePermission } from './value-objects/share-permission.vo.js';
import { ShareStatus } from './value-objects/share-status.vo.js';
import { ShareCreatedEvent } from './events/share-created.event.js';
import { ShareAccessedEvent } from './events/share-accessed.event.js';
import { ShareRevokedEvent } from './events/share-revoked.event.js';
import { ShareExpiredEvent } from './events/share-expired.event.js';

export class Share extends AggregateRoot {
  constructor(id, props) {
    super(id, props);
  }

  get resourceId() {
    return this.props.resourceId;
  }

  get resourceType() {
    return this.props.resourceType;
  }

  get title() {
    return this.props.title;
  }

  get description() {
    return this.props.description;
  }

  get shareLink() {
    return this.props.shareLink;
  }

  get permission() {
    return this.props.permission;
  }

  get status() {
    return this.props.status;
  }

  get expiresAt() {
    return this.props.expiresAt;
  }

  get password() {
    return this.props.password;
  }

  get accessCount() {
    return this.props.accessCount;
  }

  get lastAccessedAt() {
    return this.props.lastAccessedAt;
  }

  get createdBy() {
    return this.props.createdBy;
  }

  get createdAt() {
    return this.props.createdAt;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      resourceId: this.props.resourceId,
      resourceType: this.props.resourceType?.value || this.props.resourceType,
      title: this.props.title,
      description: this.props.description,
      shareLink: this.props.shareLink,
      permission: this.props.permission?.value || this.props.permission,
      status: this.props.status?.value || this.props.status,
      expiresAt: this.props.expiresAt,
      password: this.props.password,
      accessCount: this.props.accessCount,
      lastAccessedAt: this.props.lastAccessedAt,
      createdBy: this.props.createdBy,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt
    };
  }

  static fromJSON(data) {
    const share = new Share(new ShareId(data.id), {
      resourceId: data.resourceId,
      resourceType: new ShareType(data.resourceType),
      title: data.title,
      description: data.description,
      shareLink: data.shareLink,
      permission: new SharePermission(data.permission),
      status: new ShareStatus(data.status),
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      password: data.password,
      accessCount: data.accessCount || 0,
      lastAccessedAt: data.lastAccessedAt ? new Date(data.lastAccessedAt) : null,
      createdBy: data.createdBy,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date()
    });

    share.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    share.updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
    share._version = data.version || 0;

    return share;
  }

  static create(props) {
    const uniqueId = `share_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const share = new Share(new ShareId(uniqueId), {
      ...props,
      permission: props.permission || new SharePermission(SharePermission.READ),
      status: props.password
        ? new ShareStatus(ShareStatus.PASSWORD_PROTECTED)
        : new ShareStatus(ShareStatus.ACTIVE),
      shareLink: props.shareLink || Share.generateShareLink(),
      accessCount: 0,
      createdAt: new Date(),
      lastAccessedAt: null
    });

    share.addDomainEvent(
      new ShareCreatedEvent({
        shareId: share.id.value,
        resourceId: props.resourceId,
        resourceType: props.resourceType.value,
        permission: share.permission.value,
        createdBy: props.createdBy
      })
    );

    return share;
  }

  /**
   * 访问分享
   */
  access(password) {
    // 检查状态
    if (this.status.isRevoked()) {
      throw new Error('Share has been revoked');
    }

    if (this.status.isExpired()) {
      throw new Error('Share has expired');
    }

    // 检查密码
    if (this.status.isPasswordProtected()) {
      if (!password || password !== this.props.password) {
        throw new Error('Invalid password');
      }
    }

    // 检查过期时间
    if (this.props.expiresAt && new Date() > this.props.expiresAt) {
      this.expire();
      throw new Error('Share has expired');
    }

    // 更新访问信息
    this.props.accessCount++;
    this.props.lastAccessedAt = new Date();

    this.addDomainEvent(
      new ShareAccessedEvent({
        shareId: this.id.value,
        resourceId: this.props.resourceId,
        resourceType: this.props.resourceType.value,
        accessCount: this.props.accessCount
      })
    );
  }

  /**
   * 撤销分享
   */
  revoke() {
    if (this.status.isRevoked()) {
      throw new Error('Share is already revoked');
    }

    this.props.status = new ShareStatus(ShareStatus.REVOKED);
    this.touch();

    this.addDomainEvent(
      new ShareRevokedEvent({
        shareId: this.id.value,
        resourceId: this.props.resourceId,
        resourceType: this.props.resourceType.value
      })
    );
  }

  /**
   * 过期分享
   */
  expire() {
    if (this.status.isExpired()) {
      return;
    }

    this.props.status = new ShareStatus(ShareStatus.EXPIRED);
    this.touch();

    this.addDomainEvent(
      new ShareExpiredEvent({
        shareId: this.id.value,
        resourceId: this.props.resourceId,
        resourceType: this.props.resourceType.value
      })
    );
  }

  /**
   * 更新分享标题
   */
  updateTitle(newTitle) {
    if (!newTitle || typeof newTitle !== 'string') {
      throw new Error('Share title is required');
    }

    this.props.title = newTitle.trim();
    this.touch();
  }

  /**
   * 更新分享描述
   */
  updateDescription(newDescription) {
    if (newDescription === null || newDescription === undefined) {
      this.props.description = '';
      this.touch();
      return;
    }

    this.props.description = String(newDescription).trim();
    this.touch();
  }

  /**
   * 更新权限
   */
  updatePermission(newPermission) {
    if (this.status.isRevoked()) {
      throw new Error('Cannot update permission of revoked share');
    }

    this.props.permission = newPermission;
    this.touch();
  }

  /**
   * 更新密码
   */
  updatePassword(newPassword) {
    if (this.status.isRevoked()) {
      throw new Error('Cannot update password of revoked share');
    }

    this.props.password = newPassword;

    if (newPassword) {
      this.props.status = new ShareStatus(ShareStatus.PASSWORD_PROTECTED);
    } else {
      this.props.status = new ShareStatus(ShareStatus.ACTIVE);
    }

    this.touch();
  }

  /**
   * 延长过期时间
   */
  extendExpiration(newExpiresAt) {
    if (this.status.isRevoked()) {
      throw new Error('Cannot extend expiration of revoked share');
    }

    if (this.status.isExpired()) {
      this.props.status = new ShareStatus(ShareStatus.ACTIVE);
    }

    this.props.expiresAt = newExpiresAt;
    this.touch();
  }

  /**
   * 检查是否可访问
   */
  canAccess() {
    if (this.status.isRevoked()) {
      return false;
    }

    if (this.status.isExpired()) {
      return false;
    }

    if (this.props.expiresAt && new Date() > this.props.expiresAt) {
      this.expire();
      return false;
    }

    return true;
  }

  /**
   * 生成分享链接
   */
  static generateShareLink() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let link = '';
    for (let i = 0; i < 12; i++) {
      link += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return link;
  }

  touch() {
    this.props.updatedAt = new Date();
  }

  validate() {
    if (!this.props.resourceId) {
      throw new Error('Resource ID is required');
    }

    if (!(this.props.resourceType instanceof ShareType)) {
      throw new Error('Resource type must be a ShareType instance');
    }

    if (!this.props.title || typeof this.props.title !== 'string') {
      throw new Error('Title must be a non-empty string');
    }

    if (this.props.description && typeof this.props.description !== 'string') {
      throw new Error('Description must be a string');
    }

    if (!this.props.shareLink || typeof this.props.shareLink !== 'string') {
      throw new Error('Share link must be a non-empty string');
    }

    if (!(this.props.permission instanceof SharePermission)) {
      throw new Error('Permission must be a SharePermission instance');
    }

    if (!(this.props.status instanceof ShareStatus)) {
      throw new Error('Status must be a ShareStatus instance');
    }

    if (this.props.expiresAt && !(this.props.expiresAt instanceof Date)) {
      throw new Error('Expires at must be a Date instance or null');
    }

    if (this.props.password && typeof this.props.password !== 'string') {
      throw new Error('Password must be a string or null');
    }

    if (typeof this.props.accessCount !== 'number' || this.props.accessCount < 0) {
      throw new Error('Access count must be a non-negative number');
    }

    if (this.props.lastAccessedAt && !(this.props.lastAccessedAt instanceof Date)) {
      throw new Error('Last accessed at must be a Date instance or null');
    }

    if (!this.props.createdBy || typeof this.props.createdBy !== 'string') {
      throw new Error('Created by must be a non-empty string');
    }

    if (!(this.props.createdAt instanceof Date)) {
      throw new Error('Created at must be a Date instance');
    }
  }
}

export default Share;
