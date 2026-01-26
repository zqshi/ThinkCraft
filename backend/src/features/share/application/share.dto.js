/**
 * Share DTOs
 */

/**
 * 创建分享请求DTO
 */
export class CreateShareRequestDto {
  constructor({ resourceId, resourceType, title, description, permission, expiresAt, password }) {
    this.resourceId = resourceId;
    this.resourceType = resourceType;
    this.title = title;
    this.description = description;
    this.permission = permission || 'read';
    this.expiresAt = expiresAt || null;
    this.password = password || null;
  }

  validate() {
    if (!this.resourceId) {
      throw new Error('Resource ID is required');
    }

    if (!this.resourceType) {
      throw new Error('Resource type is required');
    }

    if (!this.title) {
      throw new Error('Title is required');
    }

    if (this.permission && !['read', 'write', 'admin'].includes(this.permission)) {
      throw new Error('Permission must be one of: read, write, admin');
    }

    if (this.expiresAt && !(this.expiresAt instanceof Date)) {
      throw new Error('Expires at must be a Date instance or null');
    }

    if (this.password && typeof this.password !== 'string') {
      throw new Error('Password must be a string or null');
    }
  }
}

/**
 * 更新分享请求DTO
 */
export class UpdateShareRequestDto {
  constructor({ title, description, permission, expiresAt, password }) {
    this.title = title;
    this.description = description;
    this.permission = permission;
    this.expiresAt = expiresAt;
    this.password = password;
  }

  validate() {
    if (this.permission && !['read', 'write', 'admin'].includes(this.permission)) {
      throw new Error('Permission must be one of: read, write, admin');
    }

    if (this.expiresAt && !(this.expiresAt instanceof Date)) {
      throw new Error('Expires at must be a Date instance or null');
    }

    if (
      this.password !== undefined &&
      this.password !== null &&
      typeof this.password !== 'string'
    ) {
      throw new Error('Password must be a string or null');
    }
  }
}

/**
 * 分享响应DTO
 */
export class ShareResponseDto {
  constructor({
    id,
    resourceId,
    resourceType,
    title,
    description,
    shareLink,
    permission,
    status,
    expiresAt,
    isPasswordProtected,
    accessCount,
    lastAccessedAt,
    createdBy,
    createdAt,
    fullUrl
  }) {
    this.id = id;
    this.resourceId = resourceId;
    this.resourceType = resourceType;
    this.title = title;
    this.description = description;
    this.shareLink = shareLink;
    this.permission = permission;
    this.status = status;
    this.expiresAt = expiresAt;
    this.isPasswordProtected = isPasswordProtected;
    this.accessCount = accessCount;
    this.lastAccessedAt = lastAccessedAt;
    this.createdBy = createdBy;
    this.createdAt = createdAt;
    this.fullUrl = fullUrl;
  }

  static fromAggregate(share, baseUrl = '') {
    return new ShareResponseDto({
      id: share.id.value,
      resourceId: share.resourceId,
      resourceType: share.resourceType.value,
      title: share.title,
      description: share.description,
      shareLink: share.shareLink,
      permission: share.permission.value,
      status: share.status.value,
      expiresAt: share.expiresAt,
      isPasswordProtected: share.status.isPasswordProtected(),
      accessCount: share.accessCount,
      lastAccessedAt: share.lastAccessedAt,
      createdBy: share.createdBy,
      createdAt: share.createdAt,
      fullUrl: `${baseUrl}/s/${share.shareLink}`
    });
  }
}

/**
 * 分享列表项DTO
 */
export class ShareListItemDto {
  constructor({
    id,
    resourceId,
    resourceType,
    title,
    permission,
    status,
    expiresAt,
    isPasswordProtected,
    accessCount,
    createdAt
  }) {
    this.id = id;
    this.resourceId = resourceId;
    this.resourceType = resourceType;
    this.title = title;
    this.permission = permission;
    this.status = status;
    this.expiresAt = expiresAt;
    this.isPasswordProtected = isPasswordProtected;
    this.accessCount = accessCount;
    this.createdAt = createdAt;
  }

  static fromAggregate(share) {
    return new ShareListItemDto({
      id: share.id.value,
      resourceId: share.resourceId,
      resourceType: share.resourceType.value,
      title: share.title,
      permission: share.permission.value,
      status: share.status.value,
      expiresAt: share.expiresAt,
      isPasswordProtected: share.status.isPasswordProtected(),
      accessCount: share.accessCount,
      createdAt: share.createdAt
    });
  }
}

/**
 * 访问分享请求DTO
 */
export class AccessShareRequestDto {
  constructor({ password }) {
    this.password = password || null;
  }

  validate() {
    // 可选验证，密码可以为空
  }
}

/**
 * 批量操作分享DTO
 */
export class BatchShareOperationDto {
  constructor({ shareIds, operation }) {
    this.shareIds = shareIds;
    this.operation = operation;
  }

  validate() {
    if (!Array.isArray(this.shareIds) || this.shareIds.length === 0) {
      throw new Error('Share IDs must be a non-empty array');
    }

    const validOperations = ['revoke', 'delete', 'extend'];
    if (!validOperations.includes(this.operation)) {
      throw new Error(`Operation must be one of: ${validOperations.join(', ')}`);
    }
  }
}

/**
 * 分享统计DTO
 */
export class ShareStatsDto {
  constructor({ totalShares, activeShares, expiredShares, revokedShares, totalAccesses }) {
    this.totalShares = totalShares;
    this.activeShares = activeShares;
    this.expiredShares = expiredShares;
    this.revokedShares = revokedShares;
    this.totalAccesses = totalAccesses;
  }
}

/**
 * 资源分享状态DTO
 */
export class ResourceShareStatusDto {
  constructor({ resourceId, isShared, shareCount, activeShares }) {
    this.resourceId = resourceId;
    this.isShared = isShared;
    this.shareCount = shareCount;
    this.activeShares = activeShares;
  }
}

export {
  CreateShareRequestDto,
  UpdateShareRequestDto,
  ShareResponseDto,
  ShareListItemDto,
  AccessShareRequestDto,
  BatchShareOperationDto,
  ShareStatsDto,
  ResourceShareStatusDto
};
