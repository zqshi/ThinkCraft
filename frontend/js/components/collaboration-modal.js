/**
 * CollaborationModal 组件
 * 智能协同编排系统的主UI界面
 *
 * 依赖：
 * - APIClient: API调用
 * - CollaborationState: 状态管理
 * - ModalManager: Modal管理
 */

class CollaborationModal {
  constructor(apiClient, collaborationState, modalManager) {
    this.apiClient = apiClient;
    this.state = collaborationState;
    this.modalManager = modalManager;

    // 绑定方法上下文
    this.show = this.show.bind(this);
    this.close = this.close.bind(this);
    this.handleStartAnalysis = this.handleStartAnalysis.bind(this);
    this.handleGenerateModes = this.handleGenerateModes.bind(this);
    this.handleExecute = this.handleExecute.bind(this);
  }

  /**
   * 获取当前用户ID
   * @returns {string}
   */
  getUserId() {
    // 使用全局统一的UserIdManager（由init-modules.js初始化）
    if (window.UserIdManager) {
      return window.UserIdManager.getUserId();
    }

    // 降级方案：使用window.USER_ID（向后兼容）
    if (window.USER_ID) {
      return window.USER_ID;
    }

    // 兜底方案：如果上述都不存在，从localStorage读取
    // （理论上不应该走到这里）
    console.warn('[CollaborationModal] UserIdManager未初始化，使用localStorage降级方案');
    let userId = localStorage.getItem('thinkcraft_user_id');
    if (!userId) {
      userId = 'user_' + Date.now();
      localStorage.setItem('thinkcraft_user_id', userId);
    }
    return userId;
  }

  /**
   * 显示Modal（全局模式）
   */
  show() {
    // 重置状态
    this.state.reset();
    this.state.setStep('input');

    // 打开Modal并渲染初始界面
    this.modalManager.open('collaborationModal', {
      onOpen: () => {
        this.renderCurrentStep();
      },
      onClose: () => {
        this.state.reset();
      }
    });
  }

  /**
   * 显示Modal（项目模式）
   */
  showForProject(projectId, project) {
    // 重置状态
    this.state.reset();
    this.state.setProject(projectId, project);
    this.state.setStep('input');

    // 打开Modal并渲染初始界面
    this.modalManager.open('collaborationModal', {
      onOpen: () => {
        this.renderCurrentStep();
      },
      onClose: () => {
        this.state.reset();
      }
    });
  }

  /**
   * 关闭Modal
   */
  close() {
    this.modalManager.close('collaborationModal');
  }

  /**
   * 根据当前步骤渲染对应界面
   */
  renderCurrentStep() {
    const step = this.state.getStep();

    switch(step) {
      case 'input':
        this.renderInputStep();
        break;
      case 'analyzing':
        this.renderAnalyzingStep();
        break;
      case 'hiring':
        this.renderHiringStep();
        break;
      case 'modes':
        this.renderModesStep();
        break;
      case 'executing':
        this.renderExecutingStep();
        break;
      case 'completed':
        this.renderCompletedStep();
        break;
      default:
        this.renderInputStep();
    }
  }

