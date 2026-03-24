/**
 * 报告生成器模块
 * 负责生成各类分析报告
 *
 * @module ReportGenerator
 * @description 处理报告的生成、缓存和预取功能
 *
 * @requires state - 全局状态管理器
 * @requires apiClient - API客户端
 * @requires storageManager - 存储管理器
 * @requires reportViewer - 报告查看器
 */

/* eslint-disable no-unused-vars, no-undef */
/* global normalizeChatId */

// 创建日志实例
var logger = window.createLogger ? window.createLogger('ReportGenerator') : console;

class ReportGenerator {
  constructor() {
    this.state = window.state;
    this.currentController = null; // 用于跟踪当前的请求控制器
    this.isGenerating = false; // 防止重复请求
  }

  async ensureChatAnalysisPersisted(chatId) {
    if (!chatId || !window.apiClient?.put || !window.apiClient?.get) {
      return;
    }

    const normalizedChatId = String(chatId).trim();
    const payload = {
      analysisCompleted: true,
      reportState: {
        analysis: {
          status: 'completed',
          progress: { current: 1, total: 1, percentage: 100 },
          updatedAt: Date.now(),
          source: 'report-generator'
        }
      }
    };

    const maxAttempts = 2;
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await window.apiClient.put(`/api/chat/${normalizedChatId}`, payload);
        const verify = await window.apiClient.get(`/api/chat/${normalizedChatId}`);
        const chat = verify?.data || null;
        const status = String(chat?.reportState?.analysis?.status || '').toLowerCase();
        const persisted =
          chat?.analysisCompleted === true &&
          (status === 'completed' ||
            status === 'success' ||
            status === 'done' ||
            status === 'finished');
        if (persisted) {
          return;
        }
        lastError = new Error('会话分析状态未持久化');
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('会话分析状态入库失败');
  }

  async persistAnalysisReport(reportData, status = 'completed') {
    if (!reportData) {
      return;
    }
    const chatId = normalizeChatId(this.state.currentChat);
    if (!chatId) {
      return;
    }
    const progress =
      status === 'completed'
        ? { current: 1, total: 1, percentage: 100 }
        : { current: 0, total: 1, percentage: 0 };
    await window.chatReportBundle?.persistReport?.(
      chatId,
      'analysis',
      {
        data: reportData,
        status,
        progress,
        startTime: Date.now(),
        endTime: status === 'completed' ? Date.now() : null,
        error: null
      },
      {
        setActive: true,
        reportKey: this.getAnalysisReportKey()
      }
    );
  }

  /**
   * 预取分析报告（后台静默获取）
   *
   * @async
   * @returns {Promise<void>}
   *
   * @description
   * 在后台静默获取报告，不显示UI。用于提前缓存报告数据。
   * 如果报告已存在或消息不足，则跳过。
   */
  async prefetchAnalysisReport() {
    try {
      if (
        window.lastGeneratedReport &&
        window.lastGeneratedReport.chapters &&
        window.lastGeneratedReportKey === this.getAnalysisReportKey()
      ) {
        return;
      }
      // 严格验证 messages 数组
      if (
        !this.state.messages ||
        !Array.isArray(this.state.messages) ||
        this.state.messages.length < 2
      ) {
        return;
      }
      const apiBaseUrl = this.state.settings.apiUrl || window.location.origin;
      const apiClient =
        window.apiClient || (window.APIClient ? new window.APIClient(apiBaseUrl) : null);
      if (!apiClient) {
        return;
      }
      if (apiClient.setBaseURL) {
        apiClient.setBaseURL(apiBaseUrl);
      }
      window.apiClient = apiClient;

      const chatId = normalizeChatId(this.state.currentChat);
      const data = await apiClient.request('/api/report/generate', {
        method: 'POST',
        body: {
          messages: this.state.messages.map(m => ({
            role: m.role,
            content: m.content
          })),
          chatId,
          reportKey: this.getAnalysisReportKey(),
          force: false
        },
        timeout: 180000, // 增加到3分钟
        retry: 2 // 增加重试次数
      });

      if (data && data.code !== 0) {
        return;
      }

      const reportData = data?.data?.report;
      if (!reportData || !reportData.chapters) {
        return;
      }

      window.chatReportBundle?.setActiveReport?.(reportData, {
        chatId,
        type: 'analysis',
        reportKey: this.getAnalysisReportKey()
      });
      await this.persistAnalysisReport(reportData, 'completed');
      if (typeof updateShareLinkButtonVisibility === 'function') {
        updateShareLinkButtonVisibility();
      }
    } catch (error) {
      // 静默失败，不影响用户体验
      console.warn('Prefetch analysis report failed:', error.message);

      // 记录失败状态
      if (error.message.includes('timeout') || error.message.includes('超时')) {
        this.state.reportPrefetchFailed = true;
        this.state.reportPrefetchError = 'timeout';
      }
    }
  }

