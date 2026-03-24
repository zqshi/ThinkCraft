/**
 * Chat / Report 统一读取模型
 * 收口聊天列表、聊天详情、报告状态与按钮显示的读取逻辑。
 */

window.chatReportBundle = {
  cache: new Map(),

  createEmptyReports() {
    return {
      analysis: null,
      business: null,
      proposal: null
    };
  },

  normalizeChatId(chatId) {
    if (typeof window.normalizeChatId === 'function') {
      return window.normalizeChatId(chatId);
    }
    if (chatId === null || chatId === undefined) {
      return '';
    }
    return String(chatId).trim();
  },

  normalizeRelationKey(value) {
    const raw = this.normalizeChatId(value);
    if (!raw) {
      return '';
    }
    const dePrefixed = raw.replace(/^(idea-|chat-)/i, '');
    if (/^\d+$/.test(dePrefixed)) {
      return String(Number(dePrefixed));
    }
    return dePrefixed;
  },

  getCacheKey(chatId) {
    return this.normalizeChatId(chatId);
  },

  getCachedBundle(chatId) {
    return this.cache.get(this.getCacheKey(chatId)) || null;
  },

  setCachedBundle(bundle) {
    if (!bundle?.chatId) {
      return bundle;
    }
    this.cache.set(this.getCacheKey(bundle.chatId), bundle);
    return bundle;
  },

  clearCache(chatId = null) {
    if (!chatId) {
      this.cache.clear();
      return;
    }
    this.cache.delete(this.getCacheKey(chatId));
  },

  getCurrentChatId() {
    return this.normalizeChatId(window.state?.currentChat);
  },

  setActiveReport(reportData, options = {}) {
    const type = String(options.type || 'analysis').toLowerCase();
    if (type !== 'analysis') {
      return;
    }

    window.lastGeneratedReport = reportData || null;
    if (!reportData) {
      window.lastGeneratedReportKey = null;
      return;
    }

    if (options.reportKey !== undefined) {
      window.lastGeneratedReportKey = options.reportKey;
      return;
    }

    window.lastGeneratedReportKey =
      window.reportGenerator?.getAnalysisReportKey?.() || window.lastGeneratedReportKey || null;
  },

  clearActiveReport(options = {}) {
    this.setActiveReport(null, options);
  },

  patchCachedBundleReport(chatId, type, reportEntry) {
    const key = this.getCacheKey(chatId);
    const cached = this.cache.get(key);
    if (!cached?.reports) {
      return;
    }
    const nextReports = {
      ...cached.reports,
      [type]: reportEntry
    };
    this.cache.set(key, {
      ...cached,
      reports: nextReports,
      reportButtonStates: {
        ...(cached.reportButtonStates || {}),
        [type]: this.determineReportButtonState(reportEntry)
      }
    });
  },

  normalizeChat(chat, source = 'local') {
    if (!chat || chat.id === undefined || chat.id === null) {
      return null;
    }
    const normalizedSource =
      source === 'remote'
        ? 'remote'
        : source === 'recovered'
          ? 'recovered'
          : source === 'hybrid'
            ? 'hybrid'
            : 'local';
    return {
      ...chat,
      id: this.normalizeChatId(chat.id),
      title: String(chat.title || '新对话').trim() || '新对话',
      messages: Array.isArray(chat.messages) ? chat.messages : [],
      userData: chat.userData || {},
      conversationStep: chat.conversationStep || 0,
      analysisCompleted: Boolean(chat.analysisCompleted),
      reportState: chat.reportState || null,
      createdAt: chat.createdAt || chat.updatedAt || new Date().toISOString(),
      updatedAt: chat.updatedAt || chat.createdAt || new Date().toISOString(),
      source: normalizedSource,
      localOnly: normalizedSource !== 'remote' ? chat.localOnly !== false : Boolean(chat.localOnly),
      recoveredFromProject: normalizedSource === 'recovered' || Boolean(chat.recoveredFromProject),
      remoteBacked:
        normalizedSource === 'remote' || normalizedSource === 'hybrid'
          ? true
          : Boolean(chat.remoteBacked)
    };
  },

  shouldSkipRemoteFetch(chat) {
    return Boolean(
      chat && (chat.remoteBacked === false || chat.recoveredFromProject || chat.localOnly)
    );
  },

  isNotFoundError(error) {
    const message = String(error?.message || '').toLowerCase();
    return message.includes('404') || message.includes('not found') || message.includes('不存在');
  },

  hasRemoteAccess() {
    return Boolean((window.getAuthToken ? window.getAuthToken() : null) && window.apiClient?.get);
  },

  async saveChatsToStorage(chats) {
    if (!window.storageManager?.saveChat) {
      return;
    }
    for (const chat of Array.isArray(chats) ? chats : []) {
      await window.storageManager.saveChat(chat).catch(() => {});
    }
  },

  sortChats(chats = []) {
    return [...chats].sort((a, b) => {
      if (a.isPinned && !b.isPinned) {
        return -1;
      }
      if (!a.isPinned && b.isPinned) {
        return 1;
      }
      const aId = Number(a.id) || 0;
      const bId = Number(b.id) || 0;
      if (aId !== bId) {
        return bId - aId;
      }
      const aRequestId = Number(a.requestId ?? a.requestID ?? 0) || 0;
      const bRequestId = Number(b.requestId ?? b.requestID ?? 0) || 0;
      return bRequestId - aRequestId;
    });
  },

  clearMissingChatFlags(chats = []) {
    if (!(window.chatManager?.missingChatIds instanceof Set)) {
      return;
    }
    let changed = false;
    for (const chat of chats) {
      const chatId = this.normalizeChatId(chat?.id);
      if (chatId && window.chatManager.missingChatIds.delete(chatId)) {
        changed = true;
      }
    }
    if (changed && typeof window.chatManager.persistMissingChatIds === 'function') {
      window.chatManager.persistMissingChatIds();
    }
  },

  async recoverChatsFromLocalStorage() {
    const saved = localStorage.getItem('thinkcraft_chats');
    if (!saved) {
      return [];
    }

    try {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) {
        return [];
      }

      const chats = parsed
        .filter(chat => chat && chat.id !== undefined && chat.id !== null)
        .map(chat => this.normalizeChat(chat, chat?.remoteBacked ? 'hybrid' : 'local'));

      await this.saveChatsToStorage(chats);
      return chats;
    } catch (error) {
      console.warn('[ChatReportBundle] 解析本地对话缓存失败:', error);
      return [];
    }
  },

  buildRecoveredChat(project, analysisReport) {
    const rawChatId = project?.ideaId ?? project?.linkedIdeas?.[0] ?? analysisReport?.chatId;
    const normalizedChatId = this.normalizeChatId(rawChatId);
    if (!normalizedChatId) {
      return null;
    }

    const projectName = String(project?.name || '').trim();
    const derivedTitle = projectName.replace(/\s*-\s*项目$/, '').trim();
    const reportData = analysisReport?.data || {};
    const summary =
      reportData.coreDefinition ||
      reportData.problem ||
      reportData.summary ||
      reportData.document ||
      '已根据项目空间与分析报告恢复对话索引，原始消息记录缺失。';

    return this.normalizeChat(
      {
        id: normalizedChatId,
        title: derivedTitle || '恢复的创意对话',
        titleEdited: false,
        messages: [
          {
            role: 'user',
            content: derivedTitle || projectName || '恢复的创意对话'
          },
          {
            role: 'assistant',
            content:
              typeof summary === 'string' && summary.trim()
                ? summary.trim().slice(0, 2000)
                : '已根据项目空间与分析报告恢复对话索引，原始消息记录缺失。'
          }
        ],
        userData: {},
        conversationStep: 0,
        analysisCompleted: true,
        reportState: {
          analysis: {
            status: String(analysisReport?.status || 'completed'),
            progress: { current: 1, total: 1, percentage: 100 },
            updatedAt: analysisReport?.endTime || analysisReport?.timestamp || Date.now(),
            source: 'recovered-from-project'
          }
        },
        createdAt:
          analysisReport?.startTime ||
          project?.createdAt ||
          analysisReport?.timestamp ||
          new Date().toISOString(),
        updatedAt:
          analysisReport?.endTime ||
          project?.updatedAt ||
          analysisReport?.timestamp ||
          new Date().toISOString(),
        recoveredFromProject: true,
        localOnly: true,
        remoteBacked: false
      },
      'recovered'
    );
  },

  async recoverChatsFromProjectsAndReports(existingChats = []) {
    if (!window.storageManager?.getAllProjects || !window.storageManager?.getAllReports) {
      return [];
    }

    const knownIds = new Set(
      (Array.isArray(existingChats) ? existingChats : [])
        .map(chat => this.normalizeRelationKey(chat?.id))
        .filter(Boolean)
    );
    const projects = await window.storageManager.getAllProjects().catch(() => []);
    const reports = await window.storageManager.getAllReports().catch(() => []);
    const analysisReports = (Array.isArray(reports) ? reports : []).filter(report => {
      const type = String(report?.type || '').toLowerCase();
      return type === 'analysis' || type === 'analysis-report' || type === 'analysis_report';
    });

    const recovered = [];
    for (const project of Array.isArray(projects) ? projects : []) {
      if (!project || project.status === 'deleted') {
        continue;
      }

      const ideaKey = this.normalizeRelationKey(project.ideaId ?? project.linkedIdeas?.[0]);
      if (!ideaKey || knownIds.has(ideaKey)) {
        continue;
      }

      const analysisReport =
        analysisReports.find(report => this.normalizeRelationKey(report?.chatId) === ideaKey) ||
        null;
      if (!analysisReport) {
        continue;
      }

      const recoveredChat = this.buildRecoveredChat(project, analysisReport);
      if (!recoveredChat) {
        continue;
      }

      knownIds.add(ideaKey);
      recovered.push(recoveredChat);
    }

    if (recovered.length > 0) {
      await this.saveChatsToStorage(recovered);
      try {
        localStorage.setItem(
          'thinkcraft_chats',
          JSON.stringify([...recovered, ...(Array.isArray(existingChats) ? existingChats : [])])
        );
      } catch (_error) {
        // ignore local cache write failures
      }
    }

    return recovered;
  },

  async fetchRemoteChatList() {
    if (!this.hasRemoteAccess()) {
      return [];
    }
    const response = await window.apiClient.get('/api/chat', { page: 1, pageSize: 100 });
    const chats = Array.isArray(response?.data?.chats) ? response.data.chats : [];
    return chats.map(chat =>
      this.normalizeChat(
        {
          id: chat.id,
          title: chat.title,
          titleEdited: Boolean(chat.titleEdited),
          messages: Array.isArray(chat.messages)
            ? chat.messages.map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'assistant',
                content: msg.content
              }))
            : [],
          userData: chat.userData || {},
          conversationStep: chat.conversationStep || 0,
          analysisCompleted: chat.analysisCompleted || false,
          reportState: chat.reportState || null,
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt,
          status: chat.status,
          tags: chat.tags || [],
          isPinned: chat.isPinned || false,
          remoteBacked: true
        },
        'remote'
      )
    );
  },

  async resolveChatList(options = {}) {
    const { preferLocal = false } = options;
    let chats = [];
    let source = 'local';

    if (!preferLocal && this.hasRemoteAccess()) {
      try {
        chats = await this.fetchRemoteChatList();
        source = chats.length > 0 ? 'remote' : 'remote-empty';
        await this.saveChatsToStorage(chats);
      } catch (error) {
        console.warn('[ChatReportBundle] 后端加载对话失败，回退本地缓存', error);
      }
    }

    if (chats.length === 0 && window.storageManager?.getAllChats) {
      try {
        chats = await window.storageManager.getAllChats();
        chats = (Array.isArray(chats) ? chats : []).map(chat =>
          this.normalizeChat(
            chat,
            chat?.remoteBacked ? 'hybrid' : chat?.recoveredFromProject ? 'recovered' : 'local'
          )
        );
      } catch (error) {
        console.error('[ChatReportBundle] 加载 IndexedDB 对话失败:', error);
        chats = [];
      }
    }

    if (chats.length === 0) {
      chats = await this.recoverChatsFromLocalStorage();
      if (chats.length > 0) {
        source = 'local-storage';
      }
    }

    const recovered = await this.recoverChatsFromProjectsAndReports(chats);
    if (recovered.length > 0) {
      chats = [...recovered, ...chats];
      source = source === 'remote' ? 'hybrid' : 'recovered';
    }

    chats = this.sortChats(
      chats.filter(
        (chat, index, list) => list.findIndex(item => String(item.id) === String(chat.id)) === index
      )
    );
    this.clearMissingChatFlags(chats);
    return { chats, source };
  },

  async resolveChat(chatId, options = {}) {
    const normalizedChatId = this.normalizeChatId(chatId);
    if (!normalizedChatId) {
      return { chat: null, source: 'missing', reason: 'no_chat_id' };
    }

    const stateChats = Array.isArray(options.stateChats) ? options.stateChats : [];
    let chat =
      stateChats.find(item => String(item.id) === normalizedChatId) ||
      (window.storageManager?.getChat
        ? await window.storageManager.getChat(normalizedChatId).catch(() => null)
        : null);

    if (chat) {
      chat = this.normalizeChat(
        chat,
        chat?.remoteBacked ? 'hybrid' : chat?.recoveredFromProject ? 'recovered' : 'local'
      );
    }

    if (this.hasRemoteAccess() && !this.shouldSkipRemoteFetch(chat)) {
      try {
        const response = await window.apiClient.get(`/api/chat/${normalizedChatId}`);
        if (response?.code === 0 && response?.data?.id) {
          const serverChat = this.normalizeChat(
            {
              id: response.data.id,
              title: response.data.title,
              titleEdited: Boolean(response.data.titleEdited),
              messages: Array.isArray(response.data.messages)
                ? response.data.messages.map(msg => ({
                    role: msg.sender === 'user' ? 'user' : 'assistant',
                    content: msg.content
                  }))
                : [],
              userData: response.data.userData || {},
              conversationStep: response.data.conversationStep || 0,
              analysisCompleted: response.data.analysisCompleted || false,
              reportState: response.data.reportState || null,
              createdAt: response.data.createdAt,
              updatedAt: response.data.updatedAt,
              status: response.data.status,
              tags: response.data.tags || [],
              isPinned: response.data.isPinned || false,
              remoteBacked: true
            },
            'remote'
          );
          await this.saveChatsToStorage([serverChat]);
          return { chat: serverChat, source: 'remote', reason: 'fetched_remote' };
        }
      } catch (error) {
        if (this.isNotFoundError(error)) {
          if (chat) {
            return { chat, source: 'local', reason: 'missing_remote_kept_local' };
          }
          return { chat: null, source: 'missing', reason: 'missing_remote' };
        }
        console.warn('[ChatReportBundle] 拉取后端会话失败，使用本地缓存', error);
      }
    }

    if (chat) {
      return { chat, source: chat.source || 'local', reason: 'local_cache' };
    }

    return { chat: null, source: 'missing', reason: 'missing_local' };
  },

  buildReportFromChatState(chatId, type, stateEntry, existing = null) {
    if (!stateEntry) {
      return null;
    }
    return {
      id: existing?.id,
      type,
      chatId: this.normalizeChatId(chatId),
      data: stateEntry.data ?? existing?.data ?? null,
      status: stateEntry.status ?? existing?.status ?? 'idle',
      progress: stateEntry.progress ?? existing?.progress,
      selectedChapters: stateEntry.selectedChapters ?? existing?.selectedChapters ?? [],
      startTime: stateEntry.startTime ?? existing?.startTime,
      endTime: stateEntry.endTime ?? existing?.endTime,
      error: stateEntry.error ?? existing?.error ?? null,
      timestamp: existing?.timestamp || Date.now()
    };
  },

  isCompletedStatus(status) {
    const normalized = String(status || '').toLowerCase();
    return (
      normalized === 'completed' ||
      normalized === 'success' ||
      normalized === 'done' ||
      normalized === 'finished'
    );
  },

  validateReportData(report) {
    if (!report?.data) {
      return false;
    }
    const type = String(report.type || '').toLowerCase();
    const data = report.data;
    const hasDocument = typeof data.document === 'string' && data.document.trim().length > 0;
    const chapters = data.chapters;
    const hasChapters = Array.isArray(chapters)
      ? chapters.length > 0
      : chapters && typeof chapters === 'object'
        ? Object.keys(chapters).length > 0
        : false;

    if (type === 'analysis') {
      return hasDocument || hasChapters || data.chapters === undefined;
    }
    if (type === 'business' || type === 'proposal') {
      return hasDocument || hasChapters;
    }
    return hasDocument || hasChapters;
  },

  async persistReconciledReport(report) {
    if (!report || !window.storageManager?.saveReport) {
      return;
    }
    await window.storageManager.saveReport(report).catch(() => {});
  },

  async persistReport(chatId, type, payload = {}, options = {}) {
    const normalizedChatId = this.normalizeChatId(chatId);
    if (!normalizedChatId || !window.storageManager?.saveReport) {
      return null;
    }

    const reportEntry = {
      id: payload.id,
      type,
      chatId: normalizedChatId,
      data: payload.data ?? null,
      status: payload.status,
      progress: payload.progress,
      selectedChapters: payload.selectedChapters,
      startTime: payload.startTime,
      endTime: payload.endTime,
      error: payload.error
    };

    await window.storageManager.saveReport(reportEntry);
    this.clearCache(normalizedChatId);
    this.patchCachedBundleReport(normalizedChatId, type, reportEntry);

    if (options.setActive !== false) {
      this.setActiveReport(reportEntry.data, {
        chatId: normalizedChatId,
        type,
        reportKey: options.reportKey
      });
    }

    if (options.notifyStatus !== false && window.reportStatusManager?.onReportStatusChange) {
      window.reportStatusManager.onReportStatusChange(
        normalizedChatId,
        type,
        reportEntry.status || ''
      );
    }

    return reportEntry;
  },

  async deleteReport(chatId, type, options = {}) {
    const normalizedChatId = this.normalizeChatId(chatId);
    const normalizedType = String(type || '').toLowerCase();
    if (!normalizedChatId || !normalizedType || !window.storageManager) {
      return;
    }

    if (window.storageManager.deleteReportByType) {
      await window.storageManager
        .deleteReportByType(normalizedChatId, normalizedType)
        .catch(() => {});
    } else if (window.storageManager.getReportByChatIdAndType) {
      const existing = await window.storageManager
        .getReportByChatIdAndType(normalizedChatId, normalizedType)
        .catch(() => null);
      if (existing?.id && window.storageManager.deleteReport) {
        await window.storageManager.deleteReport(existing.id).catch(() => {});
      }
    }

    this.clearCache(normalizedChatId);
    if (normalizedType === 'analysis' && options.clearActive !== false) {
      this.clearActiveReport({ chatId: normalizedChatId, type: normalizedType });
    }
    if (window.reportStatusManager?.clearCache) {
      window.reportStatusManager.clearCache(normalizedChatId, normalizedType);
    }
  },

  async reconcileReport(chat, report, type) {
    if (!report) {
      return null;
    }

    const normalizedType = String(type || report.type || '').toLowerCase();
    const normalizedStatus = String(report.status || '').toLowerCase();
    const hasData = this.validateReportData({ ...report, type: normalizedType });

    if (!this.isCompletedStatus(normalizedStatus) && hasData) {
      const normalizedReport = {
        ...report,
        type: normalizedType,
        status: 'completed',
        endTime: report.endTime || Date.now(),
        error: null
      };
      await this.persistReconciledReport(normalizedReport);
      return normalizedReport;
    }

    if (normalizedStatus === 'generating' && !report.startTime) {
      const chatStatus = String(chat?.reportState?.[normalizedType]?.status || '').toLowerCase();
      const chatCompleted =
        chat?.analysisCompleted === true ||
        this.isCompletedStatus(chatStatus) ||
        (normalizedType !== 'analysis' && this.validateReportData(report));
      if (chatCompleted) {
        const normalizedReport = {
          ...report,
          type: normalizedType,
          status: 'completed',
          startTime: report.startTime || Date.now(),
          endTime: report.endTime || Date.now(),
          error: null
        };
        await this.persistReconciledReport(normalizedReport);
        return normalizedReport;
      }
    }

    return { ...report, type: normalizedType };
  },

  rankReport(report) {
    if (!report) {
      return -1;
    }
    const status = String(report.status || '').toLowerCase();
    const hasData = this.validateReportData(report);
    if (hasData && this.isCompletedStatus(status)) {
      return 4;
    }
    if (hasData) {
      return 3;
    }
    if (status === 'generating') {
      return 2;
    }
    if (status === 'error') {
      return 1;
    }
    return 0;
  },

  selectBestReport(existing, candidate) {
    if (!existing) {
      return candidate;
    }
    const rankDiff = this.rankReport(candidate) - this.rankReport(existing);
    if (rankDiff !== 0) {
      return rankDiff > 0 ? candidate : existing;
    }
    const candidateTime = Number(
      candidate?.endTime || candidate?.startTime || candidate?.timestamp || 0
    );
    const existingTime = Number(
      existing?.endTime || existing?.startTime || existing?.timestamp || 0
    );
    return candidateTime >= existingTime ? candidate : existing;
  },

  async resolveReports(chatId, options = {}) {
    const normalizedChatId = this.normalizeChatId(chatId);
    const result = this.createEmptyReports();
    if (!normalizedChatId) {
      return result;
    }

    const chat = options.chat || null;
    let storedReports = [];
    if (window.storageManager?.getReportsByChatId) {
      storedReports = await window.storageManager
        .getReportsByChatId(normalizedChatId)
        .catch(() => []);
    } else if (window.storageManager?.getAllReports) {
      const allReports = await window.storageManager.getAllReports().catch(() => []);
      storedReports = (Array.isArray(allReports) ? allReports : []).filter(
        report =>
          this.normalizeRelationKey(report?.chatId) === this.normalizeRelationKey(normalizedChatId)
      );
    }

    for (const report of Array.isArray(storedReports) ? storedReports : []) {
      const type = String(report?.type || '').toLowerCase();
      if (!type || !(type in result)) {
        continue;
      }
      const reconciled = await this.reconcileReport(chat, report, type);
      result[type] = this.selectBestReport(result[type], reconciled);
    }

    const chatReportState =
      chat?.reportState && typeof chat.reportState === 'object' ? chat.reportState : {};
    for (const type of Object.keys(result)) {
      const stateEntry = chatReportState[type];
      if (!stateEntry) {
        continue;
      }
      const derived = await this.reconcileReport(
        chat,
        this.buildReportFromChatState(normalizedChatId, type, stateEntry, result[type]),
        type
      );
      result[type] = this.selectBestReport(result[type], derived);
    }

    return result;
  },

  determineReportButtonState(report, options = {}) {
    const timeoutMs = Number(options.timeoutMs || 8 * 60 * 1000);
    if (!report) {
      return {
        shouldShow: false,
        reason: 'no_report'
      };
    }

    const status = String(report.status || '').toLowerCase();
    if (!status) {
      if (this.validateReportData(report)) {
        return {
          shouldShow: true,
          buttonText: '查看完整报告',
          buttonState: 'completed',
          reason: 'legacy_no_status'
        };
      }
      return {
        shouldShow: true,
        buttonText: '报告数据不完整，点击重新生成',
        buttonState: 'error',
        reason: 'legacy_incomplete_data'
      };
    }

    if (status === 'generating') {
      if (!report.startTime || Number.isNaN(Number(report.startTime))) {
        return {
          shouldShow: true,
          buttonText: '生成状态异常，点击重试',
          buttonState: 'error',
          reason: 'invalid_start_time'
        };
      }
      if (Date.now() - report.startTime > timeoutMs) {
        return {
          shouldShow: true,
          buttonText: '生成超时，点击重试',
          buttonState: 'error',
          reason: 'timeout'
        };
      }
      return {
        shouldShow: true,
        buttonText: `生成中 ${report.progress?.percentage || 0}%`,
        buttonState: 'generating',
        reason: 'generating'
      };
    }

    if (this.isCompletedStatus(status)) {
      if (!this.validateReportData(report)) {
        return {
          shouldShow: true,
          buttonText: '报告数据不完整，点击重新生成',
          buttonState: 'error',
          reason: 'incomplete_data'
        };
      }
      return {
        shouldShow: true,
        buttonText: '查看完整报告',
        buttonState: 'completed',
        reason: 'completed'
      };
    }

    if (status === 'error' || status === 'failed' || status === 'timeout') {
      return {
        shouldShow: true,
        buttonText: '生成失败，点击重试',
        buttonState: 'error',
        reason: 'error'
      };
    }

    return {
      shouldShow: false,
      reason: 'not_ready'
    };
  },

  async resolveReportEntry(chatId, type = 'analysis', options = {}) {
    const bundle = await this.resolveChatBundle(chatId, options);
    const report = bundle?.reports?.[type] || null;
    return {
      bundle,
      report,
      buttonState: this.determineReportButtonState(report)
    };
  },

  async resolveReportData(chatId, type = 'analysis', options = {}) {
    const resolved = await this.resolveReportEntry(chatId, type, options);
    return resolved?.report?.data || null;
  },

  async getActiveReport(type = 'analysis', options = {}) {
    const normalizedType = String(type || 'analysis').toLowerCase();
    if (normalizedType === 'analysis' && window.lastGeneratedReport) {
      return window.lastGeneratedReport;
    }
    const chatId = this.normalizeChatId(options.chatId || this.getCurrentChatId());
    if (!chatId) {
      return null;
    }
    return await this.resolveReportData(chatId, normalizedType, options);
  },

  hasShareableActiveReport(type = 'analysis') {
    const normalizedType = String(type || 'analysis').toLowerCase();
    if (normalizedType !== 'analysis') {
      return false;
    }
    const report = window.lastGeneratedReport;
    if (!report) {
      return false;
    }
    return this.validateReportData({ type: normalizedType, data: report });
  },

  async resolveChatBundle(chatId, options = {}) {
    const normalizedChatId = this.normalizeChatId(chatId);
    if (!normalizedChatId) {
      return {
        chatId: '',
        source: 'missing',
        chat: null,
        reports: this.createEmptyReports(),
        reportButtonStates: {
          analysis: this.determineReportButtonState(null),
          business: this.determineReportButtonState(null),
          proposal: this.determineReportButtonState(null)
        }
      };
    }

    if (!options.forceRefresh) {
      const cached = this.getCachedBundle(normalizedChatId);
      if (cached?.chat?.updatedAt || cached?.reports) {
        return cached;
      }
    }

    const resolution = await this.resolveChat(normalizedChatId, options);
    const chat = resolution.chat;
    const reports = await this.resolveReports(normalizedChatId, { chat });
    const bundle = {
      chatId: normalizedChatId,
      source: resolution.source,
      chat,
      reports,
      reportButtonStates: {
        analysis: this.determineReportButtonState(reports.analysis),
        business: this.determineReportButtonState(reports.business),
        proposal: this.determineReportButtonState(reports.proposal)
      }
    };

    return this.setCachedBundle(bundle);
  }
};
