/**
 * 分享用例
 * 处理分享相关的业务用例
 */
import { Share, ShareFactory } from '../domain/share.aggregate.js';
import { SharePermission } from '../domain/value-objects/share-permission.vo.js';
import { ShareStatus } from '../domain/value-objects/share-status.vo.js';
import { ShareRepository } from '../infrastructure/share.repository.js';
import { ShareMapper } from '../infrastructure/share.mapper.js';
import { Result } from '../../../shared/result.js';

export class ShareUseCase {
  constructor() {
    this.repository = new ShareRepository();
    this.mapper = new ShareMapper();
  }

  /**
   * 创建分享
   */
  async createShare(createDto) {
    try {
      const {
        resourceId,
        resourceType,
        title,
        description,
        permission = 'READ',
        expiresAt,
        password,
        createdBy
      } = createDto;

      if (!resourceId || !resourceType || !title) {
        return Result.fail('资源ID、类型和标题不能为空');
      }

      const share = Share.create({
        resourceId,
        resourceType,
        title,
        description,
        permission,
        expiresAt,
        password,
        createdBy
      });

      await this.repository.save(share);

      const dto = this.mapper.toDTO(share);
      return Result.ok(dto);
    } catch (error) {
      console.error('创建分享失败:', error);
      return Result.fail(`创建分享失败: ${error.message}`);
    }
  }

  /**
   * 获取分享
   */
  async getShare(id) {
    try {
      const share = await this.repository.findById(id);

      if (!share) {
        return Result.fail('分享不存在');
      }

      const dto = this.mapper.toDTO(share);
      return Result.ok(dto);
    } catch (error) {
      console.error('获取分享失败:', error);
      return Result.fail(`获取分享失败: ${error.message}`);
    }
  }

  /**
   * 通过分享链接获取分享
   */
  async getShareByLink(shareLink) {
    try {
      const share = await this.repository.findByShareLink(shareLink);

      if (!share) {
        return Result.fail('分享链接无效');
      }

      const dto = this.mapper.toDTO(share);
      return Result.ok(dto);
    } catch (error) {
      console.error('获取分享失败:', error);
      return Result.fail(`获取分享失败: ${error.message}`);
    }
  }

  /**
   * 访问分享
   */
  async accessShare(shareLink, password) {
    try {
      const share = await this.repository.findByShareLink(shareLink);

      if (!share) {
        return Result.fail('分享链接无效');
      }

      // 访问分享（会触发状态检查和更新）
      const accessInfo = share.access(password);

      await this.repository.save(share);

      return Result.ok({
        accessInfo,
        share: this.mapper.toDTO(share)
      });
    } catch (error) {
      console.error('访问分享失败:', error);
      return Result.fail(`访问分享失败: ${error.message}`);
    }
  }

  /**
   * 获取资源的分享列表
   */
  async getSharesByResource(resourceId, resourceType) {
    try {
      const shares = await this.repository.findByResource(resourceId, resourceType);

      const dtos = shares.map(share => this.mapper.toDTO(share));

      return Result.ok({
        items: dtos,
        total: dtos.length
      });
    } catch (error) {
      console.error('获取资源分享失败:', error);
      return Result.fail(`获取资源分享失败: ${error.message}`);
    }
  }

  /**
   * 获取用户创建的分享
   */
  async getSharesByCreator(createdBy, filters = {}) {
    try {
      const shares = await this.repository.findByCreator(createdBy, filters);

      const dtos = shares.map(share => this.mapper.toDTO(share));

      return Result.ok({
        items: dtos,
        total: dtos.length
      });
    } catch (error) {
      console.error('获取用户分享失败:', error);
      return Result.fail(`获取用户分享失败: ${error.message}`);
    }
  }

  /**
   * 撤销分享
   */
  async revokeShare(id) {
    try {
      const share = await this.repository.findById(id);

      if (!share) {
        return Result.fail('分享不存在');
      }

      share.revoke();

      await this.repository.save(share);

      const dto = this.mapper.toDTO(share);
      return Result.ok(dto);
    } catch (error) {
      console.error('撤销分享失败:', error);
      return Result.fail(`撤销分享失败: ${error.message}`);
    }
  }

