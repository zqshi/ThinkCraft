/**
 * 新手引导管理器
 * 负责首次登录用户的产品引导流程
 *
 * @module OnboardingManager
 * @description 提供交互式的新手引导，帮助用户了解产品核心功能
 */

/* eslint-disable no-undef */

// 创建日志实例
const onboardingLogger =
  window.__onboardingLogger ||
  (window.__onboardingLogger = window.createLogger ? window.createLogger('Onboarding') : console);


class OnboardingManager {
  constructor() {
    this.onboardingContext = {
      mockProject: null,
      mockPanelShown: false,
      cleanup: [],
      tempTeamTab: null,
      forceMockProject: false
    };
    this.currentStep = 0;
    this.steps = [];
  }

  /**
   * 判断项目面板是否展示真实项目（非示例）
   */
  isRealProjectPanel() {
    const panel = document.getElementById('projectPanel');
    const body = document.getElementById('projectPanelBody');
    const title = document.getElementById('projectPanelTitle');
    if (!panel || !body || !title) {
      return false;
    }
    if (panel.style.display === 'none') {
      return false;
    }
    if (!title.textContent || title.textContent === '示例项目详情' || title.textContent === '示例项目：用户洞察平台') {
      return false;
    }
    const bodyText = body.textContent || '';
    if (!bodyText.trim()) {
      return false;
    }
    if (bodyText.includes('用户洞察平台') || bodyText.includes('阶段示例')) {
      return false;
    }
    return true;
  }

  /**
   * 初始化新手引导
   * 检查用户是否已完成引导，如果未完成则启动引导流程
   */
  init() {
    const isLoggedIn = sessionStorage.getItem('thinkcraft_logged_in') === 'true';
    let userKey = null;
    try {
      const rawUser = sessionStorage.getItem('thinkcraft_user');
      if (rawUser) {
        const user = JSON.parse(rawUser);
        userKey = user?.userId || user?.id || user?.phone || null;
      }
    } catch (e) {
      userKey = null;
    }
    const onboardingKey = userKey
      ? `thinkcraft_onboarding_done_${userKey}`
      : 'thinkcraft_onboarding_done';
    const hasDone = localStorage.getItem(onboardingKey) === 'true';

    // 如果已完成引导，清理可能残留的示例内容
    if (hasDone) {
      this.cleanupMockContent();
      return;
    }

    if (!isLoggedIn) {return;}

    this.onboardingKey = onboardingKey;
    this.setupElements();
    this.setupSteps();
    this.start();
  }

  /**
   * 设置 DOM 元素引用
   */
  setupElements() {
    this.overlay = document.getElementById('onboardingOverlay');
    this.highlight = document.getElementById('onboardingHighlight');
    this.tooltip = document.getElementById('onboardingTooltip');
    this.chipEl = document.getElementById('onboardingChip');
    this.titleEl = document.getElementById('onboardingTitle');
    this.descEl = document.getElementById('onboardingDesc');
    this.stepEl = document.getElementById('onboardingStep');
    this.btnPrev = document.getElementById('onboardingPrev');
    this.btnNext = document.getElementById('onboardingNext');
    this.btnSkip = document.getElementById('onboardingSkip');
  }

