/**
 * ShareService - 分享管理领域服务
 *
 * 职责：
 * 1. 分享链接创建和管理
 * 2. 短链ID生成
 * 3. 访问统计和日志
 * 4. 过期分享清理
 */

import { shareRepository } from '../repositories/ShareRepository.js';
import { domainLoggers } from '../../../infrastructure/logging/domainLogger.js';
import crypto from 'crypto';

const logger = domainLoggers.Share;

// 分享链接过期时间（7天）
const EXPIRE_TIME = 7 * 24 * 60 * 60 * 1000;

export class ShareService {
  constructor(repository = shareRepository) {
    this.repository = repository;
  }

  /**
   * 生成短链ID
   * @private
   * @returns {string} 8位短链ID
   */
  _generateShortId() {
    return crypto.randomBytes(4).toString('hex');
  }

  /**
   * 创建分享链接
   * @param {string} userId - 用户ID
   * @param {string} type - 分享类型 (report/business_plan/demo)
   * @param {Object} data - 分享数据
   * @param {string} title - 分享标题
   * @param {Object} options - 选项（如自定义过期时间）
   * @returns {Promise<Object>} 创建的分享链接
   */
  async createShare(userId, type, data, title, options = {}) {
    try {
      // 验证输入
      if (!userId || !type || !data) {
        throw new Error('用户ID、类型和数据不能为空');
      }

      // 验证类型
      const validTypes = ['report', 'business_plan', 'demo', 'other'];
      if (!validTypes.includes(type)) {
        throw new Error(`无效的分享类型: ${type}`);
      }

      // 生成短链ID
      const shareId = this._generateShortId();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (options.expireTime || EXPIRE_TIME));

      // 创建分享数据
      const shareData = {
        id: shareId,
        userId,
        type,
        data,
        title: title || '创意分享',
        views: 0,
        expiresAt
      };

      const share = await this.repository.createShare(shareData);

      // 生成分享URL
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const shareUrl = `${baseUrl}/share/${shareId}`;

      logger.info('创建分享链接成功', {
        shareId: share.id,
        userId,
        type,
        expiresAt
      });

      return {
        shareId: share.id,
        shareUrl,
        expiresAt: share.expiresAt,
        qrCodeUrl: `/api/share/qrcode/${shareId}`
      };
    } catch (error) {
      logger.error('创建分享链接失败', error);
      throw error;
    }
  }

  /**
   * 获取分享内容
   * @param {string} shareId - 分享ID
   * @param {Object} accessInfo - 访问信息（IP、UserAgent等）
   * @returns {Promise<Object|null>} 分享内容
   */
  async getShare(shareId, accessInfo = {}) {
    try {
      const share = await this.repository.getShareById(shareId);

      if (!share) {
        logger.warn('分享链接不存在', { shareId });
        return null;
      }

      // 检查是否过期
      if (new Date() > new Date(share.expiresAt)) {
        logger.info('分享链接已过期', { shareId, expiresAt: share.expiresAt });
        // 删除过期的分享
        await this.repository.deleteShare(shareId);
        return null;
      }

      // 增加浏览次数
      const newViews = await this.repository.incrementViews(shareId);

      // 记录访问日志
      await this.repository.logAccess({
        shareId,
        ipAddress: accessInfo.ip || 'unknown',
        userAgent: accessInfo.userAgent || 'unknown',
        accessedAt: new Date()
      });

      logger.info('访问分享链接', {
        shareId,
        views: newViews,
        ip: accessInfo.ip
      });

      return {
        type: share.type,
        title: share.title,
        content: share.data,
        createdAt: share.createdAt,
        views: newViews
      };
    } catch (error) {
      logger.error('获取分享内容失败', error);
      throw error;
    }
  }

  /**
   * 获取用户的分享列表
   * @param {string} userId - 用户ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Array<Object>>} 分享列表
   */
  async getUserShares(userId, options = {}) {
    try {
      const shares = await this.repository.getUserShares(userId, options);

      logger.debug('获取用户分享列表', {
        userId,
        count: shares.length
      });

      return shares;
    } catch (error) {
      logger.error('获取用户分享列表失败', error);
      throw error;
    }
  }

  /**
   * 删除分享链接
   * @param {string} shareId - 分享ID
   * @param {string} userId - 用户ID（用于权限验证）
   * @returns {Promise<boolean>} 是否成功
   */
  async deleteShare(shareId, userId) {
    try {
      const success = await this.repository.deleteShare(shareId, userId);

      if (success) {
        logger.info('删除分享链接成功', { shareId, userId });
      } else {
        logger.warn('删除分享链接失败：不存在或无权限', { shareId, userId });
      }

      return success;
    } catch (error) {
      logger.error('删除分享链接失败', error);
      throw error;
    }
  }

  /**
   * 获取分享的访问日志
   * @param {string} shareId - 分享ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Array<Object>>} 访问日志
   */
  async getAccessLogs(shareId, options = {}) {
    try {
      const logs = await this.repository.getAccessLogs(shareId, options);

      logger.debug('获取分享访问日志', {
        shareId,
        count: logs.length
      });

      return logs;
    } catch (error) {
      logger.error('获取分享访问日志失败', error);
      throw error;
    }
  }

  /**
   * 清理过期分享
   * @returns {Promise<number>} 清理的数量
   */
  async cleanExpiredShares() {
    try {
      const count = await this.repository.cleanExpiredShares();

      if (count > 0) {
        logger.info('清理过期分享成功', { count });
      }

      return count;
    } catch (error) {
      logger.error('清理过期分享失败', error);
      throw error;
    }
  }

  /**
   * 生成二维码URL
   * @param {string} shareId - 分享ID
   * @returns {string} 二维码图片URL
   */
  generateQRCodeUrl(shareId) {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const shareUrl = `${baseUrl}/share/${shareId}`;

    // 使用第三方二维码API
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareUrl)}`;

    logger.debug('生成二维码URL', { shareId, shareUrl });

    return qrApiUrl;
  }

  /**
   * 更新分享数据
   * @param {string} shareId - 分享ID
   * @param {Object} data - 新数据
   * @returns {Promise<boolean>} 是否成功
   */
  async updateShareData(shareId, data) {
    try {
      if (!data || typeof data !== 'object') {
        throw new Error('数据必须是对象');
      }

      const success = await this.repository.updateShare(shareId, { data });

      if (success) {
        logger.info('更新分享数据成功', { shareId });
      }

      return success;
    } catch (error) {
      logger.error('更新分享数据失败', error);
      throw error;
    }
  }

  /**
   * 更新分享标题
   * @param {string} shareId - 分享ID
   * @param {string} title - 新标题
   * @returns {Promise<boolean>} 是否成功
   */
  async updateShareTitle(shareId, title) {
    try {
      if (!title || title.trim().length === 0) {
        throw new Error('标题不能为空');
      }

      const success = await this.repository.updateShare(shareId, {
        title: title.trim()
      });

      if (success) {
        logger.info('更新分享标题成功', { shareId, title });
      }

      return success;
    } catch (error) {
      logger.error('更新分享标题失败', error);
      throw error;
    }
  }

  /**
   * 延长分享有效期
   * @param {string} shareId - 分享ID
   * @param {number} additionalDays - 延长的天数
   * @returns {Promise<boolean>} 是否成功
   */
  async extendExpiration(shareId, additionalDays) {
    try {
      if (!additionalDays || additionalDays <= 0) {
        throw new Error('延长天数必须大于0');
      }

      const share = await this.repository.getShareById(shareId);
      if (!share) {
        throw new Error('分享链接不存在');
      }

      const currentExpires = new Date(share.expiresAt);
      const newExpires = new Date(currentExpires.getTime() + additionalDays * 24 * 60 * 60 * 1000);

      const success = await this.repository.updateShare(shareId, {
        expiresAt: newExpires
      });

      if (success) {
        logger.info('延长分享有效期成功', {
          shareId,
          additionalDays,
          newExpires
        });
      }

      return success;
    } catch (error) {
      logger.error('延长分享有效期失败', error);
      throw error;
    }
  }

  /**
   * 获取分享统计信息
   * @returns {Promise<Object>} 统计信息
   */
  async getStats() {
    try {
      const stats = await this.repository.getStats();

      logger.debug('获取分享统计信息', stats);

      return stats;
    } catch (error) {
      logger.error('获取分享统计信息失败', error);
      throw error;
    }
  }

  /**
   * 获取用户的分享统计
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} 用户统计
   */
  async getUserStats(userId) {
    try {
      const stats = await this.repository.getUserStats(userId);

      logger.debug('获取用户分享统计', { userId, ...stats });

      return stats;
    } catch (error) {
      logger.error('获取用户分享统计失败', error);
      throw error;
    }
  }

  /**
   * 启动定期清理任务
   * @returns {NodeJS.Timer} 定时器对象
   */
  startCleanupJob() {
    // 每小时清理一次过期分享
    const interval = setInterval(async () => {
      try {
        await this.cleanExpiredShares();
      } catch (error) {
        logger.error('定期清理过期分享失败', error);
      }
    }, 60 * 60 * 1000); // 1小时

    logger.info('启动定期清理任务', { intervalMs: 60 * 60 * 1000 });

    return interval;
  }
}

// 创建单例实例
export const shareService = new ShareService();

// 启动定期清理任务
shareService.startCleanupJob();

export default ShareService;