  /**
   * 更新分享权限
   */
  async updateSharePermission(id, permission) {
    try {
      const share = await this.repository.findById(id);

      if (!share) {
        return Result.fail('分享不存在');
      }

      share.updatePermission(permission);

      await this.repository.save(share);

      const dto = this.mapper.toDTO(share);
      return Result.ok(dto);
    } catch (error) {
      console.error('更新分享权限失败:', error);
      return Result.fail(`更新分享权限失败: ${error.message}`);
    }
  }

  /**
   * 更新分享过期时间
   */
  async updateShareExpiry(id, expiresAt) {
    try {
      const share = await this.repository.findById(id);

      if (!share) {
        return Result.fail('分享不存在');
      }

      share.updateExpiry(expiresAt);

      await this.repository.save(share);

      const dto = this.mapper.toDTO(share);
      return Result.ok(dto);
    } catch (error) {
      console.error('更新分享过期时间失败:', error);
      return Result.fail(`更新分享过期时间失败: ${error.message}`);
    }
  }

  /**
   * 更新分享密码
   */
  async updateSharePassword(id, password) {
    try {
      const share = await this.repository.findById(id);

      if (!share) {
        return Result.fail('分享不存在');
      }

      share.updatePassword(password);

      await this.repository.save(share);

      const dto = this.mapper.toDTO(share);
      return Result.ok(dto);
    } catch (error) {
      console.error('更新分享密码失败:', error);
      return Result.fail(`更新分享密码失败: ${error.message}`);
    }
  }

  /**
   * 删除分享
   */
  async deleteShare(id) {
    try {
      await this.repository.delete(id);
      return Result.ok(true);
    } catch (error) {
      console.error('删除分享失败:', error);
      return Result.fail(`删除分享失败: ${error.message}`);
    }
  }

  /**
   * 获取所有分享
   */
  async getAllShares(filters = {}) {
    try {
      const shares = await this.repository.findAll(filters);

      const dtos = shares.map(share => this.mapper.toDTO(share));

      return Result.ok({
        items: dtos,
        total: dtos.length
      });
    } catch (error) {
      console.error('获取分享列表失败:', error);
      return Result.fail(`获取分享列表失败: ${error.message}`);
    }
  }

  /**
   * 获取分享统计
   */
  async getShareStats(resourceId, resourceType) {
    try {
      const stats = await this.repository.getStats(resourceId, resourceType);
      return Result.ok(stats);
    } catch (error) {
      console.error('获取分享统计失败:', error);
      return Result.fail(`获取分享统计失败: ${error.message}`);
    }
  }

  /**
   * 创建项目分享
   */
  async createProjectShare(
    projectId,
    title,
    description,
    permission,
    expiresAt,
    password,
    createdBy
  ) {
    return this.createShare({
      resourceId: projectId,
      resourceType: 'PROJECT',
      title,
      description,
      permission,
      expiresAt,
      password,
      createdBy
    });
  }

  /**
   * 创建报告分享
   */
  async createReportShare(
    reportId,
    title,
    description,
    permission,
    expiresAt,
    password,
    createdBy
  ) {
    return this.createShare({
      resourceId: reportId,
      resourceType: 'REPORT',
      title,
      description,
      permission,
      expiresAt,
      password,
      createdBy
    });
  }

  /**
   * 批量撤销分享
   */
  async batchRevokeShares(shareIds) {
    try {
      const results = [];

      for (const id of shareIds) {
        try {
          const result = await this.revokeShare(id);
          results.push({ id, success: result.isSuccess, error: result.error });
        } catch (error) {
          results.push({ id, success: false, error: error.message });
        }
      }

      return Result.ok(results);
    } catch (error) {
      console.error('批量撤销分享失败:', error);
      return Result.fail(`批量撤销分享失败: ${error.message}`);
    }
  }

  /**
   * 清理过期分享
   */
  async cleanupExpiredShares() {
    try {
      const expiredShares = await this.repository.findExpiredShares();
      const results = [];

      for (const share of expiredShares) {
        try {
          share.expire();
          await this.repository.save(share);
          results.push({ id: share.id.value, success: true });
        } catch (error) {
          results.push({ id: share.id.value, success: false, error: error.message });
        }
      }

      return Result.ok({
        cleanedCount: results.filter(r => r.success).length,
        results
      });
    } catch (error) {
      console.error('清理过期分享失败:', error);
      return Result.fail(`清理过期分享失败: ${error.message}`);
    }
  }
}

export default ShareUseCase;