  /**
   * 设置引导步骤
   */
  setupSteps() {
    this.steps = [
      {
        title: '新建对话',
        desc: '从这里开始创建一个新的创意对话。',
        target: '.new-chat-btn',
        onEnter: () => {
          if (typeof switchSidebarTab === 'function') {
            switchSidebarTab('chats');
          }
        }
      },
      {
        title: '输入想法',
        desc: '在这里输入你的创意或需求，支持回车发送。',
        target: '#mainInput'
      },
      {
        title: '开启团队功能',
        desc: '在设置里打开数字员工团队开关，解锁项目空间。',
        target: () => document.getElementById('enableTeamToggle') || document.getElementById('enableTeamToggle2'),
        onEnter: () => {
          if (typeof showSettings === 'function') {
            showSettings();
          } else if (typeof openBottomSettings === 'function') {
            openBottomSettings();
          }
        },
        onExit: () => {
          if (typeof closeSettings === 'function') {
            closeSettings();
          } else if (typeof closeBottomSettings === 'function') {
            closeBottomSettings();
          }
        }
      },
      {
        title: '切换项目空间',
        desc: '点击这里进入项目空间查看你的项目。',
        target: '#teamTab',
        section: '项目空间',
        onEnter: () => {
          this.ensureTeamTabVisibleForOnboarding();
          if (typeof switchSidebarTab === 'function') {
            switchSidebarTab('team');
          }
        }
      },
      {
        title: '查看项目面板',
        desc: '点击项目卡片查看项目详情与流程面板。',
        target: '.project-card',
        section: '项目空间',
        onEnter: () => {
          this.ensureTeamTabVisibleForOnboarding();
          if (typeof switchSidebarTab === 'function') {
            switchSidebarTab('team');
          }
          if (!this.hasRealProjects()) {
            this.onboardingContext.forceMockProject = true;
            this.onboardingContext.mockProject = this.ensureMockProjectCard();
          } else {
            this.onboardingContext.forceMockProject = false;
          }
        }
      },
      {
        title: '项目详情面板',
        desc: '这里展示项目概览、流程阶段与交付物。',
        target: '#projectPanel',
        section: '项目空间',
        onEnter: () => {
          this.ensureTeamTabVisibleForOnboarding();
          if (typeof switchSidebarTab === 'function') {
            switchSidebarTab('team');
          }
          const openProjectPanel = (retry = 0) => {
            const hasReal = this.hasRealProjects();
            if (!hasReal || this.onboardingContext.forceMockProject) {
              this.onboardingContext.forceMockProject = true;
              if (!this.onboardingContext.mockProject) {
                this.onboardingContext.mockProject = this.ensureMockProjectCard();
              }
              this.showMockProjectPanel();
              return;
            }

            const realCard = this.getRealProjectCard();
            if (realCard && typeof window.projectManager?.openProject === 'function') {
              this.onboardingContext.mockProject = null;
              this.cleanupMockContent();
              window.projectManager.openProject(realCard.dataset.projectId);
              setTimeout(() => {
                if (!this.isRealProjectPanel() && retry < 5) {
                  openProjectPanel(retry + 1);
                }
              }, 200);
              return;
            }

            if (retry < 5) {
              setTimeout(() => openProjectPanel(retry + 1), 200);
              return;
            }

            this.onboardingContext.forceMockProject = true;
            this.onboardingContext.mockProject = this.ensureMockProjectCard();
            this.showMockProjectPanel();
          };
          setTimeout(() => openProjectPanel(), 100);
        }
      }
    ];
  }

  /**
   * 确保项目空间 Tab 在引导中可见
   */
  ensureTeamTabVisibleForOnboarding() {
    const teamTab = document.getElementById('teamTab');
    const sidebarTabs = document.querySelector('.sidebar-tabs');
    if (!teamTab) {
      return;
    }
    const rect = teamTab.getBoundingClientRect();
    const isHidden = teamTab.style.display === 'none' || rect.width === 0 || rect.height === 0;
    if (!isHidden) {
      return;
    }
    const prevDisplay = teamTab.style.display;
    const prevSidebarActive = sidebarTabs ? sidebarTabs.classList.contains('active') : null;
    teamTab.style.display = 'flex';
    if (sidebarTabs) {
      sidebarTabs.classList.add('active');
    }
    const cleanup = () => {
      teamTab.style.display = prevDisplay;
      if (sidebarTabs && prevSidebarActive === false) {
        sidebarTabs.classList.remove('active');
      }
    };
    this.onboardingContext.cleanup.push(cleanup);
  }

  /**
   * 是否存在真实项目
   */
  hasRealProjects() {
    if (window.projectManager?.projects) {
      return window.projectManager.projects.some(project => project.status !== 'deleted');
    }
    return Boolean(this.getRealProjectCard());
  }

  /**
   * 获取真实项目卡片
   */
  getRealProjectCard() {
    return document.querySelector(
      '.project-card:not(.onboarding-mock)[data-project-id]:not([data-project-id="onboarding-mock-project"])'
    );
  }

