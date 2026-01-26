/**
 * Share内存仓库实现
 */
import { IShareRepository } from '../domain/share.repository.js';
import { ShareId } from '../domain/value-objects/share-id.vo.js';
import { ShareStatus } from '../domain/value-objects/share-status.vo.js';

export class ShareInMemoryRepository extends IShareRepository {
  constructor() {
    super();
    this.shares = new Map();
    this.shareLinkIndex = new Map(); // 分享链接索引
    this.resourceIndex = new Map(); // 资源ID索引
    this.createdByIndex = new Map(); // 创建者索引
  }

  async save(share) {
    const isNew = !this.shares.has(share.id.value);

    this.shares.set(share.id.value, share);

    // 更新索引
    this.shareLinkIndex.set(share.shareLink, share);

    // 更新资源索引
    if (!this.resourceIndex.has(share.resourceId)) {
      this.resourceIndex.set(share.resourceId, new Set());
    }

    if (isNew) {
      this.resourceIndex.get(share.resourceId).add(share.id.value);
    }

    // 更新创建者索引
    if (!this.createdByIndex.has(share.createdBy)) {
      this.createdByIndex.set(share.createdBy, new Set());
    }

    if (isNew) {
      this.createdByIndex.get(share.createdBy).add(share.id.value);
    }

    return share;
  }

  async findById(shareId) {
    const id = shareId instanceof ShareId ? shareId.value : shareId;
    return this.shares.get(id) || null;
  }

  async findByShareLink(shareLink) {
    const share = this.shareLinkIndex.get(shareLink);

    // 检查是否过期
    if (share && share.expiresAt && new Date() > share.expiresAt) {
      if (!share.status.isExpired()) {
        share.expire();
        await this.save(share);
      }
    }

    return share || null;
  }

  async findByResourceId(resourceId) {
    const shareIds = this.resourceIndex.get(resourceId);

    if (!shareIds) {
      return [];
    }

    const results = [];
    for (const shareId of shareIds) {
      const share = this.shares.get(shareId);
      if (share) {
        results.push(share);
      } else {
        // 清理不存在的ID
        shareIds.delete(shareId);
      }
    }

    return results.sort((a, b) => b.createdAt - a.createdAt);
  }

  async findByCreatedBy(createdBy) {
    const shareIds = this.createdByIndex.get(createdBy);

    if (!shareIds) {
      return [];
    }

    const results = [];
    for (const shareId of shareIds) {
      const share = this.shares.get(shareId);
      if (share) {
        results.push(share);
      } else {
        // 清理不存在的ID
        shareIds.delete(shareId);
      }
    }

    return results.sort((a, b) => b.createdAt - a.createdAt);
  }

  async findByStatus(status) {
    const results = [];
    const statusValue = status instanceof ShareStatus ? status.value : status;

    for (const share of this.shares.values()) {
      if (share.status.value === statusValue) {
        results.push(share);
      }
    }

    return results.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async findExpired() {
    const now = new Date();
    const results = [];

    for (const share of this.shares.values()) {
      // 检查是否已过期（包括状态过期和时间过期）
      if (share.status.isExpired()) {
        results.push(share);
      } else if (share.expiresAt && share.expiresAt < now) {
        results.push(share);
      }
    }

    return results;
  }

  async delete(shareId) {
    const id = shareId instanceof ShareId ? shareId.value : shareId;
    const share = this.shares.get(id);

    if (!share) {
      return false;
    }

    // 从所有索引中移除
    this.shares.delete(id);
    this.shareLinkIndex.delete(share.shareLink);

    const resourceShares = this.resourceIndex.get(share.resourceId);
    if (resourceShares) {
      resourceShares.delete(id);
      if (resourceShares.size === 0) {
        this.resourceIndex.delete(share.resourceId);
      }
    }

    const userShares = this.createdByIndex.get(share.createdBy);
    if (userShares) {
      userShares.delete(id);
      if (userShares.size === 0) {
        this.createdByIndex.delete(share.createdBy);
      }
    }

    return true;
  }

  nextId() {
    return new ShareId(`share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  }

  async clear() {
    this.shares.clear();
    this.shareLinkIndex.clear();
    this.resourceIndex.clear();
    this.createdByIndex.clear();
  }

  async count() {
    return this.shares.size;
  }

  /**
   * 获取统计数据
   */
  async getStats() {
    const stats = {
      total: 0,
      byStatus: {},
      byType: {},
      totalAccesses: 0
    };

    for (const share of this.shares.values()) {
      stats.total++;

      // 按状态统计
      if (!stats.byStatus[share.status.value]) {
        stats.byStatus[share.status.value] = 0;
      }
      stats.byStatus[share.status.value]++;

      // 按类型统计
      if (!stats.byType[share.resourceType.value]) {
        stats.byType[share.resourceType.value] = 0;
      }
      stats.byType[share.resourceType.value]++;

      // 总访问次数
      stats.totalAccesses += share.accessCount;
    }

    return stats;
  }
}

export default ShareInMemoryRepository;
