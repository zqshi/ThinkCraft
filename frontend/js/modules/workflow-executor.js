/**
 * 工作流执行器（前端）
 * 负责执行工作流阶段任务、管理交付物、处理工作流UI
 */

function getDefaultApiUrl() {
  const host = window.location.hostname;
  const isLocalhost = host === 'localhost' || host === '127.0.0.1';
  if (isLocalhost && window.location.port !== '3000') {
    return 'http://localhost:3000';
  }
  return window.location.origin;
}

class WorkflowExecutor {
  constructor() {
    this.apiUrl = window.appState?.settings?.apiUrl || getDefaultApiUrl();
    this.storageManager = window.storageManager;
    this.projectManager = window.projectManager;

    // 当前执行状态
    this.currentExecution = null;
    this.isExecuting = false;
    this.stageQueues = new Map();
    this.stageQueueRunning = new Set();
  }

  mergeArtifacts(existing = [], incoming = []) {
    const merged = Array.isArray(existing) ? [...existing] : [];
    const byId = new Map();
    merged.forEach(item => {
      if (item?.id) {
        byId.set(item.id, item);
      }
    });
    (incoming || []).forEach(item => {
      if (!item) {
        return;
      }
      if (item.id && byId.has(item.id)) {
        const index = merged.findIndex(entry => entry?.id === item.id);
        if (index >= 0) {
          merged[index] = { ...merged[index], ...item };
        }
        return;
      }
      merged.push(item);
      if (item.id) {
        byId.set(item.id, item);
      }
    });
    return merged;
  }

  normalizeStageId(stageId) {
    if (!stageId) return stageId;
    const normalized = String(stageId).trim();
    const aliases = {
      'strategy_requirement': 'strategy-requirement',
      'strategy+requirement': 'strategy-requirement',
      'strategy-validation': 'strategy',
      'strategy-review': 'strategy',
      'strategy-plan': 'strategy',
      'product-definition': 'requirement',
      'product-requirement': 'requirement',
      requirements: 'requirement',
      'ux-design': 'design',
      'ui-design': 'design',
      'product-design': 'design',
      'experience-design': 'design',
      'user-experience-design': 'design',
      'architecture-design': 'architecture',
      'tech-architecture': 'architecture',
      'system-architecture': 'architecture',
      implementation: 'development',
      dev: 'development',
      qa: 'testing',
      test: 'testing',
      launch: 'deployment',
      release: 'deployment',
      operation: 'operation',
      ops: 'operation'
    };
    return aliases[normalized] || normalized;
  }

  async resolveStageId(projectId, stageId, context = {}) {
    const direct =
      stageId ||
      context?.stageId ||
      context?.stage?.id ||
      context?.stage?.stageId ||
      context?.stage?.key;
    const normalized = this.normalizeStageId(direct);
    if (normalized) {
      return normalized;
    }
    const currentStageId = this.projectManager?.currentStageId;
    if (currentStageId) {
      return this.normalizeStageId(currentStageId);
    }
    if (this.storageManager?.getProject) {
      try {
        const project = await window.projectManager?.getProject(projectId, {
          requireRemote: true,
          allowLocalFallback: false,
          keepLocalOnMissing: false
        });
        const stages = project?.workflow?.stages || [];
        const candidate =
          stages.find(s => s.status === 'active') ||
          stages.find(s => s.status === 'pending') ||
          stages[0];
        if (candidate?.id) {
          return this.normalizeStageId(candidate.id);
        }
      } catch (error) {
        console.warn('[WorkflowExecutor] resolveStageId failed:', error);
      }
    }
    return null;
  }

  /**
   * 执行单个阶段任务
   * @param {String} projectId - 项目ID
   * @param {String} stageId - 阶段ID
   * @param {Object} context - 上下文数据（可选）
   * @returns {Promise<Object>} 执行结果
   */
  async executeStage(projectId, stageId, context = {}) {
    if (this.isExecuting) {
      throw new Error('当前正在执行任务，请稍后再试');
    }

    try {
      this.isExecuting = true;
      const normalizedStageId = this.normalizeStageId(stageId);
      const canProceed = await this.ensureRolesForStage(projectId, stageId);
      if (!canProceed) {
        return { aborted: true };
      }
      await this.updateProjectStageStatus(projectId, stageId, 'active');

      const result = await this.executeStageRequest(projectId, normalizedStageId, context);
      // 更新项目状态
      await this.updateProjectStageStatus(projectId, stageId, 'completed', result.artifacts || []);

      return result;
    } catch (error) {
      await this.updateProjectStageStatus(projectId, stageId, 'pending');
      throw error;
    } finally {
      this.isExecuting = false;
    }
  }