  /**
   * 确保存在模拟项目卡片（用于引导演示）
   */
  ensureMockProjectCard() {
    if (document.querySelector('.project-card')) {
      return null;
    }
    const container = document.getElementById('projectListContainer');
    if (!container) {
      return null;
    }

    let list = container.querySelector('.project-list');
    let createdList = false;
    if (!list) {
      list = document.createElement('div');
      list.className = 'project-list';
      container.appendChild(list);
      createdList = true;
    }

    let grid = list.querySelector('.project-list-grid');
    let createdGrid = false;
    if (!grid) {
      grid = document.createElement('div');
      grid.className = 'project-list-grid';
      grid.dataset.onboardingTemp = 'true';
      list.appendChild(grid);
      createdGrid = true;
    }

    const emptyState = list.querySelector('.project-list-empty');
    const emptyDisplay = emptyState ? emptyState.style.display : '';
    if (emptyState) {
      emptyState.style.display = 'none';
    }

    const card = document.createElement('div');
    card.className = 'project-card onboarding-mock';
    card.dataset.projectId = 'onboarding-mock-project';
    card.innerHTML = `
      <div class="project-card-head">
        <div class="project-card-title-row">
          <div class="project-card-title">示例项目：用户洞察平台</div>
        </div>
        <div class="project-card-badges">
          <span class="project-pill status-planning">规划中</span>
        </div>
        <div class="project-card-meta">
          <span>更新 刚刚</span>
          <span class="project-card-meta-dot"></span>
          <span>阶段 4</span>
          <span class="project-card-meta-dot"></span>
          <span>待完成 3</span>
        </div>
      </div>
      <div class="project-card-kpis">
        <div class="project-card-kpi">
          <span>成员</span>
          <strong>3</strong>
        </div>
        <div class="project-card-kpi">
          <span>创意</span>
          <strong>2</strong>
        </div>
        <div class="project-card-kpi">
          <span>进度</span>
          <strong>25%</strong>
        </div>
      </div>
      <div class="project-card-progress-row">
        <div class="project-card-progress-label">进度 25%</div>
        <div class="project-card-progress">
          <span style="width: 25%;"></span>
        </div>
      </div>
    `;
    card.addEventListener('click', (event) => event.preventDefault());
    grid.prepend(card);

    this.onboardingContext.cleanup.push(() => {
      card.remove();
      if (emptyState) {
        emptyState.style.display = emptyDisplay;
      }
      if (createdGrid && grid.childElementCount === 0) {
        grid.remove();
      }
      if (createdList && list.childElementCount === 0) {
        list.remove();
      }
    });

    return card;
  }

