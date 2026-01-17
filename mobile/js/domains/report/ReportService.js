/**
 * ReportService - 前端报告管理服务
 *
 * 职责：
 * 1. 与后端/api/report接口通信
 * 2. 管理报告生成和状态
 * 3. 报告数据缓存
 */

import { apiClient } from '../core/api-client.js';

export class ReportService {
  constructor() {
    this.storageManager = null;
  }

  /**
   * 初始化Service
   * @param {Object} storageManager - 存储管理器
   */
  async init(storageManager) {
    this.storageManager = storageManager;
    console.log('[ReportService] 初始化完成');
  }

  /**
   * 生成报告
   * @param {string} conversationId - 对话ID
   * @param {Array} messages - 消息历史
   * @returns {Promise<Object>} 生成的报告和token统计
   */
  async generateReport(conversationId, messages) {
    try {
      const userId = this._getCurrentUserId();

      console.log('[ReportService] 开始生成报告', {
        conversationId,
        messageCount: messages.length
      });

      const response = await apiClient.post('/api/report/generate', {
        conversationId,
        userId,
        messages
      });

      if (response.code === 0) {
        const { report, tokens } = response.data;

        // 缓存报告到本地
        if (this.storageManager) {
          await this.storageManager.reportRepo.save(report);
        }

        console.log('[ReportService] 报告生成成功', {
          reportId: report.id,
          tokens
        });

        return { report, tokens };
      } else {
        throw new Error(response.error || '生成报告失败');
      }
    } catch (error) {
      console.error('[ReportService] 生成报告失败:', error);
      throw error;
    }
  }

  /**
   * 获取报告详情
   * @param {string} reportId - 报告ID
   * @returns {Promise<Object>} 报告详情
   */
  async getReport(reportId) {
    try {
      const response = await apiClient.get(`/api/report/${reportId}`);

      if (response.code === 0) {
        const report = response.data;

        // 更新本地缓存
        if (this.storageManager) {
          await this.storageManager.reportRepo.save(report);
        }

        return report;
      } else {
        throw new Error(response.error || '获取报告失败');
      }
    } catch (error) {
      console.error('[ReportService] 获取报告失败:', error);

      // 降级到本地缓存
      if (this.storageManager) {
        return await this.storageManager.reportRepo.get(reportId);
      }

      throw error;
    }
  }

  /**
   * 根据对话ID获取报告
   * @param {string} conversationId - 对话ID
   * @returns {Promise<Object|null>} 报告或null
   */
  async getReportByConversationId(conversationId) {
    try {
      const response = await apiClient.get(`/api/report/conversation/${conversationId}`);

      if (response.code === 0) {
        const report = response.data;

        // 更新本地缓存
        if (this.storageManager) {
          await this.storageManager.reportRepo.save(report);
        }

        return report;
      } else {
        if (response.error === '该对话暂无报告') {
          return null;
        }
        throw new Error(response.error || '获取报告失败');
      }
    } catch (error) {
      console.error('[ReportService] 根据对话ID获取报告失败:', error);

      // 降级到本地缓存
      if (this.storageManager) {
        const allReports = await this.storageManager.reportRepo.getAll();
        return allReports.find(r => r.conversationId === conversationId) || null;
      }

      throw error;
    }
  }

  /**
   * 获取用户的报告列表
   * @param {Object} options - 查询选项
   * @returns {Promise<Array>} 报告列表
   */
  async getUserReports(options = {}) {
    try {
      const userId = this._getCurrentUserId();

      const response = await apiClient.get(`/api/report/user/${userId}`, {
        params: options
      });

      if (response.code === 0) {
        const reports = response.data;

        // 更新本地缓存
        if (this.storageManager) {
          for (const report of reports) {
            await this.storageManager.reportRepo.save(report);
          }
        }

        console.log('[ReportService] 获取报告列表成功', reports.length);
        return reports;
      } else {
        throw new Error(response.error || '获取报告列表失败');
      }
    } catch (error) {
      console.error('[ReportService] 获取报告列表失败:', error);

      // 降级到本地缓存
      if (this.storageManager) {
        return await this.storageManager.reportRepo.getAll();
      }

      throw error;
    }
  }

  /**
   * 更新报告状态
   * @param {string} reportId - 报告ID
   * @param {string} status - 新状态 (draft/final/archived)
   * @returns {Promise<boolean>} 是否成功
   */
  async updateStatus(reportId, status) {
    try {
      const response = await apiClient.put(`/api/report/${reportId}/status`, {
        status
      });

      if (response.code === 0) {
        // 更新本地缓存
        if (this.storageManager) {
          const report = await this.storageManager.reportRepo.get(reportId);
          if (report) {
            report.status = status;
            await this.storageManager.reportRepo.save(report);
          }
        }

        console.log('[ReportService] 更新报告状态成功');
        return true;
      } else {
        throw new Error(response.error || '更新状态失败');
      }
    } catch (error) {
      console.error('[ReportService] 更新报告状态失败:', error);
      throw error;
    }
  }