  async executeStageWithOptions(projectId, stageId, context = {}, options = {}) {
    if (this.isExecuting) {
      throw new Error('当前正在执行任务，请稍后再试');
    }

    try {
      this.isExecuting = true;
      const normalizedStageId = this.normalizeStageId(stageId);
      const canProceed = await this.ensureRolesForStage(projectId, stageId);
      if (!canProceed) {
        return { aborted: true };
      }
      await this.updateProjectStageStatus(projectId, stageId, 'active');

      const result = await this.executeStageRequest(projectId, normalizedStageId, context);
      await this.updateProjectStageStatus(projectId, stageId, 'completed', result.artifacts || [], {
        mergeArtifacts: Boolean(options.mergeArtifacts)
      });

      return result;
    } catch (error) {
      await this.updateProjectStageStatus(projectId, stageId, 'pending');
      throw error;
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * 批量执行阶段任务
   * @param {String} projectId - 项目ID
   * @param {Array<String>} stageIds - 阶段ID数组
   * @param {String} conversation - 创意对话内容
   * @param {Function} onProgress - 进度回调函数
   * @returns {Promise<Object>} 执行结果
   */
  async executeBatch(projectId, stageIds, conversation, onProgress = null, options = {}) {
    if (this.isExecuting) {
      throw new Error('当前正在执行任务，请稍后再试');
    }

    try {
      this.isExecuting = true;
      this.currentExecution = {
        projectId,
        stageIds,
        currentStageIndex: 0,
        startTime: Date.now()
      };

      const results = [];
      let totalTokens = 0;
      const context = {
        CONVERSATION: conversation || ''
      };

      const skipRoleCheck = Boolean(options.skipRoleCheck);
      for (let index = 0; index < stageIds.length; index += 1) {
        const stageId = stageIds[index];
        const normalizedStageId = this.normalizeStageId(stageId);
        this.currentExecution.currentStageIndex = index;

        const canProceed = skipRoleCheck
          ? true
          : await this.ensureRolesForStage(projectId, stageId);
        if (!canProceed) {
          break;
        }
        await this.updateProjectStageStatus(projectId, stageId, 'active');
        if (typeof onProgress === 'function') {
          onProgress(stageId, 'active', index);
        }

        let stageResult = null;
        try {
          stageResult = await this.executeStageRequest(projectId, normalizedStageId, context);
        } catch (error) {
          await this.updateProjectStageStatus(projectId, stageId, 'pending');
          if (typeof onProgress === 'function') {
            onProgress(stageId, 'pending', index);
          }
          throw error;
        }
        const artifacts = stageResult.artifacts || [];

        totalTokens += stageResult.totalTokens || 0;
        if (artifacts.length > 0) {
          const mainArtifact = artifacts[0];
          context[normalizedStageId.toUpperCase()] = mainArtifact.content;
          if (normalizedStageId === 'requirement') {
            context.PRD = mainArtifact.content;
          } else if (normalizedStageId === 'design') {
            context.DESIGN = mainArtifact.content;
          } else if (normalizedStageId === 'architecture') {
            context.ARCHITECTURE = mainArtifact.content;
          } else if (normalizedStageId === 'development') {
            context.DEVELOPMENT = mainArtifact.content;
          }
        }

        await this.updateProjectStageStatus(projectId, stageId, 'completed', artifacts);
        if (typeof onProgress === 'function') {
          onProgress(stageId, 'completed', index);
        }

        results.push({ stageId, artifacts });
      }

      return {
        results,
        totalTokens,
        completedAt: new Date().toISOString()
      };
    } catch (error) {
      throw error;
    } finally {
      this.isExecuting = false;
      this.currentExecution = null;
    }
  }

  enqueueStageExecution(projectId, stageId, context, options = {}) {
    const key = `${projectId}::${stageId}`;
    if (!this.stageQueues.has(key)) {
      this.stageQueues.set(key, []);
    }
    const queue = this.stageQueues.get(key);
    queue.push({
      projectId,
      stageId,
      context,
      options
    });
    this.processStageQueue(key).catch(error => {
      console.warn('[WorkflowExecutor] processStageQueue failed', error);
    });
  }

  async processStageQueue(key) {
    if (this.stageQueueRunning.has(key)) {
      return;
    }
    this.stageQueueRunning.add(key);
    const queue = this.stageQueues.get(key);
    while (queue && queue.length > 0) {
      if (this.isExecuting) {
        await new Promise(resolve => setTimeout(resolve, 600));
        continue;
      }
      const task = queue.shift();
      if (!task) {
        continue;
      }
      try {
        await this.executeStageWithOptions(
          task.projectId,
          task.stageId,
          task.context,
          task.options
        );
      } catch (error) {
        if (!task.options?.silent) {
          if (window.modalManager) {
            window.modalManager.alert(`执行失败: ${error.message}`, 'error');
          } else {
            alert(`执行失败: ${error.message}`);
          }
        }
      }
    }
    if (queue && queue.length === 0) {
      this.stageQueues.delete(key);
    }
    this.stageQueueRunning.delete(key);
  }

  /**
   * 获取阶段交付物
   * @param {String} projectId - 项目ID
   * @param {String} stageId - 阶段ID
   * @returns {Promise<Array>} 交付物数组
   */
  async getStageArtifacts(projectId, stageId) {
    try {
      const normalizedStageId = this.normalizeStageId(stageId);
      if (window.requireAuth) {
        const ok = await window.requireAuth({ redirect: true, prompt: true });
        if (!ok) {
          return [];
        }
      }
      const authToken = window.getAuthToken ? window.getAuthToken() : null;
      const response = await fetch(
        `${this.apiUrl}/api/workflow/${projectId}/stages/${normalizedStageId}/artifacts`,
        {
          headers: {
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
          }
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          const err = new Error('UNAUTHORIZED');
          err.code = 'UNAUTHORIZED';
          throw err;
        }
        throw new Error('获取交付物失败');
      }

      const result = await response.json();
      return result.data.artifacts || [];
    } catch (error) {
      throw error;
    }
  }

  /**
   * 获取项目所有交付物
   * @param {String} projectId - 项目ID
   * @returns {Promise<Array>} 交付物数组
   */
  async getAllArtifacts(projectId) {
    try {
      if (window.requireAuth) {
        const ok = await window.requireAuth({ redirect: true, prompt: true });
        if (!ok) {
          return [];
        }
      }
      const authToken = window.getAuthToken ? window.getAuthToken() : null;
      let response;
      try {
        response = await fetch(`${this.apiUrl}/api/workflow/${projectId}/artifacts`, {
          headers: {
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
          }
        });
      } catch (error) {
        const err = new Error('CONNECTION_REFUSED');
        err.code = 'CONNECTION_REFUSED';
        throw err;
      }

      if (!response.ok) {
        if (response.status === 401) {
          const err = new Error('UNAUTHORIZED');
          err.code = 'UNAUTHORIZED';
          throw err;
        }
        throw new Error('获取交付物失败');
      }

      const result = await response.json();
      return result.data.artifacts || [];
    } catch (error) {
      throw error;
    }
  }

  /**
   * 删除交付物
   * @param {String} projectId - 项目ID
   * @param {String} artifactId - 交付物ID
   */
  async deleteArtifact(projectId, artifactId) {
    try {
      if (window.requireAuth) {
        const ok = await window.requireAuth({ redirect: true, prompt: true });
        if (!ok) {
          throw new Error('未提供访问令牌');
        }
      }
      const authToken = window.getAuthToken ? window.getAuthToken() : null;
      const response = await fetch(
        `${this.apiUrl}/api/workflow/${projectId}/artifacts/${artifactId}`,
        {
          method: 'DELETE',
          headers: {
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
          }
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return { ok: true, alreadyMissing: true };
        }
        throw new Error('删除交付物失败');
      }
      return { ok: true };
    } catch (error) {
      throw error;
    }
  }

  /**
   * 更新项目的阶段状态
   * @param {String} projectId - 项目ID
   * @param {String} stageId - 阶段ID
   * @param {String} status - 状态（pending|active|completed）
   * @param {Array<Object>} artifacts - 交付物
   */
  async updateProjectStageStatus(projectId, stageId, status, artifacts = null, options = {}) {
    try {
      const project = await window.projectManager?.getProject(projectId, {
        requireRemote: true,
        allowLocalFallback: false,
        keepLocalOnMissing: false
      });
      if (!project || !project.workflow || !project.workflow.stages) {
        return;
      }
      const projectManager = this.projectManager || window.projectManager;
      const isOffline =
        typeof navigator !== 'undefined' &&
        Object.prototype.hasOwnProperty.call(navigator, 'onLine')
          ? navigator.onLine === false
          : false;

      const applyStageUpdate = targetStage => {
        if (!targetStage) {
          return;
        }
        targetStage.status = status;
        if (status === 'active' || status === 'completed') {
          targetStage.repairNote = null;
        }
        if (Array.isArray(artifacts)) {
          targetStage.artifacts = options.mergeArtifacts
            ? this.mergeArtifacts(targetStage.artifacts || [], artifacts)
            : artifacts;
          targetStage.artifactsUpdatedAt = Date.now();
        }
        if ((status === 'active' || status === 'in_progress') && !targetStage.startedAt) {
          targetStage.startedAt = Date.now();
        } else if (status === 'completed' && !targetStage.completedAt) {
          targetStage.completedAt = Date.now();
        } else if (status === 'pending') {
          targetStage.startedAt = null;
          targetStage.completedAt = null;
        }
      };

      // 更新 workflow 中的阶段状态
      const stage = project.workflow.stages.find(s => s.id === stageId);
      applyStageUpdate(stage);

      // 同步更新协作建议阶段状态（UI主要使用此来源）
      const suggestionStages = project.collaborationSuggestion?.stages;
      if (Array.isArray(suggestionStages)) {
        const suggestionStage = suggestionStages.find(s => s.id === stageId);
        applyStageUpdate(suggestionStage);
      }

      if (Array.isArray(artifacts) && artifacts.length > 0) {
        await this.storageManager.saveArtifacts(artifacts);
      }

      // 保存到本地存储
      await this.storageManager.saveProject(project);

      // 同步到后端，避免刷新后状态回退
      if (projectManager?.updateProject) {
        try {
          await projectManager.updateProject(
            projectId,
            {
              workflow: project.workflow,
              collaborationSuggestion: project.collaborationSuggestion
            },
            { allowFallback: isOffline, forceRemote: true }
          );
        } catch (error) {
          if (window.ErrorHandler?.showToast) {
            window.ErrorHandler.showToast('阶段状态未能保存到服务器', 'error');
          }
        }
      }

      // 更新全局状态
      if (window.updateProject) {
        window.updateProject(projectId, {
          workflow: project.workflow,
          collaborationSuggestion: project.collaborationSuggestion
        });
      }

      if (projectManager?.currentProjectId === projectId) {
        projectManager.refreshProjectPanel(project);
      }
    } catch (error) {}
  }

  async saveArtifactsToKnowledge(projectId, artifacts) {
    if (!this.storageManager || !Array.isArray(artifacts) || artifacts.length === 0) {
      return;
    }

    const docTypeMap = {
      prd: 'prd',
      'ui-design': 'design',
      'architecture-doc': 'tech',
      'test-report': 'analysis',
      'deploy-doc': 'tech',
      'marketing-plan': 'analysis'
    };

    const items = artifacts
      .filter(artifact => docTypeMap[artifact.type])
      .map(artifact => ({
        id: `knowledge-${artifact.id}`,
        title: artifact.name || '未命名文档',
        type: docTypeMap[artifact.type],
        scope: 'project',
        projectId,
        content: artifact.content || '',
        tags: [artifact.type, artifact.stageId].filter(Boolean),
        createdAt: artifact.createdAt || Date.now()
      }));

    if (items.length === 0) {
      return;
    }

    await this.storageManager.saveKnowledgeItems(items);
  }

  async ensureRolesForStage(projectId, stageId) {
    const project = await window.projectManager?.getProject(projectId, {
      requireRemote: true,
      allowLocalFallback: false,
      keepLocalOnMissing: false
    });
    if (!project) {
      return true;
    }
    const required = window.projectManager?.getRecommendedAgentsForStage(project, stageId) || [];
    if (required.length === 0) {
      return true;
    }
    const assigned = project.assignedAgents || [];
    const hiredAgents =
      (await window.projectManager?.getUserHiredAgents?.()) ||
      window.agentCollaboration?.myAgents ||
      [];
    const hiredTypes = (hiredAgents || [])
      .map(agent => agent.type || agent.role || agent.id)
      .filter(Boolean);
    if (assigned.length === 0) {
      // 若项目未绑定成员，但用户已雇佣所需岗位，则不再提示
      const missingByHire = required.filter(role => !hiredTypes.includes(role));
      if (missingByHire.length === 0) {
        return true;
      }
      return await this.confirmMissingRoles(missingByHire);
    }
    if (assigned.length > 0 && (!hiredAgents || hiredAgents.length === 0)) {
      // 后端内存雇佣数据丢失时，优先信任项目已分配成员
      return true;
    }
    const assignedTypes = (hiredAgents || [])
      .filter(agent => assigned.includes(agent.id))
      .map(agent => agent.type || agent.role || agent.id)
      .filter(Boolean);
    const missing = required.filter(role => !assignedTypes.includes(role));
    if (missing.length === 0) {
      return true;
    }
    return await this.confirmMissingRoles(missing);
  }

  async confirmMissingRoles(missingRoles) {
    if (!window.modalManager) {
      return confirm(`缺少关键岗位：${missingRoles.join('、')}，是否仍执行？`);
    }
    return new Promise(resolve => {
      window.modalManager.confirm(
        `缺少关键岗位：${missingRoles.join('、')}\n\n建议先雇佣对应角色。仍然执行将按现有数字员工职责推进。`,
        () => resolve(true),
        () => resolve(false)
      );
    });
  }

  async executeStageRequest(projectId, stageId, context, options = {}) {
    if (window.requireAuth) {
      const ok = await window.requireAuth({ redirect: true, prompt: true });
      if (!ok) {
        throw new Error('未提供访问令牌');
      }
    }
    const resolvedStageId = await this.resolveStageId(projectId, stageId, context);
    if (!resolvedStageId) {
      throw new Error('缺少阶段ID');
    }
    const { timeoutMs = 2 * 60 * 1000, retry = 0, retryDelay = 1500 } = options;
    const authToken = window.getAuthToken ? window.getAuthToken() : null;
    let lastError = null;

    for (let attempt = 0; attempt <= retry; attempt += 1) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      let response;
      try {
        if (attempt > 0) {
          console.warn('[WorkflowExecutor] execute-stage retry', {
            projectId,
            stageId,
            attempt: attempt + 1,
            max: retry + 1
          });
        } else {
          console.info('[WorkflowExecutor] execute-stage request', {
            projectId,
            stageId,
            hasContext: Boolean(context && Object.keys(context).length > 0)
          });
        }
        response = await fetch(`${this.apiUrl}/api/workflow/${projectId}/execute-stage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
          },
          body: JSON.stringify({ stageId: resolvedStageId, context }),
          signal: controller.signal
        });
      } catch (error) {
        lastError = error;
        const isTimeout = error.name === 'AbortError';
        const isNetwork = error instanceof TypeError;
        if (attempt < retry && (isTimeout || isNetwork)) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
          continue;
        }
        if (isTimeout) {
          throw new Error(`阶段执行超时，请稍后重试（已重试 ${attempt} 次）`);
        }
        throw error;
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('未授权，请重新登录');
        }
        let errorMessage = '阶段执行失败';
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } catch (e) {
          const text = await response.text();
          if (text) {
            errorMessage = text;
          }
        }

        const retryable =
          response.status >= 500 || response.status === 408 || response.status === 429;
        lastError = new Error(errorMessage);
        if (attempt < retry && retryable) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
          continue;
        }
        if (attempt > 0) {
          throw new Error(`${errorMessage}（已重试 ${attempt} 次）`);
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.info('[WorkflowExecutor] execute-stage response', {
        projectId,
        stageId,
        code: result?.code,
        artifactCount: Array.isArray(result?.data?.artifacts) ? result.data.artifacts.length : 0
      });
      return result.data;
    }

    throw lastError || new Error('阶段执行失败');
  }

  /**
   * 获取阶段定义
   * @param {String} stageId - 阶段ID
   * @returns {Object|null} 阶段配置
   */
  getStageDefinition(stageId, fallback = {}) {
    const stageDefinitions = {
      'strategy-requirement': {
        id: 'strategy-requirement',
        name: '战略与需求',
        description: '战略建模与需求分析',
        icon: '🎯',
        color: '#6366f1'
      },
      strategy: {
        id: 'strategy',
        name: '战略设计',
        description: '战略设计、关键假设与里程碑',
        icon: '🎯',
        color: '#6366f1'
      },
      requirement: {
        id: 'requirement',
        name: '需求分析',
        description: '产品定位、用户分析、功能规划',
        icon: '📋',
        color: '#667eea'
      },
      design: {
        id: 'design',
        name: '产品设计',
        description: 'UI/UX设计、交互原型、视觉规范',
        icon: '🎨',
        color: '#764ba2'
      },
      architecture: {
        id: 'architecture',
        name: '架构设计',
        description: '系统架构、技术选型、API规范',
        icon: '🏗️',
        color: '#f093fb'
      },
      development: {
        id: 'development',
        name: '开发实现',
        description: '前后端开发、功能实现、代码编写',
        icon: '💻',
        color: '#4facfe'
      },
      testing: {
        id: 'testing',
        name: '测试验证',
        description: '功能测试、性能测试、bug修复',
        icon: '🧪',
        color: '#43e97b'
      },
      deployment: {
        id: 'deployment',
        name: '部署上线',
        description: '环境配置、服务器部署、上线发布',
        icon: '🚀',
        color: '#fa709a'
      },
      operation: {
        id: 'operation',
        name: '运营推广',
        description: '市场推广、用户运营、数据分析',
        icon: '📈',
        color: '#fee140'
      }
    };

    const def = stageDefinitions[stageId] || {};
    const isFallback = !stageDefinitions[stageId];
    return {
      ...def,
      ...fallback,
      icon: fallback.icon || def.icon || '📋',
      color: fallback.color || def.color || '#667eea',
      _isFallback: isFallback
    };
  }

  /**
   * 渲染工作流阶段卡片列表
   * @param {String} containerId - 容器元素ID
   * @param {Object} project - 项目对象
   */
  renderWorkflowStages(containerId, project) {
    const container = document.getElementById(containerId);
    if (!container) {
      return;
    }

    if (!project || !project.workflow || !project.workflow.stages) {
      container.innerHTML = `
                <div style="padding: 20px; text-align: center; color: var(--text-secondary);">
                    工作流数据不存在
                </div>
            `;
      return;
    }

    const stagesHTML = project.workflow.stages
      .map(stage => this.renderStageCard(project.id, stage))
      .join('');

    container.innerHTML = `
            <div style="padding: 20px;">
                <h2 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600;">工作流阶段</h2>
                <div style="display: grid; gap: 16px;">
                    ${stagesHTML}
                </div>
            </div>
        `;
  }

  /**
   * 渲染单个阶段卡片
   * @param {String} projectId - 项目ID
   * @param {Object} stage - 阶段对象
   * @returns {String} HTML字符串
   */
  renderStageCard(projectId, stage) {
    const definition = this.getStageDefinition(stage.id, stage);
    const statusText =
      {
        pending: '未开始',
        active: '进行中',
        completed: '已完成'
      }[stage.status] || stage.status;

    const statusColor =
      {
        pending: '#9ca3af',
        active: '#3b82f6',
        completed: '#10b981'
      }[stage.status] || '#9ca3af';

    const artifacts = Array.isArray(stage.artifacts) ? stage.artifacts : [];
    const artifactCount = artifacts.length;
    const artifactsHTML = this.renderArtifactsList(artifacts, projectId, stage.status);

    let actionHTML = '';
    if (stage.status === 'pending') {
      actionHTML = `
                <button class="btn-primary" onclick="workflowExecutor.startStage('${projectId}', '${stage.id}')">
                    开始执行
                </button>
            `;
    } else if (stage.status === 'completed') {
      actionHTML = `
                <button class="btn-secondary" onclick="workflowExecutor.viewArtifacts('${projectId}', '${stage.id}')">
                    查看交付物 (${artifactCount})
                </button>
            `;
    } else {
      actionHTML = `
                <button class="btn-secondary" disabled>
                    执行中...
                </button>
            `;
    }

    return `
            <div class="stage-card" style="border: 1px solid var(--border); border-radius: 12px; padding: 20px; background: white; border-left: 4px solid ${definition?.color || '#667eea'};">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="font-size: 32px;">${definition?.icon || '📋'}</span>
                        <div>
                            <h3 style="margin: 0 0 4px 0; font-size: 18px; font-weight: 600;">${definition?.name || stage.name}</h3>
                            <p style="margin: 0; font-size: 14px; color: var(--text-secondary);">${definition?.description || ''}</p>
                        </div>
                    </div>
                    <div style="padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: 500; color: white; background: ${statusColor};">
                        ${statusText}
                    </div>
                </div>
                ${artifactsHTML}
                <div style="margin-top: 16px;">
                    ${actionHTML}
                </div>
            </div>
        `;
  }

  renderArtifactsList(artifacts, projectId, status) {
    if (status !== 'completed') {
      return '';
    }
    if (!artifacts.length) {
      return '<div style="margin-top: 12px; color: #9ca3af; font-size: 13px;">暂无交付物</div>';
    }

    return `
            <div style="margin-top: 12px; display: grid; gap: 8px;">
                ${artifacts
                  .map(
                    artifact => `
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 8px 12px; border: 1px solid #e5e7eb; border-radius: 10px;">
                        <div style="min-width: 0;">
                            <div style="font-size: 14px; font-weight: 600; color: #111827;">${this.escapeHtml(artifact.name || '未命名交付物')}</div>
                            <div style="font-size: 12px; color: #6b7280;">${this.escapeHtml(artifact.type || 'deliverable')}</div>
                        </div>
                    </div>
                `
                  )
                  .join('')}
            </div>
        `;
  }

  /**
   * 开始执行阶段
   * @param {String} projectId - 项目ID
   * @param {String} stageId - 阶段ID
   */
  async startStage(projectId, stageId, options = {}) {
    try {
      // 【新增】检查依赖阶段是否完成
      const project = await window.projectManager?.getProject(projectId, {
        requireRemote: true,
        allowLocalFallback: false,
        keepLocalOnMissing: false
      });
      const stages = project.workflow?.stages || [];
      const currentStage = stages.find(s => s.id === stageId);

      const resolveStageOutputs = () => {
        if (!currentStage) {
          return [];
        }
        let outputs = Array.isArray(currentStage.outputs) ? currentStage.outputs : [];
        if (outputs.length === 0 && stageId === 'strategy-requirement') {
          const strategy = stages.find(s => s.id === 'strategy');
          const requirement = stages.find(s => s.id === 'requirement');
          outputs = Array.from(
            new Set([
              ...(Array.isArray(strategy?.outputs) ? strategy.outputs : []),
              ...(Array.isArray(requirement?.outputs) ? requirement.outputs : [])
            ])
          );
        }
        return outputs.filter(Boolean);
      };

      const stageOutputs = resolveStageOutputs();
      if (stageOutputs.length === 0) {
        if (window.modalManager) {
          window.modalManager.alert('该阶段未配置可执行交付物，请先检查阶段配置', 'warning');
        } else {
          alert('该阶段未配置可执行交付物，请先检查阶段配置');
        }
        return;
      }

      if (currentStage && currentStage.executingArtifactTypes?.length) {
        currentStage.executingArtifactTypes = [];
        await this.storageManager.saveProject(project);
      }

      if (currentStage && currentStage.dependencies?.length > 0) {
        const unmetDependencies = [];
        for (const depId of currentStage.dependencies) {
          const depStage = stages.find(s => s.id === depId);
          if (depStage && depStage.status !== 'completed') {
            unmetDependencies.push(depStage.name);
          }
        }

        if (unmetDependencies.length > 0) {
          if (window.modalManager) {
            window.modalManager.alert(
              `无法执行该阶段，依赖阶段未完成：${unmetDependencies.join('、')}`,
              'warning'
            );
          } else {
            alert(`无法执行该阶段，依赖阶段未完成：${unmetDependencies.join('、')}`);
          }
          return;
        }
      }

      // 获取创意对话内容作为上下文
      const chat = await this.storageManager.getChat(project.ideaId);
      const conversation = chat
        ? chat.messages.map(m => `${m.role}: ${m.content}`).join('\n\n')
        : '';

      const selectedArtifactTypes = Array.isArray(options.selectedArtifactTypes)
        ? options.selectedArtifactTypes
        : [];

      if (this.isExecuting) {
        if (options.queueWhileExecuting) {
          this.enqueueStageExecution(
            projectId,
            stageId,
            {
              CONVERSATION: conversation,
              selectedArtifactTypes
            },
            options
          );
          if (window.modalManager) {
            window.modalManager.alert('当前有任务执行中，已加入队列', 'info');
          }
          return;
        }
        if (window.modalManager) {
          window.modalManager.alert('当前正在执行任务，请稍后再试', 'warning');
        } else {
          alert('当前正在执行任务，请稍后再试');
        }
        return;
      }

      // 显示执行提示
      if (!options.silent && window.modalManager) {
        window.modalManager.alert('正在执行阶段任务，请稍候...', 'info');
      }
      // 执行阶段（executeStage内部会自动更新状态为active，然后completed）
      const result = await this.executeStageWithOptions(
        projectId,
        stageId,
        {
          CONVERSATION: conversation,
          selectedArtifactTypes
        },
        { mergeArtifacts: Boolean(options.mergeArtifacts) }
      );
      if (result?.aborted) {
        if (window.modalManager) {
          window.modalManager.close();
        }
        return;
      }

      // 显示成功提示
      if (!options.silent) {
        if (window.toast?.success) {
          window.toast.success(
            `阶段执行完成！生成了 ${result.artifacts.length} 个交付物`,
            3000
          );
        } else if (window.modalManager) {
          window.modalManager.close();
          window.modalManager.alert(
            `阶段执行完成！<br><br>生成了 ${result.artifacts.length} 个交付物<br>消耗 ${result.totalTokens} tokens`,
            'success'
          );
        } else {
          alert('阶段执行完成！');
        }
      } else if (window.modalManager) {
        window.modalManager.close();
      }

      // 刷新UI
      if (this.onStageCompleted) {
        this.onStageCompleted(projectId, stageId);
      }

      // 强制刷新项目面板
      const projectManager = this.projectManager || window.projectManager;
      if (projectManager?.currentProjectId === projectId) {
        const updatedProject = await window.projectManager?.getProject(projectId, {
          requireRemote: true,
          allowLocalFallback: false,
          keepLocalOnMissing: false
        });
        if (updatedProject) {
          const stage = updatedProject.workflow?.stages?.find(s => s.id === stageId);
          if (stage && stage.executingArtifactTypes) {
            stage.executingArtifactTypes = [];
            await this.storageManager.saveProject(updatedProject);
          }
          projectManager.refreshProjectPanel(updatedProject);
        }
      }
    } catch (error) {
      if (window.modalManager) {
        window.modalManager.close();
      }
      if (!options.silent) {
        if (window.toast?.error) {
          window.toast.error(`执行失败: ${error.message}`, 4000);
        } else if (window.modalManager) {
          window.modalManager.alert('执行失败: ' + error.message, 'error');
        } else {
          alert('执行失败: ' + error.message);
        }
      }

      // 恢复阶段状态为pending
      await this.updateProjectStageStatus(projectId, stageId, 'pending');
      const projectManager = this.projectManager || window.projectManager;
      if (projectManager?.currentProjectId === projectId) {
        const updatedProject = await window.projectManager?.getProject(projectId, {
          requireRemote: true,
          allowLocalFallback: false,
          keepLocalOnMissing: false
        });
        if (updatedProject) {
          const stage = updatedProject.workflow?.stages?.find(s => s.id === stageId);
          if (stage && stage.executingArtifactTypes) {
            stage.executingArtifactTypes = [];
            await this.storageManager.saveProject(updatedProject);
          }
          projectManager.refreshProjectPanel(updatedProject);
        }
      }
    }
  }

  async regenerateArtifact(projectId, stageId, artifact) {
    if (!artifact || !artifact.type) {
      throw new Error('交付物信息不完整，无法重新生成');
    }
    if (artifact.id) {
      await this.deleteArtifact(projectId, artifact.id).catch(() => {});
    }
    return this.startStage(projectId, stageId, {
      selectedArtifactTypes: [artifact.type],
      mergeArtifacts: true,
      silent: true
    });
  }

  /**
   * 查看阶段交付物
   * @param {String} projectId - 项目ID
   * @param {String} stageId - 阶段ID
   */
  async viewArtifacts(projectId, stageId) {
    try {
      const artifacts = await this.getStageArtifacts(projectId, stageId);

      if (artifacts.length === 0) {
        if (window.modalManager) {
          window.modalManager.alert('该阶段暂无交付物', 'info');
        } else {
          alert('该阶段暂无交付物');
        }
        return;
      }

      // 渲染交付物列表
      const artifactsHTML = artifacts
        .map(artifact => {
          // 生成预览内容（使用Markdown渲染器）
          const previewContent = artifact.content.substring(0, 300);
          const renderedPreview = window.markdownRenderer
            ? window.markdownRenderer.render(previewContent)
            : this.escapeHtml(previewContent);

          return `
                <div style="margin-bottom: 16px; padding: 16px; border: 1px solid var(--border); border-radius: 8px; background: #f9fafb;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                        <div>
                            <h4 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600;">${this.escapeHtml(artifact.name)}</h4>
                            <div style="font-size: 13px; color: var(--text-secondary);">
                                由 ${this.escapeHtml(artifact.agentName)} 生成 · ${new Date(artifact.createdAt).toLocaleString()}
                            </div>
                        </div>
                        <button class="btn-secondary" onclick="workflowExecutor.showArtifactDetail('${artifact.id}', '${this.escapeHtml(artifact.name)}', \`${this.escapeForJS(artifact.content)}\`)" title="查看完整内容">
                            查看详情
                        </button>
                    </div>
                    <div class="markdown-content" style="max-height: 200px; overflow-y: auto; background: white; padding: 12px; border-radius: 6px; font-size: 13px;">
                        ${renderedPreview}${artifact.content.length > 300 ? '...' : ''}
                    </div>
                </div>
            `;
        })
        .join('');

      const dialogHTML = `
                <div style="max-height: 60vh; overflow-y: auto;">
                    ${artifactsHTML}
                </div>
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border);">
                    <button class="btn-secondary" onclick="window.modalManager.close('artifactsDialog')" style="width: 100%;">关闭</button>
                </div>
            `;

      if (window.modalManager) {
        const stageDef = this.getStageDefinition(stageId);
        window.modalManager.showCustomModal(
          `${stageDef?.icon || ''} ${stageDef?.name || '阶段'} - 交付物`,
          dialogHTML,
          'artifactsDialog'
        );
      }
    } catch (error) {
      if (window.modalManager) {
        window.modalManager.alert('加载交付物失败: ' + error.message, 'error');
      } else {
        alert('加载交付物失败');
      }
    }
  }

  /**
   * 查看交付物详细内容
   * @param {String} artifactId - 交付物ID
   */
  async viewArtifactContent(artifactId) {
    try {
      // 从当前打开的交付物列表中查找
      // TODO [2026-01-26]: 实现更好的交付物查找机制（通过storage-manager）
      // 显示提示（暂时使用alert，后续可以用模态框）
      if (window.modalManager) {
        window.modalManager.alert('正在加载交付物详情...', 'info');

        // 模拟加载（实际应该从storage-manager或API获取）
        setTimeout(() => {
          window.modalManager.close();
          window.modalManager.alert('交付物详情功能开发中...', 'warning');
        }, 500);
      } else {
        alert('交付物详情查看功能开发中...');
      }
    } catch (error) {}
  }

  /**
   * HTML转义
   * @param {String} text - 文本
   * @returns {String} 转义后的文本
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * JavaScript字符串转义（用于内联JS）
   * @param {String} text - 文本
   * @returns {String} 转义后的文本
   */
  escapeForJS(text) {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\$/g, '\\$')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r');
  }

  /**
   * 显示交付物详情（使用Markdown渲染）
   * @param {String} artifactId - 交付物ID
   * @param {String} name - 交付物名称
   * @param {String} content - 交付物内容
   */
  showArtifactDetail(artifactId, name, content) {
    if (!window.modalManager) {
      return;
    }

    // 使用Markdown渲染器渲染内容
    const renderedContent = window.markdownRenderer
      ? window.markdownRenderer.render(content)
      : this.escapeHtml(content);

    const contentHTML = `
            <div style="max-height: 70vh; overflow-y: auto; padding: 4px;">
                <div class="markdown-content" style="padding: 16px; background: white; border-radius: 8px;">
                    ${renderedContent}
                </div>
            </div>
            <div style="display: flex; gap: 12px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border);">
                <button class="btn-secondary" onclick="window.modalManager.close('artifactDetail')" style="flex: 1;">
                    关闭
                </button>
                <button class="btn-primary" onclick="workflowExecutor.downloadArtifact('${artifactId}', '${this.escapeForJS(name)}', \`${this.escapeForJS(content)}\`)" style="flex: 1;">
                    下载文档
                </button>
            </div>
        `;

    window.modalManager.showCustomModal(`📄 ${name}`, contentHTML, 'artifactDetail');
  }

  /**
   * 下载交付物为文件
   * @param {String} artifactId - 交付物ID
   * @param {String} name - 交付物名称
   * @param {String} content - 交付物内容
   */
  downloadArtifact(artifactId, name, content) {
    try {
      // 创建Blob对象
      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });

      // 创建下载链接
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${name}.md`;

      // 触发下载
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 释放URL对象
      URL.revokeObjectURL(url);

      if (window.modalManager) {
        window.modalManager.alert('文档已下载！', 'success');
      }
    } catch (error) {
      if (window.modalManager) {
        window.modalManager.alert('下载失败: ' + error.message, 'error');
      }
    }
  }
}

// 导出（浏览器环境）
if (typeof window !== 'undefined') {
  window.WorkflowExecutor = WorkflowExecutor;
  window.workflowExecutor = new WorkflowExecutor();
}