  /**
   * 显示模拟项目面板（用于引导演示）
   */
  showMockProjectPanel() {
    if (this.onboardingContext.mockPanelShown) {
      return;
    }
    const panel = document.getElementById('projectPanel');
    const body = document.getElementById('projectPanelBody');
    const title = document.getElementById('projectPanelTitle');
    if (!panel || !body) {
      return;
    }

    const previousDisplay = panel.style.display;
    const previousTitle = title ? title.textContent : '';
    const previousBody = body.innerHTML;

    panel.style.display = 'block';
    if (title) {
      title.textContent = '示例项目：用户洞察平台';
    }
    body.innerHTML = `
      <div class="project-panel-hero">
        <div class="project-panel-badges">
          <span class="project-pill status-planning">规划中</span>
          <span class="project-pill">产品研发</span>
          <span class="project-pill">进度 25%</span>
          <span class="project-pill" style="background: #eef2ff; color: #4338ca;">引导示例</span>
        </div>
        <div class="project-panel-meta">
          <span>更新时间 刚刚</span>
          <span>成员 3</span>
          <span>创意 2</span>
          <span>待完成 3</span>
        </div>
        <div class="project-panel-hero-actions">
          <button class="btn-secondary">更换创意</button>
          <button class="btn-secondary">预览入口</button>
        </div>
      </div>
      <div class="project-panel-layout">
        <div class="project-panel-section project-panel-card">
          <div class="project-panel-section-title">项目概览</div>
          <div class="project-panel-summary">
            <div>
              <div class="project-panel-summary-label">成员</div>
              <div class="project-panel-summary-value">3</div>
            </div>
            <div>
              <div class="project-panel-summary-label">创意</div>
              <div class="project-panel-summary-value">2</div>
            </div>
            <div>
              <div class="project-panel-summary-label">阶段</div>
              <div class="project-panel-summary-value">4</div>
            </div>
            <div>
              <div class="project-panel-summary-label">进度</div>
              <div class="project-panel-summary-value">25%</div>
            </div>
          </div>
          <div class="project-panel-quick-actions">
            <button class="btn-secondary">协同模式</button>
          </div>
        </div>
        <div class="project-panel-section project-panel-card project-panel-span-2">
          <div class="project-panel-section-title">流程阶段</div>
          <div class="project-workflow-steps">
            <div class="workflow-step status-completed selected" data-stage-id="mock-stage-1">
              <div class="workflow-step-icon">
                <span>🔎</span>
                <span class="workflow-step-status">✅</span>
              </div>
              <div class="workflow-step-title">需求洞察</div>
              <div class="workflow-step-connector"></div>
            </div>
            <div class="workflow-step status-active" data-stage-id="mock-stage-2">
              <div class="workflow-step-icon">
                <span>🧭</span>
                <span class="workflow-step-status">⚡</span>
              </div>
              <div class="workflow-step-title">方案设计</div>
              <div class="workflow-step-connector"></div>
            </div>
            <div class="workflow-step status-pending" data-stage-id="mock-stage-3">
              <div class="workflow-step-icon">
                <span>🧪</span>
                <span class="workflow-step-status">⏸️</span>
              </div>
              <div class="workflow-step-title">验证迭代</div>
              <div class="workflow-step-connector"></div>
            </div>
            <div class="workflow-step status-pending" data-stage-id="mock-stage-4">
              <div class="workflow-step-icon">
                <span>🚀</span>
                <span class="workflow-step-status">⏸️</span>
              </div>
              <div class="workflow-step-title">交付上线</div>
              <div class="workflow-step-connector"></div>
            </div>
          </div>
          <div class="workflow-stage-detail active" data-stage-id="mock-stage-1">
            <div class="workflow-stage-detail-header">
              <div class="workflow-stage-detail-title">
                <span style="font-size: 36px;">🔎</span>
                <div>
                  <h3>需求洞察</h3>
                  <p style="margin: 4px 0 0 0; font-size: 14px; color: #6b7280;">
                    提炼目标用户与关键问题，明确真实需求。
                  </p>
                </div>
              </div>
              <div class="workflow-stage-detail-badge" style="background: #10b981;">
                已完成
              </div>
            </div>
            <div class="workflow-stage-detail-content">
              <div class="workflow-stage-artifacts">
                <div class="workflow-stage-artifacts-title">
                  <span>📦</span>
                  <span>已生成交付物 (2)</span>
                </div>
                <div class="workflow-stage-artifacts-grid">
                  <div class="workflow-stage-artifact-card" style="opacity: 0.8; cursor: default;">
                    <span class="workflow-stage-artifact-icon">📄</span>
                    <div class="workflow-stage-artifact-info">
                      <div class="workflow-stage-artifact-name">用户画像</div>
                      <div class="workflow-stage-artifact-type">示例交付物</div>
                    </div>
                  </div>
                  <div class="workflow-stage-artifact-card" style="opacity: 0.8; cursor: default;">
                    <span class="workflow-stage-artifact-icon">📄</span>
                    <div class="workflow-stage-artifact-info">
                      <div class="workflow-stage-artifact-name">需求清单</div>
                      <div class="workflow-stage-artifact-type">示例交付物</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="project-panel-section project-panel-card project-panel-span-2">
          <div class="project-panel-section-title">项目成员</div>
          <div class="project-panel-list agent-market-grid">
            <div class="agent-card">
              <div class="agent-card-header">
                <div class="agent-card-avatar">PM</div>
                <div class="agent-card-title">产品负责人</div>
              </div>
              <div class="agent-card-desc">规划方向与关键目标</div>
            </div>
            <div class="agent-card">
              <div class="agent-card-header">
                <div class="agent-card-avatar">UX</div>
                <div class="agent-card-title">体验设计师</div>
              </div>
              <div class="agent-card-desc">输出交互与视觉方案</div>
            </div>
            <div class="agent-card">
              <div class="agent-card-header">
                <div class="agent-card-avatar">ENG</div>
                <div class="agent-card-title">研发工程师</div>
              </div>
              <div class="agent-card-desc">推进交付与验证</div>
            </div>
          </div>
        </div>
        <div class="project-panel-section project-panel-card project-panel-span-2">
          <div class="project-panel-section-title">创意详情</div>
          <div class="project-panel-list">
            <div class="project-idea-card">
              <div class="project-idea-title">示例：用户洞察平台</div>
              <div class="project-idea-desc">整合访谈与数据分析，快速识别真实需求与机会。</div>
            </div>
          </div>
        </div>
      </div>
    `;
    this.onboardingContext.mockPanelShown = true;

    // 添加清理函数
    const cleanup = () => {
      panel.style.display = previousDisplay || 'none';
      if (title) {
        title.textContent = previousTitle;
      }
      body.innerHTML = previousBody;
      this.onboardingContext.mockPanelShown = false;
    };

    this.onboardingContext.cleanup.push(cleanup);

    // 安全措施：30秒后自动清理（防止引导异常退出导致内容残留）
    const autoCleanupTimer = setTimeout(() => {
      if (this.onboardingContext.mockPanelShown) {
        onboardingLogger.warn('⚠️ 示例面板显示超时，自动清理');
        cleanup();
      }
    }, 30000);

    // 确保定时器也会被清理
    this.onboardingContext.cleanup.push(() => clearTimeout(autoCleanupTimer));
  }