  /**
   * 删除报告
   * @param {string} reportId - 报告ID
   * @returns {Promise<boolean>} 是否成功
   */
  async deleteReport(reportId) {
    try {
      const userId = this._getCurrentUserId();

      const response = await apiClient.delete(`/api/report/${reportId}`, {
        data: { userId }
      });

      if (response.code === 0) {
        // 删除本地缓存
        if (this.storageManager) {
          await this.storageManager.reportRepo.delete(reportId);
        }

        console.log('[ReportService] 删除报告成功');
        return true;
      } else {
        throw new Error(response.error || '删除报告失败');
      }
    } catch (error) {
      console.error('[ReportService] 删除报告失败:', error);
      throw error;
    }
  }

  /**
   * 重新生成报告
   * @param {string} reportId - 报告ID
   * @param {Array} messages - 新的消息历史
   * @returns {Promise<Object>} 更新后的报告和token统计
   */
  async regenerateReport(reportId, messages) {
    try {
      console.log('[ReportService] 开始重新生成报告', reportId);

      const response = await apiClient.post(`/api/report/${reportId}/regenerate`, {
        messages
      });

      if (response.code === 0) {
        const { report, tokens } = response.data;

        // 更新本地缓存
        if (this.storageManager) {
          await this.storageManager.reportRepo.save(report);
        }

        console.log('[ReportService] 报告重新生成成功', {
          reportId: report.id,
          version: report.version,
          tokens
        });

        return { report, tokens };
      } else {
        throw new Error(response.error || '重新生成报告失败');
      }
    } catch (error) {
      console.error('[ReportService] 重新生成报告失败:', error);
      throw error;
    }
  }

  /**
   * 获取报告统计信息
   * @returns {Promise<Object>} 统计信息
   */
  async getStats() {
    try {
      const response = await apiClient.get('/api/report/stats/summary');

      if (response.code === 0) {
        return response.data;
      } else {
        throw new Error(response.error || '获取统计信息失败');
      }
    } catch (error) {
      console.error('[ReportService] 获取统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 渲染报告到页面
   * @param {Object} reportData - 报告数据
   * @param {HTMLElement} container - 容器元素
   */
  renderReport(reportData, container) {
    if (!reportData || !container) {
      console.error('[ReportService] 渲染报告失败：参数无效');
      return;
    }

    try {
      // 清空容器
      container.innerHTML = '';

      // 创建报告HTML结构
      const reportHTML = this._buildReportHTML(reportData);
      container.innerHTML = reportHTML;

      console.log('[ReportService] 报告渲染成功');
    } catch (error) {
      console.error('[ReportService] 渲染报告失败:', error);
      container.innerHTML = '<div class="error">报告渲染失败</div>';
    }
  }

  /**
   * 构建报告HTML
   * @private
   * @param {Object} reportData - 报告数据
   * @returns {string} HTML字符串
   */
  _buildReportHTML(reportData) {
    const chapters = reportData.chapters || {};

    return `
      <div class="report-container">
        <header class="report-header">
          <h1>创意分析报告</h1>
          <div class="report-meta">
            <p><strong>核心定义：</strong>${reportData.coreDefinition || ''}</p>
            <p><strong>目标用户：</strong>${reportData.targetUser || ''}</p>
            <p><strong>核心痛点：</strong>${reportData.problem || ''}</p>
          </div>
        </header>

        ${Object.entries(chapters).map(([key, chapter]) => `
          <section class="report-chapter">
            <h2>${chapter.title || ''}</h2>
            ${this._renderChapterContent(key, chapter)}
          </section>
        `).join('')}
      </div>
    `;
  }

  /**
   * 渲染章节内容
   * @private
   * @param {string} chapterKey - 章节key
   * @param {Object} chapter - 章节数据
   * @returns {string} HTML字符串
   */
  _renderChapterContent(chapterKey, chapter) {
    // 根据不同章节渲染不同的内容结构
    // 这里简化处理，实际可以根据章节类型做更细致的渲染
    let content = '<div class="chapter-content">';

    for (const [key, value] of Object.entries(chapter)) {
      if (key === 'title') continue;

      if (Array.isArray(value)) {
        content += `<div class="section"><strong>${key}:</strong><ul>`;
        value.forEach(item => {
          if (typeof item === 'string') {
            content += `<li>${item}</li>`;
          } else if (typeof item === 'object') {
            content += `<li>${JSON.stringify(item)}</li>`;
          }
        });
        content += '</ul></div>';
      } else if (typeof value === 'object') {
        content += `<div class="section"><strong>${key}:</strong>`;
        content += `<pre>${JSON.stringify(value, null, 2)}</pre></div>`;
      } else {
        content += `<div class="section"><strong>${key}:</strong> ${value}</div>`;
      }
    }

    content += '</div>';
    return content;
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
export const reportService = new ReportService();

export default ReportService;
