/**
 * ShareService - 前端分享管理服务
 *
 * 职责：
 * 1. 与后端/api/share接口通信
 * 2. 创建和管理分享链接
 * 3. 处理分享URL和二维码
 */

import { apiClient } from '../core/api-client.js';

export class ShareService {
  constructor() {
    this.baseUrl = window.location.origin;
  }

  /**
   * 初始化Service
   */
  async init() {
    console.log('[ShareService] 初始化完成');
  }

  /**
   * 创建分享链接
   * @param {string} type - 分享类型 (report/business_plan/demo)
   * @param {Object} data - 分享数据
   * @param {string} title - 分享标题
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 分享信息 {shareId, shareUrl, expiresAt, qrCodeUrl}
   */
  async createShare(type, data, title, options = {}) {
    try {
      const userId = this._getCurrentUserId();

      console.log('[ShareService] 创建分享链接', { type, title });

      const response = await apiClient.post('/api/share/create', {
        userId,
        type,
        data,
        title,
        options
      });

      if (response.code === 0) {
        const shareInfo = response.data;

        console.log('[ShareService] 分享链接创建成功', shareInfo.shareId);
        return shareInfo;
      } else {
        throw new Error(response.error || '创建分享链接失败');
      }
    } catch (error) {
      console.error('[ShareService] 创建分享链接失败:', error);
      throw error;
    }
  }

