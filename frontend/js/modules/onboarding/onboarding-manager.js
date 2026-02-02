/**
 * 新手引导管理器
 * 负责首次登录用户的产品引导流程
 *
 * @module OnboardingManager
 * @description 提供交互式的新手引导，帮助用户了解产品核心功能
 */

/* eslint-disable no-undef */

// 创建日志实例
var logger = window.createLogger ? window.createLogger('Onboarding') : console;


class OnboardingManager {
  constructor() {
    this.onboardingContext = {
      mockProject: null,
      mockPanelShown: false,
      cleanup: []
    };
    this.currentStep = 0;
    this.steps = [];
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

    if (!isLoggedIn) return;

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
        onEnter: () => {
          if (typeof switchSidebarTab === 'function') {
            switchSidebarTab('team');
          }
        }
      },
      {
        title: '查看项目面板',
        desc: '点击项目卡片查看项目详情与流程面板。',
        target: '.project-card',
        onEnter: () => {
          if (typeof switchSidebarTab === 'function') {
            switchSidebarTab('team');
          }
        }
      },
      {
        title: '项目详情面板',
        desc: '这里展示项目概览、流程阶段与交付物。',
        target: '#projectPanel',
        onEnter: () => {
          if (typeof switchSidebarTab === 'function') {
            switchSidebarTab('team');
          }
          setTimeout(() => {
            if (this.onboardingContext.mockProject) {
              this.showMockProjectPanel();
              return;
            }
            const firstCard = document.querySelector('.project-card');
            if (firstCard && typeof window.projectManager?.openProject === 'function') {
              window.projectManager.openProject(firstCard.dataset.projectId);
            }
          }, 100);
        }
      }
    ];
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
      title.textContent = '示例项目详情';
    }
    body.innerHTML = `
      <div style="padding: 16px;">
        <div style="border-radius: 12px; padding: 16px; background: #f8fafc; border: 1px solid var(--border); margin-bottom: 16px;">
          <div style="font-weight: 600; margin-bottom: 8px;">示例：用户洞察平台</div>
          <div style="font-size: 13px; color: var(--text-secondary);">这里会展示项目概览、进度与成员情况，流程阶段由协同模式推荐动态生成。</div>
        </div>
        <div style="display: grid; gap: 12px;">
          <div style="border-radius: 10px; padding: 12px; border: 1px solid var(--border); background: white;">
            <div style="font-weight: 600; margin-bottom: 6px;">阶段示例｜以协同模式为准</div>
            <div style="font-size: 13px; color: var(--text-secondary);">已完成 · 交付物 2</div>
          </div>
          <div style="border-radius: 10px; padding: 12px; border: 1px solid var(--border); background: white;">
            <div style="font-weight: 600; margin-bottom: 6px;">阶段示例｜以协同模式为准</div>
            <div style="font-size: 13px; color: var(--text-secondary);">进行中 · 交付物 1</div>
          </div>
          <div style="border-radius: 10px; padding: 12px; border: 1px solid var(--border); background: white;">
            <div style="font-weight: 600; margin-bottom: 6px;">阶段示例｜以协同模式为准</div>
            <div style="font-size: 13px; color: var(--text-secondary);">待开始 · 交付物 0</div>
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
        logger.warn('⚠️ 示例面板显示超时，自动清理');
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
      const hasMockTitle = title.textContent === '示例项目详情';
      const hasMockBody = body.innerHTML.includes('用户洞察平台') ||
                          body.innerHTML.includes('需求澄清') ||
                          body.innerHTML.includes('方案设计');

      if (hasMockTitle || hasMockBody) {
        panel.style.display = 'none';
        title.textContent = '';
        body.innerHTML = '';
        logger.debug('🧹 已清理示例项目面板');
      }
    }

    // 清理模拟项目卡片（支持多种选择器）
    const mockCards = document.querySelectorAll('.project-card.onboarding-mock, .project-card[data-project-id="onboarding-mock-project"]');
    if (mockCards.length > 0) {
      mockCards.forEach(card => card.remove());
      logger.debug(`🧹 已清理 ${mockCards.length} 个示例卡片`);
    }

    // 清理临时创建的网格容器
    const tempGrids = document.querySelectorAll('[data-onboarding-temp="true"]');
    if (tempGrids.length > 0) {
      tempGrids.forEach(grid => {
        if (grid.childElementCount === 0) {
          grid.remove();
        }
      });
      logger.debug(`🧹 已清理 ${tempGrids.length} 个临时容器`);
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

logger.debug('✅ OnboardingManager 模块已加载');