  /**
   * 完成引导流程
   */
  finish() {
    this.overlay.style.display = 'none';
    localStorage.setItem(this.onboardingKey, 'true');
    this.onboardingContext.cleanup.forEach(cleanup => cleanup());
    this.onboardingContext.cleanup = [];

    if (typeof closeSettings === 'function') {
      closeSettings();
    } else if (typeof closeBottomSettings === 'function') {
      closeBottomSettings();
    }

    if (window.projectManager) {
      window.projectManager.closeProjectPanel();
    }

    if (typeof switchSidebarTab === 'function') {
      switchSidebarTab('chats');
    }

    // 额外清理：确保示例内容被移除
    this.cleanupMockContent();
  }

  /**
   * 清理可能残留的示例内容
   */
  cleanupMockContent() {
    // 清理示例项目面板内容
    const panel = document.getElementById('projectPanel');
    const body = document.getElementById('projectPanelBody');
    const title = document.getElementById('projectPanelTitle');

    if (panel && body && title) {
      // 检查是否是示例内容（标题或内容包含示例文本）
      const hasMockTitle = title.textContent === '示例项目详情' ||
                           title.textContent === '示例项目：用户洞察平台';
      const hasMockBody = body.innerHTML.includes('用户洞察平台') ||
                          body.innerHTML.includes('引导示例') ||
                          body.innerHTML.includes('阶段示例') ||
                          body.innerHTML.includes('需求澄清') ||
                          body.innerHTML.includes('方案设计');

      if (hasMockTitle || hasMockBody) {
        panel.style.display = 'none';
        title.textContent = '';
        body.innerHTML = '';
        onboardingLogger.debug('🧹 已清理示例项目面板');
      }
    }

    // 清理模拟项目卡片（支持多种选择器）
    const mockCards = document.querySelectorAll('.project-card.onboarding-mock, .project-card[data-project-id="onboarding-mock-project"]');
    if (mockCards.length > 0) {
      mockCards.forEach(card => card.remove());
      onboardingLogger.debug(`🧹 已清理 ${mockCards.length} 个示例卡片`);
    }

    // 清理临时创建的网格容器
    const tempGrids = document.querySelectorAll('[data-onboarding-temp="true"]');
    if (tempGrids.length > 0) {
      tempGrids.forEach(grid => {
        if (grid.childElementCount === 0) {
          grid.remove();
        }
      });
      onboardingLogger.debug(`🧹 已清理 ${tempGrids.length} 个临时容器`);
    }

    // 重置上下文
    this.onboardingContext.mockPanelShown = false;
    this.onboardingContext.mockProject = null;
  }