  /**
   * 步骤1：输入协同目标
   */
  renderInputStep() {
    const container = document.getElementById('collaboration-content');
    if (!container) return;

    const project = this.state.getProject();
    const isProjectMode = !!project;

    // 项目模式下的默认目标
    const defaultGoal = isProjectMode
      ? `为【${project.name}】项目制定完整的执行方案，包括产品设计、技术实现和市场推广计划`
      : '';

    // 项目模式下显示项目信息
    const projectInfo = isProjectMode ? `
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 16px; border-radius: 8px; margin-bottom: 20px; color: white;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
          <span style="font-size: 24px;">${project.icon || '📁'}</span>
          <div>
            <div style="font-weight: 600; font-size: 16px;">${project.name}</div>
            <div style="font-size: 13px; opacity: 0.9;">团队成员: ${project.assignedAgents?.length || 0}人 · 创意: ${project.linkedIdeas?.length || 0}条</div>
          </div>
        </div>
      </div>
    ` : '';

    container.innerHTML = `
      <div class="collab-input-step">
        ${projectInfo}
        <h3 style="margin-bottom: 16px; color: var(--primary);">📋 描述你的协同目标</h3>
        <p style="color: var(--text-secondary); margin-bottom: 16px; font-size: 14px;">
          AI会分析你的目标，推荐最佳的数字员工组合和协同方案
        </p>

        <textarea
          id="collabGoalInput"
          placeholder="例如：开发一个电商网站，包含商品管理、购物车、支付功能"
          rows="4"
          style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px; resize: vertical; font-family: inherit;"
        >${defaultGoal}</textarea>

        <div style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 12px;">
          <button class="btn-secondary" onclick="window.collaborationModal.close()">
            取消
          </button>
          <button class="btn-primary" id="collabStartBtn">
            开始分析 →
          </button>
        </div>
      </div>
    `;

    // 绑定开始分析按钮
    document.getElementById('collabStartBtn').onclick = this.handleStartAnalysis;
  }

  /**
   * 处理开始分析
   */
  async handleStartAnalysis() {
    const goal = document.getElementById('collabGoalInput').value.trim();

    if (goal.length < 10) {
      alert('请至少输入10个字符描述你的目标');
      return;
    }

    try {
      // 显示分析中状态
      this.state.setStep('analyzing');
      this.state.setCreating(true);
      this.renderAnalyzingStep();

      // 获取项目上下文
      const projectId = this.state.getProjectId();
      const project = this.state.getProject();

      // 1. 创建协同计划（传入projectId）
      const userId = this.getUserId();
      const createResult = await this.apiClient.createCollaborationPlan(userId, goal, projectId);
      const planId = createResult.planId;

      this.state.createSuccess(planId);

      // 2. AI分析能力（项目模式传入项目Agent列表）
      let agentIds = null;
      if (project && project.assignedAgents && project.assignedAgents.length > 0) {
        agentIds = project.assignedAgents;
        console.log('[CollaborationModal] 项目模式，使用项目Agent:', agentIds);
      } else {
        console.log('[CollaborationModal] 全局模式，使用用户所有Agent');
      }

      const analyzeResult = await this.apiClient.analyzeCollaborationCapability(planId, agentIds);

      this.state.analyzeSuccess(analyzeResult.analysis);

      // 3. 根据分析结果决定下一步
      if (analyzeResult.analysis.isSufficient) {
        // 能力满足，生成协同模式
        await this.handleGenerateModes(planId);
      } else {
        // 能力不足，显示雇佣建议
        this.renderHiringStep();
      }

    } catch (error) {
      console.error('[CollaborationModal] 分析失败:', error);
      this.state.handleError(error);
      alert(`分析失败：${error.message}`);
      this.state.setStep('input');
      this.renderInputStep();
    }
  }

  /**
   * 步骤2：分析中
   */
  renderAnalyzingStep() {
    const container = document.getElementById('collaboration-content');
    if (!container) return;

    container.innerHTML = `
      <div class="collab-analyzing-step" style="text-align: center; padding: 40px 20px;">
        <div class="loading-spinner" style="width: 48px; height: 48px; margin: 0 auto 20px;"></div>
        <h3 style="color: var(--primary); margin-bottom: 12px;">🤖 AI正在深度分析你的团队能力...</h3>
        <p style="color: var(--text-secondary); font-size: 14px; margin-bottom: 8px;">
          正在评估当前数字员工是否能完成协同目标
        </p>
        <p style="color: var(--warning); font-size: 13px; margin-top: 16px; padding: 12px; background: var(--background-secondary); border-radius: 8px; display: inline-block;">
          ⏱️ AI智能分析需要30-60秒，请耐心等待...
        </p>
      </div>
    `;
  }

