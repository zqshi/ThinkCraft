/**
 * Share 用例实现
 */
import {
  Share,
  ShareType,
  SharePermission,
  ShareStatus,
  IShareRepository
} from '../domain/index.js';
import {
  CreateShareRequestDto,
  UpdateShareRequestDto,
  ShareResponseDto,
  ShareListItemDto,
  AccessShareRequestDto,
  BatchShareOperationDto,
  ShareStatsDto,
  ResourceShareStatusDto
} from './share.dto.js';
import { callDeepSeekAPI } from '../../../../config/deepseek.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class ShareUseCase {
  constructor(shareRepository = new IShareRepository()) {
    this.shareRepository = shareRepository;
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  }

  /**
   * 创建分享
   */
  async createShare(requestDto, createdBy) {
    requestDto.validate();

    const shareType = new ShareType(requestDto.resourceType);
    const permission = new SharePermission(requestDto.permission);

    const share = Share.create({
      resourceId: requestDto.resourceId,
      resourceType: shareType,
      title: requestDto.title,
      description: requestDto.description,
      permission: permission,
      expiresAt: requestDto.expiresAt,
      password: requestDto.password,
      createdBy: createdBy
    });

    await this.shareRepository.save(share);

    return ShareResponseDto.fromAggregate(share, this.baseUrl);
  }

  /**
   * 访问分享
   */
  async accessShare(shareLink, requestDto) {
    requestDto.validate();

    const share = await this.shareRepository.findByShareLink(shareLink);
    if (!share) {
      throw new Error('Share not found');
    }

    try {
      share.access(requestDto.password);
      await this.shareRepository.save(share);

      return {
        share: ShareResponseDto.fromAggregate(share, this.baseUrl),
        hasAccess: true
      };
    } catch (error) {
      return {
        share: ShareResponseDto.fromAggregate(share, this.baseUrl),
        hasAccess: false,
        error: error.message
      };
    }
  }

  /**
   * 获取分享详情
   */
  async getShare(shareId, userId) {
    const share = await this.shareRepository.findById(shareId);
    if (!share) {
      throw new Error('Share not found');
    }

    // 验证权限 - 只有创建者可以查看详情
    if (share.createdBy !== userId) {
      throw new Error('Unauthorized access to share details');
    }

    return ShareResponseDto.fromAggregate(share, this.baseUrl);
  }

  /**
   * 更新分享
   */
  async updateShare(shareId, requestDto, userId) {
    requestDto.validate();

    const share = await this.shareRepository.findById(shareId);
    if (!share) {
      throw new Error('Share not found');
    }

    // 验证权限
    if (share.createdBy !== userId) {
      throw new Error('Unauthorized to update this share');
    }

    if (requestDto.title !== undefined) {
      share.title = requestDto.title;
    }

    if (requestDto.description !== undefined) {
      share.description = requestDto.description;
    }

    if (requestDto.permission !== undefined) {
      share.updatePermission(new SharePermission(requestDto.permission));
    }

    if (requestDto.expiresAt !== undefined) {
      share.extendExpiration(requestDto.expiresAt);
    }

    if (requestDto.password !== undefined) {
      share.updatePassword(requestDto.password);
    }

    await this.shareRepository.save(share);

    return ShareResponseDto.fromAggregate(share, this.baseUrl);
  }

  /**
   * 撤销分享
   */
  async revokeShare(shareId, userId) {
    const share = await this.shareRepository.findById(shareId);
    if (!share) {
      throw new Error('Share not found');
    }

    // 验证权限
    if (share.createdBy !== userId) {
      throw new Error('Unauthorized to revoke this share');
    }

    share.revoke();
    await this.shareRepository.save(share);

    return ShareResponseDto.fromAggregate(share, this.baseUrl);
  }

  /**
   * 获取用户的分享列表
   */
  async getUserShares(userId, filters = {}) {
    let shares = await this.shareRepository.findByCreatedBy(userId);

    // 应用过滤器
    if (filters.resourceType) {
      shares = shares.filter(share => share.resourceType.value === filters.resourceType);
    }

    if (filters.status) {
      shares = shares.filter(share => share.status.value === filters.status);
    }

    if (filters.resourceId) {
      shares = shares.filter(share => share.resourceId === filters.resourceId);
    }

    return shares.map(share => ShareListItemDto.fromAggregate(share));
  }

  /**
   * 获取资源的分享状态
   */
  async getResourceShareStatus(resourceId, resourceType) {
    const shares = await this.shareRepository.findByResourceId(resourceId);
    const filteredShares = shares.filter(share => share.resourceType.value === resourceType);

    const activeShares = filteredShares.filter(
      share => share.status.isActive() || share.status.isPasswordProtected()
    );

    return new ResourceShareStatusDto({
      resourceId: resourceId,
      isShared: filteredShares.length > 0,
      shareCount: filteredShares.length,
      activeShares: activeShares.length
    });
  }

  /**
   * 获取分享统计信息
   */
  async getShareStats(userId) {
    const shares = await this.shareRepository.findByCreatedBy(userId);

    const stats = {
      totalShares: shares.length,
      activeShares: shares.filter(
        share => share.status.isActive() || share.status.isPasswordProtected()
      ).length,
      expiredShares: shares.filter(share => share.status.isExpired()).length,
      revokedShares: shares.filter(share => share.status.isRevoked()).length,
      totalAccesses: shares.reduce((sum, share) => sum + share.accessCount, 0)
    };

    return new ShareStatsDto(stats);
  }

  /**
   * 批量操作分享
   */
  async batchOperation(requestDto, userId) {
    requestDto.validate();

    const results = [];

    for (const shareId of requestDto.shareIds) {
      try {
        const share = await this.shareRepository.findById(shareId);
        if (!share) {
          results.push({ shareId, success: false, error: 'Share not found' });
          continue;
        }

        // 验证权限
        if (share.createdBy !== userId) {
          results.push({ shareId, success: false, error: 'Unauthorized' });
          continue;
        }

        switch (requestDto.operation) {
        case 'revoke':
          share.revoke();
          break;
        case 'delete':
          await this.shareRepository.delete(shareId);
          results.push({ shareId, success: true, operation: 'deleted' });
          continue;
        case 'extend':
          // 默认延长7天
          const newExpiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          share.extendExpiration(newExpiryDate);
          break;
        default:
          results.push({ shareId, success: false, error: 'Invalid operation' });
          continue;
        }

        await this.shareRepository.save(share);
        results.push({ shareId, success: true, operation: requestDto.operation });
      } catch (error) {
        results.push({ shareId, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * 清理过期分享
   */
  async cleanupExpiredShares() {
    const expiredShares = await this.shareRepository.findExpired();
    const results = [];

    for (const share of expiredShares) {
      try {
        if (share.status.isActive() || share.status.isPasswordProtected()) {
          share.expire();
          await this.shareRepository.save(share);
          results.push({ shareId: share.id.value, status: 'expired' });
        }
      } catch (error) {
        results.push({ shareId: share.id.value, status: 'error', error: error.message });
      }
    }

    return results;
  }

  /**
   * 验证分享密码
   */
  async validatePassword(shareLink, password) {
    const share = await this.shareRepository.findByShareLink(shareLink);
    if (!share) {
      throw new Error('Share not found');
    }

    if (!share.status.isPasswordProtected()) {
      return true;
    }

    return share.password === password;
  }

  /**
   * 生成分享卡片数据
   */
  async generateShareCard(messages) {
    try {
      // 读取分享卡片prompt配置
      const promptPath = join(__dirname, '../../../../config/share-card-prompts.js');
      const promptModule = await import(`file://${promptPath}`);
      const SHARE_CARD_PROMPT = promptModule.SHARE_CARD_GENERATION_PROMPT;

      // 构建完整的prompt
      const conversationText = messages
        .map(msg => `${msg.role === 'user' ? '用户' : 'AI助手'}: ${msg.content}`)
        .join('\n\n');

      const fullPrompt = `${SHARE_CARD_PROMPT}\n\n对话历史：\n${conversationText}`;

      // 调用AI生成分享卡片数据
      const response = await callDeepSeekAPI(
        [{ role: 'user', content: fullPrompt }],
        null,
        {
          temperature: 0.7,
          max_tokens: 1000,
          response_format: { type: 'json_object' },
          timeout: 30000
        }
      );

      // 解析返回的JSON
      const rawContent = String(response.content || '').trim();
      let jsonText = rawContent;

      // 移除可能的代码块包装
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```[a-zA-Z]*\s*/i, '').replace(/```$/, '').trim();
      }

      // 提取JSON部分
      const firstBrace = jsonText.indexOf('{');
      const lastBrace = jsonText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        jsonText = jsonText.slice(firstBrace, lastBrace + 1);
      }

      const shareCardData = JSON.parse(jsonText);

      // 验证数据结构
      if (!shareCardData.ideaTitle || !shareCardData.tags || !shareCardData.scores) {
        throw new Error('生成的分享卡片数据格式不正确');
      }

      // 确保评分在合理范围内
      shareCardData.scores.feasibility = Math.max(0, Math.min(100, shareCardData.scores.feasibility || 75));
      shareCardData.scores.innovation = Math.max(0, Math.min(100, shareCardData.scores.innovation || 75));
      shareCardData.scores.marketPotential = Math.max(0, Math.min(100, shareCardData.scores.marketPotential || 75));

      return shareCardData;
    } catch (error) {
      console.error('Generate share card error:', error);

      // 如果AI生成失败，返回默认数据
      return {
        ideaTitle: '创意分析',
        tags: ['创新', '思维工具'],
        scores: {
          feasibility: 75,
          innovation: 75,
          marketPotential: 75
        },
        summary: '基于AI的深度思维分析'
      };
    }
  }
}

export default ShareUseCase;