  /**
   * 定位提示框
   */
  positionTooltip(rect) {
    const padding = 12;
    const tooltipRect = this.tooltip.getBoundingClientRect();
    let top = rect.bottom + padding;
    let left = rect.left;

    if (top + tooltipRect.height > window.innerHeight) {
      top = rect.top - tooltipRect.height - padding;
    }
    if (left + tooltipRect.width > window.innerWidth) {
      left = window.innerWidth - tooltipRect.width - padding;
    }
    if (left < padding) {
      left = padding;
    }
    if (top < padding) {
      top = padding;
    }

    this.tooltip.style.top = `${top}px`;
    this.tooltip.style.left = `${left}px`;
  }

  /**
   * 显示指定步骤
   */
  showStep(index, retry = 0) {
    if (index < 0 || index >= this.steps.length) {
      this.finish();
      return;
    }

    const prevStep = this.steps[this.currentStep];
    if (prevStep && typeof prevStep.onExit === 'function') {
      prevStep.onExit();
    }

    this.currentStep = index;
    const step = this.steps[this.currentStep];

    if ((step.target === '.project-card' || step.target === '#projectPanel') && !document.querySelector('.project-card')) {
      this.onboardingContext.mockProject = this.ensureMockProjectCard();
    }

    if (typeof step.onEnter === 'function') {
      step.onEnter();
    }

    const target = typeof step.target === 'function'
      ? step.target()
      : document.querySelector(step.target);

    if (!target) {
      if (retry < 6) {
        setTimeout(() => this.showStep(index, retry + 1), 200);
        return;
      }
      this.showStep(index + 1);
      return;
    }

    const rect = target.getBoundingClientRect();
    const pad = 6;
    this.highlight.style.top = `${rect.top - pad}px`;
    this.highlight.style.left = `${rect.left - pad}px`;
    this.highlight.style.width = `${rect.width + pad * 2}px`;
    this.highlight.style.height = `${rect.height + pad * 2}px`;

    this.titleEl.textContent = step.title;
    this.descEl.textContent = step.desc;
    this.stepEl.textContent = `${this.currentStep + 1} / ${this.steps.length}`;
    if (this.chipEl) {
      const section = step.section || '引导';
      this.chipEl.textContent = `${section} · ${this.currentStep + 1}/${this.steps.length}`;
      this.chipEl.style.display = 'inline-flex';
    }

    if (step.section) {
      this.overlay.setAttribute('data-onboarding-section', step.section);
    } else {
      this.overlay.removeAttribute('data-onboarding-section');
    }

    this.btnPrev.disabled = this.currentStep === 0;
    this.btnNext.textContent = this.currentStep === this.steps.length - 1 ? '完成' : '下一步';

    this.positionTooltip(rect);
  }

  /**
   * 启动引导流程
   */
  start() {
    this.onboardingContext.mockProject = this.ensureMockProjectCard();

    this.btnPrev.addEventListener('click', () => this.showStep(this.currentStep - 1));
    this.btnNext.addEventListener('click', () => this.showStep(this.currentStep + 1));
    this.btnSkip.addEventListener('click', () => this.finish());
    window.addEventListener('resize', () => this.showStep(this.currentStep));

    this.overlay.style.display = 'block';
    this.showStep(0);
  }
}

// 创建全局实例
if (typeof window !== 'undefined') {
  window.onboardingManager = new OnboardingManager();

  // 页面加载时清理可能残留的示例内容
  // 使用 setTimeout 确保 DOM 完全加载后再执行清理
  const performCleanup = () => {
    if (window.onboardingManager && typeof window.onboardingManager.cleanupMockContent === 'function') {
      window.onboardingManager.cleanupMockContent();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(performCleanup, 100);
    });
  } else if (document.readyState === 'interactive' || document.readyState === 'complete') {
    // DOM 已加载，延迟执行确保所有元素都已渲染
    setTimeout(performCleanup, 100);
  }
}

// 暴露全局函数（向后兼容）
function initOnboarding() {
  if (window.onboardingManager) {
    window.onboardingManager.init();
  }
}

// 暴露到window对象
window.initOnboarding = initOnboarding;

onboardingLogger.debug('✅ OnboardingManager 模块已加载');