  /**
   * 步骤3：雇佣建议（能力不足时）
   */
  renderHiringStep() {
    const container = document.getElementById('collaboration-content');
    if (!container) return;

    const analysis = this.state.getCapabilityAnalysis();

    container.innerHTML = `
      <div class="collab-hiring-step">
        <div class="analysis-result insufficient">
          <h3>⚠️ 团队能力不足</h3>
          <p class="confidence">AI置信度：${analysis.confidenceScore}%</p>
        </div>

        ${analysis.roleGaps && analysis.roleGaps.length > 0 ? `
          <div class="role-gaps" style="margin-top: 24px;">
            <h4 style="margin-bottom: 16px;">🎯 推荐雇佣以下Agent：</h4>
            ${analysis.roleGaps.map(gap => `
              <div class="gap-item" style="background: var(--background-secondary); padding: 16px; border-radius: 8px; margin-bottom: 12px;">
                <div class="gap-info">
                  <strong>${gap.role}</strong>
                  <p style="color: var(--text-secondary); margin: 8px 0; font-size: 13px;">${gap.reason}</p>
                </div>
                <button class="btn-hire btn-primary" style="margin-top: 12px;" data-type="${gap.typeId}" data-name="${gap.role}">
                  💼 立即雇佣
                </button>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div class="hiring-status" style="margin-top: 16px; padding: 12px; background: var(--background-tertiary); border-radius: 8px; display: none;">
          <p style="color: var(--success); margin: 0;"></p>
        </div>

        <div class="actions" style="margin-top: 24px; display: flex; justify-content: space-between;">
          <button class="btn-secondary" onclick="window.collaborationModal.state.setStep('input'); window.collaborationModal.renderCurrentStep();">
            ← 返回修改目标
          </button>
          <button class="btn-primary" id="reanalyzeBtn">
            🔄 重新分析能力
          </button>
        </div>
      </div>
    `;

    // 绑定雇佣按钮 - 直接在此面板内完成雇佣
    container.querySelectorAll('.btn-hire').forEach(btn => {
      btn.onclick = async (e) => {
        const typeId = e.target.dataset.type;
        const agentName = e.target.dataset.name;
        await this.handleQuickHire(typeId, agentName, e.target);
      };
    });

    // 绑定重新分析按钮
    document.getElementById('reanalyzeBtn').onclick = async () => {
      try {
        const planId = this.state.getCurrentPlanId();
        this.state.setStep('analyzing');
        this.renderAnalyzingStep();

        const result = await this.apiClient.analyzeCollaborationCapability(planId);
        this.state.analyzeSuccess(result.analysis);

        if (result.analysis.isSufficient) {
          await this.handleGenerateModes(planId);
        } else {
          this.renderHiringStep();
        }
      } catch (error) {
        alert(`重新分析失败：${error.message}`);
      }
    };
  }

  /**
   * 快速雇佣Agent（在协同面板内直接完成）
   */
  async handleQuickHire(agentTypeId, agentName, buttonEl) {
    const originalText = buttonEl.textContent;

    try {
      buttonEl.disabled = true;
      buttonEl.textContent = '⏳ 雇佣中...';

      const userId = this.getUserId();
      const response = await fetch(`${window.state.settings.apiUrl}/api/agents/hire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          agentType: agentTypeId
        })
      });

      if (!response.ok) {
        throw new Error('雇佣失败');
      }

      const result = await response.json();
      if (result.code !== 0) {
        throw new Error(result.error || '雇佣失败');
      }

      // 雇佣成功
      buttonEl.textContent = '✅ 已雇佣';
      buttonEl.style.background = 'var(--success)';

      // 显示成功提示
      const statusEl = document.querySelector('.hiring-status');
      if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.querySelector('p').textContent = `✅ 成功雇佣 ${agentName}！系统将自动重新分析能力...`;
      }

      // 自动重新分析能力（延迟1秒让用户看到成功提示）
      setTimeout(async () => {
        try {
          const planId = this.state.getCurrentPlanId();
          this.state.setStep('analyzing');
          this.renderAnalyzingStep();

          const analyzeResult = await this.apiClient.analyzeCollaborationCapability(planId);
          this.state.analyzeSuccess(analyzeResult.analysis);

          if (analyzeResult.analysis.isSufficient) {
            await this.handleGenerateModes(planId);
          } else {
            this.renderHiringStep();
          }
        } catch (error) {
          console.error('[CollaborationModal] 自动重新分析失败:', error);
          alert('重新分析失败，请手动点击"重新分析能力"按钮');
          this.renderHiringStep();
        }
      }, 1500);

    } catch (error) {
      console.error('[CollaborationModal] 雇佣失败:', error);
      buttonEl.disabled = false;
      buttonEl.textContent = originalText;
      alert(`❌ 雇佣失败: ${error.message}`);
    }
  }

  /**
   * 生成协同模式
   */
  async handleGenerateModes(planId = null) {
    try {
      planId = planId || this.state.getCurrentPlanId();

      this.state.setGenerating(true);

      // 显示生成中状态
      const container = document.getElementById('collaboration-content');
      if (container) {
        container.innerHTML = `
          <div style="text-align: center; padding: 40px 20px;">
            <div class="loading-spinner" style="width: 48px; height: 48px; margin: 0 auto 20px;"></div>
            <h3 style="color: var(--primary); margin-bottom: 12px;">🎯 AI正在设计协同方案...</h3>
            <p style="color: var(--text-secondary); font-size: 14px;">
              正在生成工作流编排、角色推荐和任务分解方案
            </p>
          </div>
        `;
      }

      const result = await this.apiClient.generateCollaborationModes(planId);

      this.state.generateModesSuccess(result.modes);
      this.renderModesStep();

    } catch (error) {
      console.error('[CollaborationModal] 生成模式失败:', error);
      this.state.handleError(error);
      alert(`生成协同模式失败：${error.message}`);
    }
  }

  /**
   * 步骤4：展示三种协同模式
   */
  renderModesStep() {
    const container = document.getElementById('collaboration-content');
    if (!container) return;

    const modes = this.state.getModes();
    if (!modes) return;

    container.innerHTML = `
      <div class="collab-modes-step">
        <h3 style="margin-bottom: 16px; color: var(--primary);">🎯 AI为你设计了智能协同方案</h3>

        <div class="mode-tabs" style="display: flex; gap: 8px; margin-bottom: 20px; border-bottom: 1px solid var(--border-color);">
          <button class="mode-tab active" data-mode="workflow">工作流编排</button>
          <button class="mode-tab" data-mode="role">角色组合</button>
          <button class="mode-tab" data-mode="task">任务分解</button>
        </div>

        <div class="mode-content" id="modeContent" style="min-height: 300px; max-height: 400px; overflow-y: auto;">
          ${this.renderWorkflowMode(modes.workflowOrchestration)}
        </div>

        <div class="actions" style="margin-top: 24px; display: flex; justify-content: flex-end; gap: 12px;">
          <button class="btn-secondary" onclick="window.collaborationModal.close()">
            取消
          </button>
          <button class="btn-primary" id="executeBtn">
            🚀 开始执行协同
          </button>
        </div>
      </div>
    `;

    // Tab切换
    container.querySelectorAll('.mode-tab').forEach(btn => {
      btn.onclick = (e) => {
        container.querySelectorAll('.mode-tab').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        const mode = e.target.dataset.mode;
        const content = document.getElementById('modeContent');

        if (mode === 'workflow') {
          content.innerHTML = this.renderWorkflowMode(modes.workflowOrchestration);
        } else if (mode === 'role') {
          content.innerHTML = this.renderRoleMode(modes.roleRecommendation);
        } else if (mode === 'task') {
          content.innerHTML = this.renderTaskMode(modes.taskDecomposition);
        }
      };
    });

    // 执行按钮
    document.getElementById('executeBtn').onclick = this.handleExecute;
  }

  /**
   * 渲染工作流模式
   */
  renderWorkflowMode(workflow) {
    if (!workflow || !workflow.steps) return '<p>工作流数据不可用</p>';

    return `
      <div class="workflow-visualization">
        ${workflow.steps.map((step, index) => `
          <div class="workflow-step" style="margin-bottom: 12px; padding: 16px; background: var(--background-secondary); border-radius: 8px; border-left: 4px solid var(--primary);">
            <div style="display: flex; align-items: start; gap: 12px;">
              <div class="step-number" style="background: var(--primary); color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0;">
                ${index + 1}
              </div>
              <div style="flex: 1;">
                <div class="agent-badge" style="display: inline-block; background: var(--primary-light); padding: 4px 12px; border-radius: 12px; font-size: 12px; margin-bottom: 8px;">
                  ${step.agentName}
                </div>
                <div class="task-desc" style="color: var(--text-primary); margin-bottom: 8px; font-size: 14px;">
                  ${step.task}
                </div>
                <div class="meta" style="color: var(--text-secondary); font-size: 12px; display: flex; gap: 16px;">
                  <span>⏱️ ~${Math.ceil(step.estimatedDuration / 60)}分钟</span>
                  ${step.dependencies && step.dependencies.length > 0 ? `
                    <span>📎 依赖步骤${step.dependencies.map(d => workflow.steps.findIndex(s => s.stepId === d) + 1).join(',')}</span>
                  ` : ''}
                </div>
              </div>
            </div>
          </div>
        `).join('')}

        <div class="workflow-summary" style="margin-top: 16px; padding: 12px; background: var(--background-tertiary); border-radius: 8px; font-size: 13px;">
          <p><strong>总预估时长：</strong>${Math.ceil(workflow.totalEstimatedDuration / 60)}分钟</p>
          ${workflow.parallelizable && workflow.parallelizable.length > 0 ? `
            <p style="margin-top: 8px; color: var(--success);">💡 步骤${workflow.parallelizable.join(', ')}可并行执行</p>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * 渲染角色组合模式
   */
  renderRoleMode(roleRec) {
    if (!roleRec) return '<p>角色推荐数据不可用</p>';

    return `
      <div class="role-recommendation">
        <div style="margin-bottom: 20px;">
          <h4 style="margin-bottom: 12px; color: var(--primary);">✅ 必选角色</h4>
          ${roleRec.recommended && roleRec.recommended.length > 0 ?
            roleRec.recommended.map(agent => `
              <div style="padding: 12px; background: var(--background-secondary); border-radius: 8px; margin-bottom: 8px;">
                <strong>${agent.agentName}</strong> (${agent.agentType})
                <p style="color: var(--text-secondary); font-size: 13px; margin: 4px 0;">${agent.reason}</p>
                <span style="background: var(--error); color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">${agent.importance}</span>
              </div>
            `).join('')
            : '<p style="color: var(--text-secondary);">无必选角色</p>'
          }
        </div>

        ${roleRec.optional && roleRec.optional.length > 0 ? `
          <div>
            <h4 style="margin-bottom: 12px; color: var(--text-secondary);">💡 可选角色</h4>
            ${roleRec.optional.map(agent => `
              <div style="padding: 12px; background: var(--background-tertiary); border-radius: 8px; margin-bottom: 8px;">
                <strong>${agent.agentName || agent.agentType}</strong>
                <p style="color: var(--text-secondary); font-size: 13px; margin: 4px 0;">${agent.reason}</p>
                <p style="color: var(--success); font-size: 12px;">💎 ${agent.benefit}</p>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * 渲染任务分解模式
   */
  renderTaskMode(taskDec) {
    if (!taskDec || !taskDec.mainTasks) return '<p>任务分解数据不可用</p>';

    return `
      <div class="task-decomposition">
        ${taskDec.mainTasks.map((task, index) => `
          <div style="margin-bottom: 16px; padding: 16px; background: var(--background-secondary); border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
              <div>
                <h4 style="color: var(--primary); margin-bottom: 4px;">${index + 1}. ${task.title}</h4>
                <p style="color: var(--text-secondary); font-size: 13px;">${task.description}</p>
              </div>
              <span style="background: var(--primary-light); padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                ${task.assignedAgent.agentName}
              </span>
            </div>

            ${task.subtasks && task.subtasks.length > 0 ? `
              <div style="margin-top: 12px;">
                <strong style="font-size: 13px;">子任务：</strong>
                <ul style="margin: 8px 0; padding-left: 20px; font-size: 13px; color: var(--text-secondary);">
                  ${task.subtasks.map(sub => `<li>${sub}</li>`).join('')}
                </ul>
              </div>
            ` : ''}

            ${task.deliverables && task.deliverables.length > 0 ? `
              <div style="margin-top: 8px; font-size: 12px; color: var(--success);">
                📦 交付物: ${task.deliverables.join(', ')}
              </div>
            ` : ''}
          </div>
        `).join('')}

        <div style="margin-top: 16px; padding: 12px; background: var(--background-tertiary); border-radius: 8px; font-size: 13px;">
          <p><strong>总任务数：</strong>${taskDec.totalTasks}</p>
          ${taskDec.criticalPath && taskDec.criticalPath.length > 0 ? `
            <p style="margin-top: 8px; color: var(--error);">🔥 关键路径: ${taskDec.criticalPath.join(' → ')}</p>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * 处理执行
   */
  async handleExecute() {
    const planId = this.state.getCurrentPlanId();
    if (!planId) return;

    try {
      this.state.startExecution();
      this.renderExecutingStep();

      const result = await this.apiClient.executeCollaborationPlan(planId, 'workflow');

      this.state.executeSuccess(result);
      this.renderCompletedStep();

    } catch (error) {
      console.error('[CollaborationModal] 执行失败:', error);
      this.state.handleError(error);
      alert(`执行失败：${error.message}`);
      this.state.setStep('modes');
      this.renderModesStep();
    }
  }

  /**
   * 步骤5：执行中
   */
  renderExecutingStep() {
    const container = document.getElementById('collaboration-content');
    if (!container) return;

    container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <div class="loading-spinner" style="width: 48px; height: 48px; margin: 0 auto 20px;"></div>
        <h3 style="color: var(--primary); margin-bottom: 12px;">⚙️ 协同执行中...</h3>
        <p style="color: var(--text-secondary); font-size: 14px;">
          数字员工正在按照工作流顺序执行任务
        </p>
        <div id="execution-progress" style="margin-top: 20px; text-align: left; max-width: 500px; margin-left: auto; margin-right: auto;">
          <!-- 进度信息会动态更新 -->
        </div>
      </div>
    `;
  }

  /**
   * 步骤6：完成
   */
  renderCompletedStep() {
    const container = document.getElementById('collaboration-content');
    if (!container) return;

    const progress = this.state.getExecutionProgress();
    const result = progress?.result;
    const project = this.state.getProject();

    // 如果是项目模式，保存结果到项目
    if (project) {
      this.saveResultToProject(project, result);
    }

    container.innerHTML = `
      <div class="collab-completed-step">
        <div style="text-align: center; padding: 20px;">
          <div style="width: 64px; height: 64px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 32px; color: white;">
            ✓
          </div>
          <h3 style="color: #10b981; margin-bottom: 12px;">协同执行完成！</h3>
          <p style="color: var(--text-secondary); font-size: 14px;">
            ${result?.totalSteps || 0}个步骤已全部完成
          </p>
          ${project ? `
            <p style="color: var(--text-secondary); font-size: 13px; margin-top: 8px;">
              ✅ 结果已自动保存到【${project.name}】项目
            </p>
          ` : ''}
        </div>

        <div style="margin-top: 24px; padding: 20px; background: var(--bg-secondary); border-radius: 8px; max-height: 300px; overflow-y: auto;">
          <h4 style="margin-bottom: 12px;">📊 执行结果汇总：</h4>
          <pre style="white-space: pre-wrap; font-size: 13px; line-height: 1.6; color: var(--text-primary);">${result?.summary || '无结果汇总'}</pre>
        </div>

        <div style="margin-top: 24px; display: flex; justify-content: center; gap: 12px;">
          ${project ? `
            <button class="btn-secondary" onclick="window.collaborationModal.closeAndRefreshProject('${project.id}')">
              返回项目
            </button>
          ` : `
            <button class="btn-secondary" onclick="window.collaborationModal.close()">
              关闭
            </button>
          `}
          <button class="btn-primary" id="copyResultBtn">
            📋 复制结果
          </button>
        </div>
      </div>
    `;

    // 绑定复制按钮
    setTimeout(() => {
      const copyBtn = document.getElementById('copyResultBtn');
      if (copyBtn) {
        copyBtn.onclick = () => {
          navigator.clipboard.writeText(result?.summary || '').then(() => {
            copyBtn.textContent = '✓ 已复制';
            setTimeout(() => {
              copyBtn.innerHTML = '📋 复制结果';
            }, 2000);
          }).catch(err => {
            console.error('复制失败:', err);
            alert('复制失败，请手动复制');
          });
        };
      }
    }, 100);
  }

  /**
   * 保存结果到项目
   */
  saveResultToProject(project, result) {
    try {
      const plan = this.state.getCurrentPlan() || {};
      const modes = this.state.getModes();

      // 初始化collaborations数组
      if (!project.collaborations) {
        project.collaborations = [];
      }

      // 构建协同记录
      const collabRecord = {
        planId: this.state.getCurrentPlanId(),
        task: plan.goal || '智能协同任务',
        timestamp: new Date().toISOString(),
        teamMembers: this.extractTeamMembers(modes),
        result: result?.summary || '执行完成',
        workflow: modes?.workflowOrchestration || null
      };

      // 保存到项目
      project.collaborations.push(collabRecord);

      // 更新localStorage（假设使用state.teamSpace存储）
      if (window.state && window.state.teamSpace) {
        const projectIndex = window.state.teamSpace.projects.findIndex(p => p.id === project.id);
        if (projectIndex !== -1) {
          window.state.teamSpace.projects[projectIndex] = project;
          localStorage.setItem('thinkcraft_teamspace', JSON.stringify(window.state.teamSpace));
          console.log('[CollaborationModal] 协同结果已保存到项目:', project.id);
        }
      }
    } catch (error) {
      console.error('[CollaborationModal] 保存结果到项目失败:', error);
    }
  }

  /**
   * 从协同模式中提取团队成员信息
   */
  extractTeamMembers(modes) {
    if (!modes) return [];

    const members = [];
    const seenAgents = new Set();

    // 从工作流中提取
    if (modes.workflowOrchestration && modes.workflowOrchestration.steps) {
      modes.workflowOrchestration.steps.forEach(step => {
        if (step.agentName && !seenAgents.has(step.agentName)) {
          members.push({
            name: step.agentName,
            type: step.agentType || 'unknown'
          });
          seenAgents.add(step.agentName);
        }
      });
    }

    return members;
  }

  /**
   * 关闭并刷新项目页面
   */
  closeAndRefreshProject(projectId) {
    this.close();
    // 刷新项目详情页（如果有全局函数）
    if (typeof showProjectDetail === 'function') {
      showProjectDetail(projectId);
    }
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CollaborationModal;
}
