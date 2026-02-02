/**
 * Share 控制器
 */
import { ShareUseCase } from '../application/share.use-case.js';
import { getRepository } from '../../../shared/infrastructure/repository.factory.js';
import {
  CreateShareRequestDto,
  UpdateShareRequestDto,
  AccessShareRequestDto,
  BatchShareOperationDto
} from '../application/share.dto.js';
import { ok, fail } from '../../../../middleware/response.js';

export class ShareController {
  constructor() {
    this.shareUseCase = new ShareUseCase(getRepository('share'));
  }

  /**
   * 创建分享
   */
  async createShare(req, res) {
    try {
      const requestDto = new CreateShareRequestDto({
        resourceId: req.body.resourceId,
        resourceType: req.body.resourceType,
        title: req.body.title,
        description: req.body.description,
        permission: req.body.permission,
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : null,
        password: req.body.password
      });

      const result = await this.shareUseCase.createShare(requestDto, req.user.userId);
      ok(res, result);
    } catch (error) {
      fail(res, error.message, 400);
    }
  }

  /**
   * 访问分享
   */
  async accessShare(req, res) {
    try {
      const shareLink = req.params.shareLink;
      const requestDto = new AccessShareRequestDto({
        password: req.body.password || req.query.password
      });

      const result = await this.shareUseCase.accessShare(shareLink, requestDto);

      if (result.hasAccess) {
        ok(res, result.share);
      } else {
        fail(res, result.error || 'Forbidden', 403, { share: result.share });
      }
    } catch (error) {
      fail(res, error.message, 404);
    }
  }

  /**
   * 获取分享详情
   */
  async getShare(req, res) {
    try {
      const result = await this.shareUseCase.getShare(req.params.shareId, req.user.userId);
      ok(res, result);
    } catch (error) {
      fail(res, error.message, 404);
    }
  }

  /**
   * 更新分享
   */
  async updateShare(req, res) {
    try {
      const requestDto = new UpdateShareRequestDto({
        title: req.body.title,
        description: req.body.description,
        permission: req.body.permission,
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
        password: req.body.password
      });

      const result = await this.shareUseCase.updateShare(
        req.params.shareId,
        requestDto,
        req.user.userId
      );
      ok(res, result);
    } catch (error) {
      fail(res, error.message, 400);
    }
  }

  /**
   * 撤销分享
   */
  async revokeShare(req, res) {
    try {
      const result = await this.shareUseCase.revokeShare(req.params.shareId, req.user.userId);
      ok(res, result);
    } catch (error) {
      fail(res, error.message, 400);
    }
  }

  /**
   * 获取用户的分享列表
   */
  async getUserShares(req, res) {
    try {
      const filters = {
        resourceType: req.query.resourceType,
        status: req.query.status,
        resourceId: req.query.resourceId
      };

      // 清理空过滤器
      Object.keys(filters).forEach(key => {
        if (!filters[key]) {
          delete filters[key];
        }
      });

      const result = await this.shareUseCase.getUserShares(req.user.userId, filters);
      ok(res, result);
    } catch (error) {
      fail(res, error.message, 400);
    }
  }

  /**
   * 获取资源的分享状态
   */
  async getResourceShareStatus(req, res) {
    try {
      const result = await this.shareUseCase.getResourceShareStatus(
        req.params.resourceId,
        req.params.resourceType
      );
      ok(res, result);
    } catch (error) {
      fail(res, error.message, 400);
    }
  }

  /**
   * 获取分享统计
   */
  async getShareStats(req, res) {
    try {
      const result = await this.shareUseCase.getShareStats(req.user.userId);
      ok(res, result);
    } catch (error) {
      fail(res, error.message, 400);
    }
  }

  /**
   * 批量操作分享
   */
  async batchOperation(req, res) {
    try {
      const requestDto = new BatchShareOperationDto({
        shareIds: req.body.shareIds,
        operation: req.body.operation
      });

      const result = await this.shareUseCase.batchOperation(requestDto, req.user.userId);
      ok(res, result);
    } catch (error) {
      fail(res, error.message, 400);
    }
  }

  /**
   * 验证分享密码
   */
  async validatePassword(req, res) {
    try {
      const isValid = await this.shareUseCase.validatePassword(
        req.params.shareLink,
        req.body.password
      );
      ok(res, { isValid });
    } catch (error) {
      fail(res, error.message, 404);
    }
  }

  /**
   * 清理过期分享（系统任务）
   */
  async cleanupExpiredShares(req, res) {
    try {
      // 这里应该有权限检查，确保是系统任务调用
      const results = await this.shareUseCase.cleanupExpiredShares();
      ok(res, results);
    } catch (error) {
      fail(res, error.message, 500);
    }
  }

  /**
   * 生成分享卡片数据
   */
  async generateShareCard(req, res) {
    try {
      const { messages } = req.body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return fail(res, '对话历史不能为空', 400);
      }

      const result = await this.shareUseCase.generateShareCard(messages);
      ok(res, result);
    } catch (error) {
      console.error('Generate share card error:', error);
      fail(res, error.message || '生成分享卡片失败', 500);
    }
  }
}

export default ShareController;