  /**
   * 从缓存获取分析报告
   *
   * @async
   * @returns {Promise<boolean>} 是否成功获取缓存报告
   *
   * @description
   * 尝试从后端缓存获取报告，如果成功则渲染显示。
   * 使用cacheOnly参数确保只获取缓存，不触发新生成。
   */
  async fetchCachedAnalysisReport() {
    try {
      if (!this.state.messages || this.state.messages.length < 2) {
        return false;
      }
      const apiBaseUrl = this.state.settings.apiUrl || window.location.origin;
      const apiClient =
        window.apiClient || (window.APIClient ? new window.APIClient(apiBaseUrl) : null);
      if (!apiClient) {
        return false;
      }
      if (apiClient.setBaseURL) {
        apiClient.setBaseURL(apiBaseUrl);
      }
      window.apiClient = apiClient;

      const chatId = normalizeChatId(this.state.currentChat);
      const data = await apiClient.request('/api/report/generate', {
        method: 'POST',
        body: {
          messages: this.state.messages.map(m => ({
            role: m.role,
            content: m.content
          })),
          chatId,
          reportKey: this.getAnalysisReportKey(),
          force: false,
          cacheOnly: true
        },
        timeout: 120000,
        retry: 0
      });

      if (data && data.code !== 0) {
        return false;
      }

      const reportData = data?.data?.report;
      if (!reportData || !reportData.chapters) {
        return false;
      }

      window.chatReportBundle?.setActiveReport?.(reportData, {
        chatId,
        type: 'analysis',
        reportKey: this.getAnalysisReportKey()
      });
      await this.persistAnalysisReport(reportData, 'completed');
      if (typeof updateShareLinkButtonVisibility === 'function') {
        updateShareLinkButtonVisibility();
      }
      if (window.reportViewer) {
        window.reportViewer.renderAIReport(reportData);
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取分析报告的唯一键
   *
   * @returns {string} 报告键（基于消息内容的哈希）
   *
   * @description
   * 生成基于当前对话消息的唯一键，用于缓存和去重。
   */
  getAnalysisReportKey() {
    if (!this.state.messages || this.state.messages.length === 0) {
      return '';
    }
    const content = this.state.messages.map(m => m.content).join('|');
    return this.simpleHash(content);
  }

  /**
   * 简单哈希函数
   *
   * @param {string} str - 要哈希的字符串
   * @returns {string} 哈希值
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 生成详细报告
   *
   * @async
   * @param {boolean} forceRegenerate - 是否强制重新生成
   * @returns {Promise<void>}
   *
   * @throws {Error} 当API调用失败时抛出错误
   *
   * @description
   * 生成完整的分析报告，包括验证、API调用、保存和渲染。
   * 支持强制重新生成选项。
   */
  async generateDetailedReport(forceRegenerate = false) {
    if (!this.state.currentChat) {
      alert('请先开始一个对话');
      return;
    }

    // 严格验证 messages 数组
    if (
      !this.state.messages ||
      !Array.isArray(this.state.messages) ||
      this.state.messages.length === 0
    ) {
      alert('对话内容为空，无法生成报告');
      return;
    }

    // 防止重复请求
    if (this.isGenerating) {
      console.warn('[生成报告] 已有报告正在生成中，跳过重复请求');
      return;
    }

    const reportContent = document.getElementById('reportContent');
    reportContent.innerHTML =
      '<div style="text-align: center; padding: 60px 20px;"><div class="loading-spinner"></div><div style="margin-top: 20px;">正在生成报告...</div></div>';

    const chatId = normalizeChatId(this.state.currentChat);

    // 验证对话消息
    if (!this.state.messages || this.state.messages.length === 0) {
      console.error('[生成报告] 对话消息为空');
      reportContent.innerHTML = `
                <div style="text-align: center; padding: 60px 20px;">
                    <div style="font-size: 48px; margin-bottom: 20px;">💬</div>
                    <div style="font-size: 18px; color: #666; margin-bottom: 10px;">暂无对话内容</div>
                    <div style="font-size: 14px; color: #999;">请先与AI进行对话，然后再生成报告</div>
                </div>
            `;
      this.isGenerating = false;
      return;
    }

    // 取消之前的请求（如果存在）
    if (this.currentController) {
      this.currentController.abort('replaced_by_new_request');
      this.currentController = null;
    }

    this.isGenerating = true;
    let timeoutId = null;

    try {
      // 开始生成流程 - 更新StateManager状态
      // 分析报告是单个整体，设置 total=1 表示1个任务
      if (window.stateManager) {
        window.stateManager.startGeneration(chatId, 'analysis', ['full-report']);
      }

      // 使用更稳妥的超时控制：10分钟，并确保仅中断本次请求
      const REPORT_TIMEOUT_MS = 10 * 60 * 1000;
      const currentRequestController = new AbortController();
      this.currentController = currentRequestController;
      timeoutId = setTimeout(() => {
        currentRequestController.abort('report_generation_timeout');
      }, REPORT_TIMEOUT_MS);

      if (window.requireAuth) {
        const ok = await window.requireAuth({ redirect: true, prompt: true });
        if (!ok) {
          throw new Error('未提供访问令牌');
        }
      }
      const authToken = window.getAuthToken ? window.getAuthToken() : null;
      const response = await fetch(`${this.state.settings.apiUrl}/api/report/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({
          messages: this.state.messages.map(m => ({
            role: m.role,
            content: m.content
          })),
          chatId,
          reportKey: this.getAnalysisReportKey(),
          force: forceRegenerate || false
        }),
        signal: currentRequestController.signal
      });
      clearTimeout(timeoutId);
      timeoutId = null;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `API错误: ${response.status}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (data.code !== 0) {
        throw new Error(data.error || '生成报告失败');
      }

      // 🔧 修复：提取实际的报告对象
      // 后端返回 {code: 0, data: {report: {...}, cached: false}}
      // 需要提取 data.data.report 作为实际报告数据
      const responseData = data.data;
      const report = responseData.report || responseData; // 兼容旧格式
      window.chatReportBundle?.setActiveReport?.(report, {
        chatId,
        type: 'analysis',
        reportKey: this.getAnalysisReportKey()
      });

      // 保存到数据库
      await this.persistAnalysisReport(report, 'completed');
      await this.ensureChatAnalysisPersisted(chatId);

      // 完成生成流程 - 更新StateManager状态
      if (window.stateManager) {
        // 先更新进度为 1/1 (100%)
        window.stateManager.updateProgress(chatId, 'analysis', 'AI分析师', 1, report);
        window.stateManager.completeGeneration(chatId, 'analysis', report);
      }
      this.state.analysisCompleted = true;
      if (window.stateManager?.setAnalysisCompleted) {
        window.stateManager.setAnalysisCompleted(chatId, true);
      }

      // 渲染报告
      if (window.reportViewer) {
        window.reportViewer.renderAIReport(report);
      }

      // 重置生成状态
      this.isGenerating = false;
    } catch (error) {
      console.error('[生成报告] 失败:', error);

      // 重置生成状态
      this.isGenerating = false;

      // 生成失败 - 更新StateManager状态
      if (window.stateManager) {
        window.stateManager.errorGeneration(chatId, 'analysis', error);
      }

      window.chatReportBundle?.clearActiveReport?.({
        chatId,
        type: 'analysis'
      });
      window.chatReportBundle
        ?.persistReport?.(
          chatId,
          'analysis',
          {
            data: null,
            status: 'error',
            progress: { current: 0, total: 1, percentage: 0 },
            startTime: Date.now(),
            endTime: Date.now(),
            error: {
              message: error?.message || '报告生成失败',
              timestamp: Date.now()
            }
          },
          {
            setActive: false
          }
        )
        .catch(() => {});

      let errorMessage = error.message;
      let actionButton =
        '<button class="btn-primary" onclick="generateDetailedReport(true)">重试</button>';

      // 根据错误类型提供不同的建议
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        errorMessage = '报告生成超时（超过10分钟）';
        actionButton = `
                    <div style="display: flex; gap: 12px; justify-content: center;">
                        <button class="btn-secondary" onclick="closeReport()">关闭</button>
                        <button class="btn-primary" onclick="generateDetailedReport(true)">重试</button>
                    </div>
                `;
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = '无法连接到后端服务，请确认后端服务已启动';
      } else if (error.message.includes('数据格式')) {
        errorMessage = '后端返回的数据格式不正确，请检查后端服务是否正常运行';
      } else if (error.message.includes('API错误')) {
        errorMessage = '后端服务连接失败，请确认后端服务已启动';
      }

      reportContent.innerHTML = `
                <div style="text-align: center; padding: 60px 20px;">
                    <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                    <div style="font-size: 18px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px;">
                        报告生成失败
                    </div>
                    <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 20px;">
                        ${errorMessage}
                    </div>
                    ${actionButton}
                </div>
            `;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      this.currentController = null;
    }
  }

  /**
   * 重新生成报告
   *
   * @async
   * @returns {Promise<void>}
   *
   * @description
   * 清除现有报告缓存并重新生成。
   * 会提示用户确认操作。
   */
  async regenerateInsightsReport() {
    if (
      !confirm(
        '确定要重新生成分析报告吗？\n\n这将使用AI重新分析您的创意对话，可能会生成不同的洞察内容。'
      )
    ) {
      return;
    }

    const chatId = normalizeChatId(this.state.currentChat);

    window.chatReportBundle?.clearActiveReport?.({
      chatId,
      type: 'analysis'
    });
    window.analysisReportGenerationInFlight = false;

    // 重置StateManager状态
    if (window.stateManager) {
      window.stateManager.resetGeneration(chatId, 'analysis', false);
    }

    if (this.state.currentChat) {
      try {
        await window.chatReportBundle?.persistReport?.(
          chatId,
          'analysis',
          {
            data: null,
            status: 'generating',
            progress: { current: 0, total: 1, percentage: 0 },
            startTime: Date.now(),
            endTime: null,
            error: null
          },
          {
            setActive: false
          }
        );
      } catch (error) {
        console.error('[重新生成] 保存状态失败:', error);
      }
    }

    await this.generateDetailedReport(true);
  }

  /**
   * 导出完整报告为PDF
   *
   * @async
   * @returns {Promise<void>}
   *
   * @throws {Error} 当PDF生成失败时抛出错误
   *
   * @description
   * 将当前报告导出为PDF文件。
   * 如果报告未生成，会先生成报告。
   */
  async exportFullReport() {
    try {
      const chatId = normalizeChatId(this.state.currentChat);

      // 使用ExportValidator验证
      const validation = await window.exportValidator.validateExport('analysis', chatId);

      if (!validation.valid) {
        // 根据action显示不同提示
        if (validation.action === 'wait') {
          window.toast.warning(`${validation.error}\n${validation.detail}`, 5000);
        } else if (validation.action === 'generate') {
          window.toast.error(validation.error, 4000);
        } else if (validation.action === 'regenerate') {
          window.toast.error(`${validation.error}\n${validation.detail}`, 4000);
        } else {
          window.toast.error(validation.error, 3000);
        }
        return;
      }

      // 验证通过，开始导出
      window.toast.info('📄 正在生成PDF，请稍候...', 2000);

      // 调用后端API
      if (window.requireAuth) {
        const ok = await window.requireAuth({ redirect: true, prompt: true });
        if (!ok) {
          return;
        }
      }
      const authToken = window.getAuthToken ? window.getAuthToken() : null;
      let exportData = validation.data;
      if (exportData && exportData.report && !exportData.chapters) {
        exportData = exportData.report;
      }
      if (exportData && Array.isArray(exportData.chapters)) {
        const chaptersObj = {};
        exportData.chapters.forEach((ch, idx) => {
          chaptersObj[`chapter${idx + 1}`] = ch;
        });
        exportData.chapters = chaptersObj;
      }

      const response = await fetch(`${this.state.settings.apiUrl}/api/pdf-export/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({
          reportData: exportData,
          ideaTitle: this.state.userData.idea || '创意分析报告'
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('未授权，请重新登录');
        }
        throw new Error('PDF生成失败');
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'PDF生成失败');
      }

      // 下载PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `ThinkCraft_分析报告_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      window.toast.success('✅ PDF导出成功！', 3000);
    } catch (error) {
      console.error('[导出PDF] 失败:', error);
      window.toast.error(`导出失败: ${error.message}`, 4000);
    }
  }

  /**
   * 验证报告数据格式
   * @param {Object} report - 报告对象
   * @returns {boolean} 是否有效
   */
  validateReportData(report) {
    if (!report) {
      console.error('[数据验证] 报告数据为空');
      return false;
    }

    const type = report.type;
    const status = report.status;

    // 🔧 对于 generating 状态，允许 data 为 null 或空
    // 生成中的报告，data 可能为 null 或空，这是正常的
    if (status === 'generating') {
      logger.debug('[数据验证] 生成中的报告，允许 data 为空', { type, status });
      return true;
    }

    // 🔧 对于 completed 状态，必须有完整数据
    if (status === 'completed') {
      // 🔧 分析报告：只要有 data 对象就认为有效（兼容旧数据和不同的数据结构）
      if (type === 'analysis') {
        if (!report.data) {
          console.error('[数据验证] 已完成的分析报告缺少 data 字段', report);
          return false;
        }
        // 如果有 chapters 字段，验证其格式
        if (report.data.chapters !== undefined) {
          const chapters = report.data.chapters;
          const isArray = Array.isArray(chapters);
          const isObject = !isArray && chapters && typeof chapters === 'object';
          if ((isArray && chapters.length === 0) || (!isArray && !isObject)) {
            console.warn('[数据验证] 分析报告 chapters 格式异常，但仍然接受', report);
          }
        }
        logger.debug('[数据验证] 分析报告数据有效', { type, status, hasData: true });
        return true;
      }

      // 商业计划书/立项材料必须有 document 或 chapters
      if (type === 'business' || type === 'proposal') {
        if (!report.data || (!report.data.document && !report.data.chapters)) {
          console.warn(
            '[数据验证] 已完成的报告缺少 document 或 chapters 字段，标记为 error',
            report
          );
          report.status = 'error';
          report.endTime = Date.now();
          report.error = {
            message: '报告数据缺失，请重新生成',
            timestamp: Date.now()
          };
          window.storageManager
            ?.saveReport({
              id: report.id,
              type: report.type,
              chatId: report.chatId,
              data: report.data ?? null,
              status: report.status,
              progress: report.progress,
              selectedChapters: report.selectedChapters,
              startTime: report.startTime,
              endTime: report.endTime,
              error: report.error
            })
            .catch(() => {});
          return true;
        }
      }
    }

    // 🔧 其他状态（idle、error）不需要验证数据
    logger.debug('[数据验证] 报告数据有效', { type, status, hasData: Boolean(report.data) });
    return true;
  }

  /**
   * 清理 IndexedDB 中的重复报告记录
   * @param {string} chatId - 会话ID
   * @param {Object} deduplicatedReports - 去重后的报告对象 {type: report}
   */
  async cleanupDuplicateReports(chatId, deduplicatedReports) {
    try {
      if (!window.storageManager) return;

      const normalizedChatId = normalizeChatId(chatId);
      const allReports = await window.storageManager.getReportsByChatId(normalizedChatId);

      // 找出需要保留的报告ID
      const keepIds = new Set(Object.values(deduplicatedReports).map(r => r.id));

      // 删除重复的报告
      const deletePromises = [];
      allReports.forEach(report => {
        if (!keepIds.has(report.id)) {
          logger.debug('[清理重复] 删除重复报告', {
            id: report.id,
            type: report.type,
            status: report.status
          });
          deletePromises.push(
            window.storageManager.deleteReport(report.id).catch(err => {
              console.error('[清理重复] 删除失败', err);
            })
          );
        }
      });

      if (deletePromises.length > 0) {
        await Promise.all(deletePromises);
        logger.debug('[清理重复] 清理完成', {
          deletedCount: deletePromises.length
        });
      }
    } catch (error) {
      console.error('[清理重复] 清理失败', error);
    }
  }

  /**
   * 加载对话的生成状态
   *
   * @async
   * @param {string} chatId - 对话ID
   * @returns {Promise<void>}
   *
   * @description
   * 从存储中加载指定对话的报告生成状态，并更新UI。
   * 处理超时检测和状态同步。
   */
  async loadGenerationStatesForChat(chatId) {
    try {
      const normalizedChatId = normalizeChatId(chatId);

      // 🔍 记录开始时间
      const startTime = Date.now();
      logger.debug('[状态恢复] 开始加载', {
        chatId: normalizedChatId,
        timestamp: startTime
      });

      if (typeof logStateChange === 'function') {
        logStateChange('加载生成状态', { chatId: normalizedChatId });
      }

      if (!normalizedChatId) {
        logger.debug('[加载状态] 无chatId，重置按钮');
        if (typeof resetGenerationButtons === 'function') {
          resetGenerationButtons();
        }
        return;
      }

      // 🔍 记录DOM状态
      const businessBtn = document.getElementById('businessPlanBtn');
      const proposalBtn = document.getElementById('proposalBtn');
      logger.debug('[状态恢复] DOM按钮状态', {
        businessBtn: businessBtn
          ? {
              classList: Array.from(businessBtn.classList),
              dataStatus: businessBtn.dataset.status
            }
          : 'not found',
        proposalBtn: proposalBtn
          ? {
              classList: Array.from(proposalBtn.classList),
              dataStatus: proposalBtn.dataset.status
            }
          : 'not found'
      });

      // 🔧 不要立即重置按钮，先检查是否有生成中的报告
      // 如果有生成中的报告，保持按钮状态不变
      // 只在确认没有任何生成中的报告时才重置

      // 2. 清理旧会话的UI状态
      document.querySelectorAll('.generation-btn').forEach(btn => {
        const btnChatId = btn.dataset.chatId;
        // 只清理不属于当前会话的按钮
        if (btnChatId && btnChatId !== normalizedChatId) {
          btn.removeAttribute('data-chat-id');
          btn.removeAttribute('data-status');
        }
      });

      // 3. 从StateManager获取当前会话的内存状态
      const memoryStates = {};
      if (window.stateManager?.getGenerationState) {
        const genState = window.stateManager.getGenerationState(normalizedChatId);
        logger.debug('[状态恢复] StateManager状态', genState);

        if (genState) {
          ['business', 'proposal', 'analysis'].forEach(type => {
            const gen = genState[type];
            if (gen && gen.status === 'generating') {
              memoryStates[type] = {
                status: 'generating',
                progress: gen.progress,
                selectedChapters: gen.selectedChapters,
                chatId: normalizedChatId
              };
              logger.debug(`[状态恢复] 内存中有${type}生成状态`, memoryStates[type]);
            }
          });
        }
      }

      // 4. 从IndexedDB获取持久化的报告
      const allReports = await window.storageManager?.getReportsByChatId(normalizedChatId);
      logger.debug('[状态恢复] IndexedDB报告', {
        count: allReports?.length || 0,
        reports: allReports?.map(r => ({
          type: r.type,
          status: r.status,
          chatId: r.chatId,
          progress: r.progress
        }))
      });

      // 验证报告是否属于当前会话
      const reports = (allReports || []).filter(report => {
        const reportChatId = normalizeChatId(report.chatId);
        if (reportChatId !== normalizedChatId) {
          console.warn(`[加载状态] 过滤掉不匹配的报告:`, {
            reportChatId,
            currentChatId: normalizedChatId,
            reportType: report.type
          });
          return false;
        }
        return true;
      });

      logger.debug('[加载状态] 验证后的报告:', reports);

      // 5. 获取当前会话的报告对象
      const currentReports =
        typeof getReportsForChat === 'function' ? getReportsForChat(normalizedChatId) : {};

      // 6. 合并状态并更新UI
      const GENERATION_TIMEOUT_MS = 30 * 60 * 1000; // 🔧 增加超时时间到30分钟
      const processedTypes = new Set();

      // 🔧 去重：优先保留 completed，除非有更新的 generating 任务
      const deduplicatedReports = {};
      reports.forEach(report => {
        const type = report.type;
        if (!deduplicatedReports[type]) {
          deduplicatedReports[type] = report;
          return;
        }

        const existing = deduplicatedReports[type];
        const existingStart = existing.startTime || 0;
        const reportStart = report.startTime || 0;
        const existingEnd = existing.endTime || 0;
        const reportEnd = report.endTime || 0;

        // completed 优先，除非 generating 更“新”且确实是新的任务
        if (existing.status === 'completed' && report.status === 'generating') {
          if (reportStart > (existingEnd || existingStart)) {
            deduplicatedReports[type] = report;
          }
          return;
        }
        if (existing.status === 'generating' && report.status === 'completed') {
          if (existingStart <= (reportEnd || reportStart)) {
            deduplicatedReports[type] = report;
          }
          return;
        }

        // 同状态，保留最新的
        if (report.status === existing.status) {
          if (reportStart > existingStart) {
            deduplicatedReports[type] = report;
          }
          return;
        }

        // 其他情况：completed > generating > error > pending
        const rank = status => {
          if (status === 'completed') return 3;
          if (status === 'generating') return 2;
          if (status === 'error') return 1;
          return 0;
        };
        if (rank(report.status) > rank(existing.status)) {
          deduplicatedReports[type] = report;
        }
      });

      // 先处理去重后的报告
      Object.values(deduplicatedReports).forEach(report => {
        const type = report.type;
        logger.debug('[加载状态] 处理报告:', {
          type,
          status: report.status,
          chatId: report.chatId
        });
        if (type !== 'business' && type !== 'proposal' && type !== 'analysis') {
          logger.debug('[加载状态] 跳过非报告类型:', type);
          return;
        }

        // 🔧 修复历史数据：已有内容但状态为空/idle，自动标记为 completed
        if ((!report.status || report.status === 'idle') && report.data) {
          const hasDocument =
            typeof report.data.document === 'string' && report.data.document.trim().length > 0;
          const hasChapters =
            Array.isArray(report.data.chapters) && report.data.chapters.length > 0;
          if (hasDocument || hasChapters) {
            report.status = 'completed';
            report.endTime = Date.now();
            const totalCount = Array.isArray(report.selectedChapters)
              ? report.selectedChapters.length
              : hasChapters
                ? report.data.chapters.length
                : 0;
            report.progress = {
              current: totalCount,
              total: totalCount,
              percentage: totalCount > 0 ? 100 : 0
            };
            window.storageManager
              ?.saveReport({
                id: report.id,
                type: report.type,
                chatId: report.chatId,
                data: report.data,
                status: report.status,
                progress: report.progress,
                selectedChapters: report.selectedChapters,
                startTime: report.startTime,
                endTime: report.endTime,
                error: report.error ?? null
              })
              .catch(() => {});
          }
        }

        // ✅ 添加数据验证
        if (!this.validateReportData(report)) {
          console.warn('[加载状态] 跳过无效报告数据', {
            type: report.type,
            status: report.status,
            hasData: Boolean(report.data),
            dataKeys: report.data ? Object.keys(report.data) : []
          });
          // 🔧 数据无效时，不要重置所有按钮，只跳过这个报告
          // 避免影响其他正在生成的报告
          return;
        }

        // 🔧 修复缺失的 selectedChapters（历史数据可能只有 chapters）
        if (
          report.status === 'generating' &&
          (!Array.isArray(report.selectedChapters) || report.selectedChapters.length === 0)
        ) {
          if (Array.isArray(report.data?.chapters) && report.data.chapters.length > 0) {
            report.selectedChapters = report.data.chapters
              .map(ch => ch?.chapterId || ch?.id)
              .filter(Boolean);
            if (report.selectedChapters.length > 0) {
              window.storageManager
                ?.saveReport({
                  id: report.id,
                  type: report.type,
                  chatId: report.chatId,
                  data: report.data,
                  status: report.status,
                  progress: report.progress,
                  selectedChapters: report.selectedChapters,
                  startTime: report.startTime,
                  endTime: report.endTime,
                  error: report.error
                })
                .catch(() => {});
            }
          }
        }

        // 🔧 生成中但缺少开始时间，视为异常，避免永久卡住
        if (
          report.status === 'generating' &&
          (!report.startTime || Number.isNaN(Number(report.startTime)))
        ) {
          report.status = 'error';
          report.endTime = Date.now();
          report.error = {
            message: '生成状态异常，请重试',
            timestamp: Date.now()
          };
          window.storageManager
            ?.saveReport({
              id: report.id,
              type: report.type,
              chatId: report.chatId,
              data: report.data ?? null,
              status: report.status,
              progress: report.progress,
              selectedChapters: report.selectedChapters,
              startTime: report.startTime,
              endTime: report.endTime,
              error: report.error
            })
            .catch(() => {});
        }

        // 🔧 检查是否所有章节都已完成但状态还是 'generating'
        if (report.status === 'generating' && report.data?.chapters && report.selectedChapters) {
          const completedCount = report.data.chapters.length;
          const totalCount = report.selectedChapters.length;
          if (completedCount === totalCount && completedCount > 0) {
            logger.debug('[加载状态] 所有章节已完成，自动更新状态为 completed');
            report.status = 'completed';
            report.endTime = Date.now();
            report.progress = {
              ...report.progress,
              current: totalCount,
              total: totalCount,
              percentage: 100
            };
            // 异步保存更新后的状态
            window.storageManager
              ?.saveReport({
                id: report.id,
                type: report.type,
                chatId: report.chatId,
                data: report.data,
                status: report.status,
                progress: report.progress,
                selectedChapters: report.selectedChapters,
                startTime: report.startTime,
                endTime: report.endTime,
                error: null
              })
              .catch(() => {});
          }
        }

        // 检查超时
        if (report.status === 'generating' && report.startTime) {
          const elapsed = Date.now() - report.startTime;
          if (elapsed > GENERATION_TIMEOUT_MS) {
            report.status = 'error';
            report.error = {
              message: '生成超时，请重试',
              timestamp: Date.now()
            };
            // 异步保存错误状态
            window.storageManager
              ?.saveReport({
                id: report.id,
                type: report.type,
                chatId: report.chatId,
                data: report.data ?? null,
                status: report.status,
                progress: report.progress,
                selectedChapters: report.selectedChapters,
                startTime: report.startTime,
                endTime: Date.now(),
                error: report.error
              })
              .catch(() => {});
          }
        }

        // 优先使用内存中的 generating 状态（仅当持久化状态不是 completed）
        if (memoryStates[type]?.status === 'generating' && report.status !== 'completed') {
          currentReports[type] = memoryStates[type];
          // ✅ 使用统一的按钮更新方法
          if (window.businessPlanGenerator) {
            window.businessPlanGenerator.updateButtonUI(type, 'generating');
          }
        } else {
          currentReports[type] = {
            data: report.data,
            chatId: report.chatId,
            status: report.status,
            progress: report.progress,
            selectedChapters: report.selectedChapters,
            error: report.error
          };
          // ✅ 使用统一的按钮更新方法
          if (window.businessPlanGenerator) {
            window.businessPlanGenerator.updateButtonUI(type, report.status || 'idle');
          }
        }

        processedTypes.add(type);
      });

      // 处理内存中有但IndexedDB中没有的generating状态
      Object.keys(memoryStates).forEach(type => {
        if (!processedTypes.has(type)) {
          currentReports[type] = memoryStates[type];
          // ✅ 使用统一的按钮更新方法
          if (window.businessPlanGenerator) {
            window.businessPlanGenerator.updateButtonUI(type, memoryStates[type].status || 'idle');
          }
          processedTypes.add(type);
        }
      });

      // 🔧 只重置那些没有找到报告的按钮类型
      ['business', 'proposal'].forEach(type => {
        if (!processedTypes.has(type)) {
          logger.debug(`[加载状态] ${type} 没有报告，重置按钮`);
          // ✅ 使用统一的按钮更新方法
          if (window.businessPlanGenerator) {
            window.businessPlanGenerator.updateButtonUI(type, 'idle');
          }
        }
      });

      // 🔧 强制同步：确保按钮状态与数据一致
      setTimeout(() => {
        logger.debug('[状态恢复] 执行强制同步验证');

        ['business', 'proposal'].forEach(type => {
          const btn = document.getElementById(
            type === 'business' ? 'businessPlanBtn' : 'proposalBtn'
          );
          if (!btn) return;

          const expectedStatus = currentReports[type]?.status || 'idle';
          const actualStatus = btn.dataset.status;

          if (expectedStatus !== actualStatus) {
            logger.warn('[状态恢复] 检测到状态不一致，强制更新', {
              type,
              expected: expectedStatus,
              actual: actualStatus
            });

            // ✅ 使用统一的按钮更新方法
            if (window.businessPlanGenerator) {
              window.businessPlanGenerator.updateButtonUI(type, expectedStatus);
            }
          }
        });
      }, 100); // 延迟100ms确保DOM完全更新

      // 🔍 记录完成时间和最终状态
      const endTime = Date.now();
      logger.debug('[状态恢复] 完成加载', {
        duration: endTime - startTime,
        finalButtonStates: {
          businessBtn: businessBtn
            ? {
                classList: Array.from(businessBtn.classList),
                dataStatus: businessBtn.dataset.status
              }
            : 'not found',
          proposalBtn: proposalBtn
            ? {
                classList: Array.from(proposalBtn.classList),
                dataStatus: proposalBtn.dataset.status
              }
            : 'not found'
        }
      });

      // 🔧 清理 IndexedDB 中的重复记录
      if (reports.length > Object.keys(deduplicatedReports).length) {
        logger.debug('[状态恢复] 检测到重复记录，开始清理', {
          totalReports: reports.length,
          uniqueTypes: Object.keys(deduplicatedReports).length
        });
        this.cleanupDuplicateReports(normalizedChatId, deduplicatedReports).catch(err => {
          console.error('[状态恢复] 清理重复记录失败', err);
        });
      }
    } catch (error) {
      logger.error('[状态恢复] 加载失败', error);
      if (typeof resetGenerationButtons === 'function') {
        resetGenerationButtons();
      }
    }
  }

  /**
   * 全局加载生成状态（页面初始化时调用）
   *
   * @async
   * @returns {Promise<void>}
   *
   * @description
   * 在页面加载时调用，加载当前对话的报告生成状态。
   * 等待 currentChat 初始化（最多3秒），避免时序问题导致状态重置。
   */
  async loadGenerationStates() {
    try {
      logger.debug('[全局加载] 开始加载生成状态');

      // 🔧 优化等待策略：
      // 1. 先等待currentChat初始化（最多3秒）
      // 2. 然后等待DOM完全准备好（检查按钮是否存在）

      let waitCount = 0;
      const maxWait = 30; // 3秒 / 100ms = 30次

      // 等待currentChat
      while (!this.state.currentChat && waitCount < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waitCount++;
      }

      // 等待DOM按钮准备好
      waitCount = 0;
      while (waitCount < 10) {
        // 最多等待1秒
        const businessBtn = document.getElementById('businessPlanBtn');
        const proposalBtn = document.getElementById('proposalBtn');

        if (businessBtn && proposalBtn) {
          logger.debug('[全局加载] DOM按钮已准备好');
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
        waitCount++;
      }

      // 如果当前有对话，加载该对话的生成状态
      if (this.state.currentChat) {
        logger.debug('[全局加载] 当前对话ID:', this.state.currentChat);
        await this.loadGenerationStatesForChat(this.state.currentChat);

        // 🔧 额外延迟，确保UI更新完成
        await new Promise(resolve => setTimeout(resolve, 200));

        // 🔧 最终验证
        const businessBtn = document.getElementById('businessPlanBtn');
        const proposalBtn = document.getElementById('proposalBtn');
        logger.debug('[全局加载] 最终按钮状态', {
          businessBtn: businessBtn
            ? {
                classList: Array.from(businessBtn.classList),
                dataStatus: businessBtn.dataset.status
              }
            : 'not found',
          proposalBtn: proposalBtn
            ? {
                classList: Array.from(proposalBtn.classList),
                dataStatus: proposalBtn.dataset.status
              }
            : 'not found'
        });
      } else {
        logger.debug('[全局加载] 没有当前对话，重置按钮状态');
        if (typeof resetGenerationButtons === 'function') {
          resetGenerationButtons();
        }
      }
    } catch (error) {
      console.error('[全局加载] 加载生成状态失败:', error);
    }
  }
}

// 创建全局实例
window.reportGenerator = new ReportGenerator();

// 暴露全局函数（向后兼容）
function generateDetailedReport(forceRegenerate = false) {
  return window.reportGenerator.generateDetailedReport(forceRegenerate);
}

function regenerateInsightsReport() {
  return window.reportGenerator.regenerateInsightsReport();
}

function exportFullReport() {
  return window.reportGenerator.exportFullReport();
}

function prefetchAnalysisReport() {
  return window.reportGenerator.prefetchAnalysisReport();
}

function fetchCachedAnalysisReport() {
  return window.reportGenerator.fetchCachedAnalysisReport();
}

function loadGenerationStatesForChat(chatId) {
  return window.reportGenerator.loadGenerationStatesForChat(chatId);
}

function loadGenerationStates() {
  return window.reportGenerator.loadGenerationStates();
}

function canShareReport() {
  return Boolean(window.chatReportBundle?.hasShareableActiveReport?.('analysis'));
}

function updateShareLinkButtonVisibility() {
  const btn = document.getElementById('shareLinkBtn');
  if (!btn) return;
  btn.style.display = canShareReport() ? 'inline-flex' : 'none';
}

// 暴露到window对象
window.regenerateInsightsReport = regenerateInsightsReport;
window.exportFullReport = exportFullReport;
window.prefetchAnalysisReport = prefetchAnalysisReport;
window.fetchCachedAnalysisReport = fetchCachedAnalysisReport;
window.loadGenerationStatesForChat = loadGenerationStatesForChat;
window.loadGenerationStates = loadGenerationStates;
window.canShareReport = canShareReport;
window.updateShareLinkButtonVisibility = updateShareLinkButtonVisibility;
