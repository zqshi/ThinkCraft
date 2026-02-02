/**
 * 分享DTO映射器
 * 处理领域模型与DTO之间的转换
 */
export class ShareMapper {
  /**
   * 将领域模型转换为DTO
   */
  toDTO(share) {
    return {
      id: share.id.value,
      resourceId: share.resourceId,
      resourceType: share.resourceType.value,
      resourceTypeDisplay: share.resourceType.getDisplayName(),
      title: share.title.value,
      description: share.description?.value,
      shareLink: share.shareLink,
      fullShareLink: share.getFullShareLink(),
      permission: share.permission.value,
      permissionDisplay: this.getPermissionDisplay(share.permission.value),
      status: share.status.value,
      statusDisplay: this.getStatusDisplay(share.status.value),
      expiresAt: share.expiresAt,
      hasPassword: Boolean(share.password),
      accessCount: share.accessCount,
      lastAccessedAt: share.lastAccessedAt,
      createdBy: share.createdBy?.value,
      createdAt: share.createdAt,
      updatedAt: share.updatedAt,
      isActive: share.isActive,
      isPasswordProtected: share.isPasswordProtected,
      isExpired: share.isExpired,
      isRevoked: share.isRevoked,
      isValid: share.isValid(),
      stats: share.getStats()
    };
  }

  /**
   * 将DTO转换为领域模型
   */
  toDomain(dto) {
    // 这个方法通常在从后端获取数据后使用
    // 实际实现会根据后端返回的数据结构进行调整
    return dto;
  }

  /**
   * 创建用例的DTO转换为领域模型参数
   */
  toCreateDomain(createDto) {
    return {
      resourceId: createDto.resourceId,
      resourceType: createDto.resourceType,
      title: createDto.title,
      description: createDto.description,
      permission: createDto.permission,
      expiresAt: createDto.expiresAt,
      password: createDto.password,
      createdBy: createDto.createdBy
    };
  }

  /**
   * 获取权限显示文本
   */
  getPermissionDisplay(permission) {
    const permissionMap = {
      READ: '只读',
      WRITE: '可编辑',
      ADMIN: '管理员'
    };
    return permissionMap[permission] || permission;
  }

  /**
   * 获取状态显示文本
   */
  getStatusDisplay(status) {
    const statusMap = {
      ACTIVE: '活跃',
      PASSWORD_PROTECTED: '密码保护',
      EXPIRED: '已过期',
      REVOKED: '已撤销'
    };
    return statusMap[status] || status;
  }

  /**
   * 将列表转换为DTO
   */
  toDTOList(shares) {
    return shares.map(share => this.toDTO(share));
  }

  /**
   * 创建精简DTO（用于列表显示）
   */
  toMinimalDTO(share) {
    return {
      id: share.id.value,
      resourceId: share.resourceId,
      resourceType: share.resourceType.value,
      resourceTypeDisplay: share.resourceType.getDisplayName(),
      title: share.title.value,
      shareLink: share.shareLink,
      permission: share.permission.value,
      permissionDisplay: this.getPermissionDisplay(share.permission.value),
      status: share.status.value,
      statusDisplay: this.getStatusDisplay(share.status.value),
      expiresAt: share.expiresAt,
      hasPassword: Boolean(share.password),
      accessCount: share.accessCount,
      lastAccessedAt: share.lastAccessedAt,
      createdAt: share.createdAt,
      isActive: share.isActive,
      isExpired: share.isExpired,
      isValid: share.isValid()
    };
  }

  /**
   * 创建分享统计DTO
   */
  toStatsDTO(share) {
    const stats = share.getStats();
    return {
      shareId: share.id.value,
      accessCount: stats.accessCount,
      lastAccessedAt: stats.lastAccessedAt,
      daysSinceCreated: stats.daysSinceCreated,
      daysSinceLastAccess: stats.daysSinceLastAccess,
      isExpired: stats.isExpired,
      daysUntilExpiry: stats.daysUntilExpiry,
      status: share.status.value,
      statusDisplay: this.getStatusDisplay(share.status.value)
    };
  }

  /**
   * 创建访问结果DTO
   */
  toAccessResultDTO(accessResult) {
    return {
      resourceId: accessResult.resourceId,
      resourceType: accessResult.resourceType,
      permission: accessResult.permission,
      permissionDisplay: this.getPermissionDisplay(accessResult.permission),
      title: accessResult.title,
      description: accessResult.description
    };
  }
}

export default ShareMapper;