  /**
   * 获取分享内容
   * @param {string} shareId - 分享ID
   * @returns {Promise<Object>} 分享内容
   */
  async getShare(shareId) {
    try {
      const response = await apiClient.get(`/api/share/${shareId}`);

      if (response.code === 0) {
        return response.data;
      } else {
        throw new Error(response.error || '获取分享内容失败');
      }
    } catch (error) {
      console.error('[ShareService] 获取分享内容失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户的分享列表
   * @param {Object} options - 查询选项
   * @returns {Promise<Array>} 分享列表
   */
  async getUserShares(options = {}) {
    try {
      const userId = this._getCurrentUserId();

      const response = await apiClient.get(`/api/share/user/${userId}`, {
        params: options
      });

      if (response.code === 0) {
        console.log('[ShareService] 获取分享列表成功', response.data.length);
        return response.data;
      } else {
        throw new Error(response.error || '获取分享列表失败');
      }
    } catch (error) {
      console.error('[ShareService] 获取分享列表失败:', error);
      throw error;
    }
  }

  /**
   * 删除分享链接
   * @param {string} shareId - 分享ID
   * @returns {Promise<boolean>} 是否成功
   */
  async deleteShare(shareId) {
    try {
      const userId = this._getCurrentUserId();

      const response = await apiClient.delete(`/api/share/${shareId}`, {
        data: { userId }
      });

      if (response.code === 0) {
        console.log('[ShareService] 删除分享链接成功');
        return true;
      } else {
        throw new Error(response.error || '删除分享链接失败');
      }
    } catch (error) {
      console.error('[ShareService] 删除分享链接失败:', error);
      throw error;
    }
  }

  /**
   * 获取二维码URL
   * @param {string} shareId - 分享ID
   * @returns {string} 二维码URL
   */
  getQRCodeUrl(shareId) {
    const apiUrl = localStorage.getItem('thinkcraft_api_url') || 'http://localhost:3000';
    return `${apiUrl}/api/share/qrcode/${shareId}`;
  }

  /**
   * 复制分享链接到剪贴板
   * @param {string} shareUrl - 分享URL
   * @returns {Promise<boolean>} 是否成功
   */
  async copyShareLink(shareUrl) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        console.log('[ShareService] 链接已复制到剪贴板');
        return true;
      } else {
        // 降级方案
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);

        if (success) {
          console.log('[ShareService] 链接已复制到剪贴板（降级方案）');
          return true;
        } else {
          throw new Error('复制失败');
        }
      }
    } catch (error) {
      console.error('[ShareService] 复制链接失败:', error);
      return false;
    }
  }

  /**
   * 打开分享弹窗
   * @param {Object} shareInfo - 分享信息
   */
  openShareModal(shareInfo) {
    try {
      const { shareUrl, qrCodeUrl } = shareInfo;

      // 创建分享弹窗HTML
      const modalHTML = `
        <div class="share-modal-overlay" id="shareModalOverlay">
          <div class="share-modal">
            <div class="share-modal-header">
              <h3>分享链接</h3>
              <button class="close-btn" onclick="document.getElementById('shareModalOverlay').remove()">×</button>
            </div>
            <div class="share-modal-body">
              <div class="share-url-section">
                <input
                  type="text"
                  class="share-url-input"
                  value="${shareUrl}"
                  readonly
                  onclick="this.select()"
                />
                <button class="copy-btn" onclick="window.shareService.copyShareLink('${shareUrl}').then(() => alert('链接已复制'))">
                  复制链接
                </button>
              </div>
              <div class="share-qrcode-section">
                <p>扫描二维码访问</p>
                <img src="${qrCodeUrl}" alt="二维码" class="share-qrcode" />
              </div>
            </div>
          </div>
        </div>
      `;

      // 添加到页面
      document.body.insertAdjacentHTML('beforeend', modalHTML);

      // 添加点击遮罩关闭
      document.getElementById('shareModalOverlay').addEventListener('click', (e) => {
        if (e.target.id === 'shareModalOverlay') {
          e.target.remove();
        }
      });

      console.log('[ShareService] 分享弹窗已打开');
    } catch (error) {
      console.error('[ShareService] 打开分享弹窗失败:', error);
    }
  }

  /**
   * 使用Web Share API分享（移动端）
   * @param {Object} shareData - 分享数据
   * @returns {Promise<boolean>} 是否成功
   */
  async nativeShare(shareData) {
    try {
      if (navigator.share) {
        await navigator.share({
          title: shareData.title || '来自ThinkCraft的分享',
          text: shareData.text || '查看这个创意分析报告',
          url: shareData.url
        });

        console.log('[ShareService] 原生分享成功');
        return true;
      } else {
        console.log('[ShareService] 不支持Web Share API');
        return false;
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('[ShareService] 原生分享失败:', error);
      }
      return false;
    }
  }

  /**
   * 分享报告
   * @param {Object} report - 报告对象
   * @returns {Promise<Object>} 分享信息
   */
  async shareReport(report) {
    try {
      const shareInfo = await this.createShare(
        'report',
        report.reportData,
        `创意分析报告 - ${report.reportData?.coreDefinition || '未命名'}`
      );

      // 先尝试原生分享（移动端）
      const nativeShareSuccess = await this.nativeShare({
        title: `创意分析报告 - ${report.reportData?.coreDefinition || '未命名'}`,
        text: '查看这个创意分析报告',
        url: shareInfo.shareUrl
      });

      // 如果原生分享失败，打开分享弹窗
      if (!nativeShareSuccess) {
        this.openShareModal(shareInfo);
      }

      return shareInfo;
    } catch (error) {
      console.error('[ShareService] 分享报告失败:', error);
      throw error;
    }
  }

  /**
   * 获取分享统计
   * @returns {Promise<Object>} 统计信息
   */
  async getStats() {
    try {
      const response = await apiClient.get('/api/share/stats/summary');

      if (response.code === 0) {
        return response.data;
      } else {
        throw new Error(response.error || '获取统计信息失败');
      }
    } catch (error) {
      console.error('[ShareService] 获取统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取当前用户ID
   * @private
   * @returns {string} 用户ID
   */
  _getCurrentUserId() {
    const username = localStorage.getItem('thinkcraft_username') || 'default_user';
    return `user_${username}`;
  }
}

// 创建单例实例
export const shareService = new ShareService();

// 暴露到全局（供HTML内联事件使用）
window.shareService = shareService;

export default ShareService;
