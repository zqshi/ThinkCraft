/**
 * Share 控制器
 */
import { ShareUseCase } from '../application/share.use-case.js';
import { ShareInMemoryRepository } from '../infrastructure/share-inmemory.repository.js';
import {
  CreateShareRequestDto,
  UpdateShareRequestDto,
  AccessShareRequestDto,
  BatchShareOperationDto
} from '../application/share.dto.js';

export class ShareController {
  constructor() {
    this.shareUseCase = new ShareUseCase(new ShareInMemoryRepository());
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

      const result = await this.shareUseCase.createShare(requestDto, req.user.id);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
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
        res.json({
          success: true,
          data: result.share
        });
      } else {
        res.status(403).json({
          success: false,
          error: result.error,
          data: result.share
        });
      }
    } catch (error) {
      res.status(404).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 获取分享详情
   */
  async getShare(req, res) {
    try {
      const result = await this.shareUseCase.getShare(req.params.shareId, req.user.id);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: error.message
      });
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
        req.user.id
      );
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 撤销分享
   */
  async revokeShare(req, res) {
    try {
      const result = await this.shareUseCase.revokeShare(req.params.shareId, req.user.id);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
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

      const result = await this.shareUseCase.getUserShares(req.user.id, filters);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
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
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 获取分享统计
   */
  async getShareStats(req, res) {
    try {
      const result = await this.shareUseCase.getShareStats(req.user.id);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
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

      const result = await this.shareUseCase.batchOperation(requestDto, req.user.id);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
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
      res.json({
        success: true,
        data: { isValid }
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 清理过期分享（系统任务）
   */
  async cleanupExpiredShares(req, res) {
    try {
      // 这里应该有权限检查，确保是系统任务调用
      const results = await this.shareUseCase.cleanupExpiredShares();
      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 生成分享卡片数据
   */
  async generateShareCard(req, res) {
    try {
      const { messages } = req.body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({
          code: 1,
          error: '对话历史不能为空'
        });
      }

      const result = await this.shareUseCase.generateShareCard(messages);
      res.json({
        code: 0,
        data: result
      });
    } catch (error) {
      console.error('Generate share card error:', error);
      res.status(500).json({
        code: 1,
        error: error.message || '生成分享卡片失败'
      });
    }
  }
}

export default ShareController;
