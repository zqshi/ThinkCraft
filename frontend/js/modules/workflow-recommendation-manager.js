/**
 * 工作流推荐管理器（前端）
 * 负责AI工作流推荐、模板选择、自定义工作流
 */

class WorkflowRecommendationManager {
  constructor() {
    const savedSettings = JSON.parse(localStorage.getItem('thinkcraft_settings') || '{}');
    this.apiUrl = savedSettings.apiUrl || window.appState?.settings?.apiUrl || window.location.origin;
    this.templates = [];
    this.currentRecommendation = null;
  }

  /**
   * 初始化：加载工作流模板
   */
  async init() {
    try {
      await this.loadTemplates();
    } catch (error) {}
  }

  /**
   * 加载所有工作流模板
   */
  async loadTemplates() {
    try {
      const response = await fetch(`${this.apiUrl}/api/workflow-recommendation/templates`);

      if (!response.ok) {
        throw new Error('加载模板失败');
      }

      const result = await response.json();
      this.templates = result.data.templates || [];

      return this.templates;
    } catch (error) {
      return [];
    }
  }

  /**
   * 分析项目并推荐工作流
   * @param {String} projectName - 项目名称
   * @param {String} projectDescription - 项目描述
   * @param {String} conversation - 创意对话内容
   * @returns {Promise<Object>} 推荐结果
   */
  async analyzeProject(projectName, projectDescription = '', conversation = '') {
    try {
      const response = await fetch(`${this.apiUrl}/api/workflow-recommendation/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName,
          projectDescription,
          conversation
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '分析失败');
      }

      const result = await response.json();
      this.currentRecommendation = result.data;

      return this.currentRecommendation;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 定制工作流
   * @param {String} templateId - 模板ID
   * @param {Array<String>} selectedStages - 选中的阶段ID
   * @returns {Promise<Object>} 定制的工作流
   */
  async customizeWorkflow(templateId, selectedStages) {
    try {
      const response = await fetch(`${this.apiUrl}/api/workflow-recommendation/customize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          selectedStages
        })
      });

      if (!response.ok) {
        throw new Error('定制工作流失败');
      }

      const result = await response.json();
      return result.data.workflow;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 显示工作流推荐对话框
   * @param {String} projectName - 项目名称
   * @param {String} ideaId - 创意ID
   * @param {Function} onConfirm - 确认回调
   */
  async showRecommendationDialog(projectName, ideaId, onConfirm) {
    if (!window.modalManager) {
      return;
    }

    try {
      // 显示加载提示
      window.modalManager.alert('🤖 AI正在分析项目，推荐最佳工作流...', 'info');

      // 获取创意对话内容
      const chat = await window.storageManager.getChat(ideaId);
      const conversation = chat
        ? chat.messages.map(m => `${m.role}: ${m.content}`).join('\n\n')
        : '';

      // 分析项目
      const recommendation = await this.analyzeProject(projectName, '', conversation);

      // 关闭加载提示
      window.modalManager.close();

      // 渲染推荐结果
      this.renderRecommendationDialog(recommendation, onConfirm);
    } catch (error) {
      window.modalManager.close();
      window.modalManager.alert('推荐失败: ' + error.message, 'error');
    }
  }

  /**
   * 渲染工作流推荐对话框
   * @param {Object} recommendation - 推荐结果
   * @param {Function} onConfirm - 确认回调
   */
  renderRecommendationDialog(recommendation, onConfirm) {
    const template = recommendation.template;
    const analysis = recommendation.analysis;

    // 置信度颜色
    const confidenceColor =
      analysis.confidence >= 0.8 ? '#10b981' : analysis.confidence >= 0.6 ? '#f59e0b' : '#ef4444';

    // 复杂度标签
    const complexityMap = {
      low: { text: '简单', color: '#10b981' },
      medium: { text: '中等', color: '#f59e0b' },
      high: { text: '复杂', color: '#ef4444' }
    };
    const complexityInfo = complexityMap[analysis.complexity] || complexityMap['medium'];

    // 阶段列表
    const stagesHTML = recommendation.stages
      .map(stage => {
        const priorityBadge = stage.isPriority
          ? '<span style="background: #667eea; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-left: 8px;">核心</span>'
          : '';
        const optionalBadge = stage.isOptional
          ? '<span style="background: #9ca3af; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-left: 8px;">可选</span>'
          : '';

        return `
                <label style="display: flex; align-items: center; padding: 12px; border: 1px solid var(--border); border-radius: 8px; cursor: pointer; transition: all 0.2s;"
                       onmouseover="this.style.background='#f9fafb'"
                       onmouseout="this.style.background='white'">
                    <input type="checkbox" name="selectedStages" value="${stage.id}"
                           ${stage.isPriority ? 'checked disabled' : 'checked'}
                           style="margin-right: 12px;">
                    <span style="flex: 1; font-weight: 500;">${stage.name}</span>
                    ${priorityBadge}
                    ${optionalBadge}
                </label>
            `;
      })
      .join('');

    const contentHTML = `
            <div style="max-height: 70vh; overflow-y: auto; padding: 4px;">
                <!-- AI分析结果 -->
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 20px; margin-bottom: 20px; color: white;">
                    <h3 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600;">🎯 ${template.name}</h3>
                    <p style="margin: 0 0 16px 0; font-size: 14px; opacity: 0.95;">${template.description}</p>

                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
                        <div style="background: rgba(255,255,255,0.15); padding: 12px; border-radius: 8px;">
                            <div style="font-size: 12px; opacity: 0.9; margin-bottom: 4px;">置信度</div>
                            <div style="font-size: 20px; font-weight: 600;">${Math.round(analysis.confidence * 100)}%</div>
                        </div>
                        <div style="background: rgba(255,255,255,0.15); padding: 12px; border-radius: 8px;">
                            <div style="font-size: 12px; opacity: 0.9; margin-bottom: 4px;">预估工期</div>
                            <div style="font-size: 20px; font-weight: 600;">${analysis.estimatedDuration}天</div>
                        </div>
                        <div style="background: rgba(255,255,255,0.15); padding: 12px; border-radius: 8px;">
                            <div style="font-size: 12px; opacity: 0.9; margin-bottom: 4px;">复杂度</div>
                            <div style="font-size: 20px; font-weight: 600;">${complexityInfo.text}</div>
                        </div>
                    </div>
                </div>

                <!-- 推荐理由 -->
                <div style="margin-bottom: 20px; padding: 16px; background: #f0f9ff; border-left: 4px solid #3b82f6; border-radius: 8px;">
                    <div style="font-weight: 600; margin-bottom: 8px; color: #1e40af;">💡 推荐理由</div>
                    <div style="color: #1e3a8a; line-height: 1.6;">${analysis.reasoning}</div>
                </div>

                <!-- 工作流阶段选择 -->
                <div style="margin-bottom: 20px;">
                    <h4 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">工作流阶段</h4>
                    <p style="margin: 0 0 16px 0; font-size: 13px; color: var(--text-secondary);">
                        核心阶段不可取消，可选阶段可根据需要调整
                    </p>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        ${stagesHTML}
                    </div>
                </div>

                <!-- AI建议 -->
                ${
  analysis.recommendations.length > 0
    ? `
                    <div style="margin-bottom: 20px;">
                        <h4 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">💬 AI建议</h4>
                        <ul style="margin: 0; padding-left: 20px; color: var(--text-secondary);">
                            ${analysis.recommendations.map(rec => `<li style="margin-bottom: 8px;">${rec}</li>`).join('')}
                        </ul>
                    </div>
                `
    : ''
}

                <!-- 操作按钮 -->
                <div style="display: flex; gap: 12px; padding-top: 16px; border-top: 1px solid var(--border);">
                    <button class="btn-secondary" onclick="window.modalManager.close('workflowRecommendation')" style="flex: 1;">
                        取消
                    </button>
                    <button class="btn-secondary" onclick="workflowRecommendationManager.showCustomWorkflowEditor(${JSON.stringify(onConfirm).replace(/"/g, '&quot;')})" style="flex: 1;">
                        🎨 自定义
                    </button>
                    <button class="btn-secondary" onclick="workflowRecommendationManager.showTemplateSelector(${JSON.stringify(onConfirm).replace(/"/g, '&quot;')})" style="flex: 1;">
                        选择模板
                    </button>
                    <button class="btn-primary" onclick="workflowRecommendationManager.confirmRecommendation(${JSON.stringify(onConfirm).replace(/"/g, '&quot;')})" style="flex: 1;">
                        确认使用
                    </button>
                </div>
            </div>
        `;

    window.modalManager.showCustomModal('🤖 AI工作流推荐', contentHTML, 'workflowRecommendation');

    // 保存当前回调
    this._currentOnConfirm = onConfirm;
  }

  /**
   * 确认使用推荐的工作流
   */
  confirmRecommendation(onConfirm) {
    // 获取选中的阶段
    const checkboxes = document.querySelectorAll('input[name="selectedStages"]:checked');
    const selectedStages = Array.from(checkboxes).map(cb => cb.value);

    if (selectedStages.length === 0) {
      if (window.modalManager) {
        window.modalManager.alert('请至少选择一个阶段', 'warning');
      }
      return;
    }

    // 关闭对话框
    if (window.modalManager) {
      window.modalManager.close('workflowRecommendation');
    }

    // 调用回调
    if (this._currentOnConfirm) {
      this._currentOnConfirm(selectedStages);
    }
  }

  /**
   * 显示模板选择器
   */
  async showTemplateSelector(onConfirm) {
    if (!window.modalManager) {
      return;
    }

    // 确保模板已加载
    if (this.templates.length === 0) {
      await this.loadTemplates();
    }

    // 渲染模板列表
    const templatesHTML = this.templates
      .map(
        template => `
            <div class="template-card" style="border: 2px solid var(--border); border-radius: 12px; padding: 16px; cursor: pointer; transition: all 0.2s;"
                 onclick="workflowRecommendationManager.selectTemplate('${template.id}', ${JSON.stringify(onConfirm).replace(/"/g, '&quot;')})"
                 onmouseover="this.style.borderColor='#667eea'; this.style.background='#f9fafb'"
                 onmouseout="this.style.borderColor='var(--border)'; this.style.background='white'">
                <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">${template.name}</h4>
                <p style="margin: 0 0 12px 0; font-size: 13px; color: var(--text-secondary);">${template.description}</p>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    ${template.stages
    .slice(0, 5)
    .map(stageId => {
      const stage = window.workflowExecutor?.getStageDefinition(stageId);
      return stage
        ? `<span style="background: #f3f4f6; padding: 4px 10px; border-radius: 12px; font-size: 12px;">${stage.icon} ${stage.name}</span>`
        : '';
    })
    .join('')}
                    ${template.stages.length > 5 ? `<span style="background: #f3f4f6; padding: 4px 10px; border-radius: 12px; font-size: 12px;">+${template.stages.length - 5}</span>` : ''}
                </div>
            </div>
        `
      )
      .join('');

    const contentHTML = `
            <div style="max-height: 70vh; overflow-y: auto; padding: 4px;">
                <p style="margin: 0 0 20px 0; color: var(--text-secondary); font-size: 14px;">
                    选择一个适合你项目的工作流模板
                </p>
                <div style="display: grid; gap: 12px;">
                    ${templatesHTML}
                </div>
            </div>
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border); display: flex; gap: 12px;">
                <button class="btn-secondary" onclick="window.modalManager.close('templateSelector')" style="flex: 1;">
                    返回
                </button>
                <button class="btn-secondary" onclick="workflowRecommendationManager.showCustomWorkflowEditor(${JSON.stringify(onConfirm).replace(/"/g, '&quot;')})" style="flex: 1;">
                    🎨 自定义工作流
                </button>
            </div>
        `;

    window.modalManager.showCustomModal('选择工作流模板', contentHTML, 'templateSelector');

    // 保存回调
    this._currentOnConfirm = onConfirm;
  }

  /**
   * 选择模板
   */
  async selectTemplate(templateId, onConfirm) {
    const template = this.templates.find(t => t.id === templateId);
    if (!template) {
      return;
    }

    // 关闭模板选择器
    if (window.modalManager) {
      window.modalManager.close('templateSelector');
    }

    // 使用选中的模板
    if (this._currentOnConfirm) {
      this._currentOnConfirm(template.stages);
    }
  }

  /**
   * 显示自定义工作流编辑器
   * @param {Function} onConfirm - 确认回调
   */
  showCustomWorkflowEditor(onConfirm) {
    if (!window.modalManager) {
      return;
    }

    // 所有可用的阶段
    const allStages = [
      {
        id: 'requirement',
        name: '需求分析',
        icon: '📋',
        description: '产品定位、用户分析、功能规划'
      },
      { id: 'design', name: '产品设计', icon: '🎨', description: 'UI/UX设计、交互原型、视觉规范' },
      {
        id: 'architecture',
        name: '架构设计',
        icon: '🏗️',
        description: '系统架构、技术选型、API规范'
      },
      {
        id: 'development',
        name: '开发实现',
        icon: '💻',
        description: '前后端开发、功能实现、代码编写'
      },
      { id: 'testing', name: '测试验证', icon: '🧪', description: '功能测试、性能测试、bug修复' },
      {
        id: 'deployment',
        name: '部署上线',
        icon: '🚀',
        description: '环境配置、服务器部署、上线发布'
      },
      { id: 'operation', name: '运营推广', icon: '📈', description: '市场推广、用户运营、数据分析' }
    ];

    // 可拖拽的阶段列表
    const stagesHTML = allStages
      .map(
        (stage, index) => `
            <div class="custom-stage-item" data-stage-id="${stage.id}" data-index="${index}"
                 draggable="true"
                 style="display: flex; align-items: center; padding: 12px; border: 1px solid var(--border); border-radius: 8px; background: white; cursor: move; margin-bottom: 8px;"
                 ondragstart="workflowRecommendationManager.handleDragStart(event)"
                 ondragover="workflowRecommendationManager.handleDragOver(event)"
                 ondrop="workflowRecommendationManager.handleDrop(event)"
                 ondragend="workflowRecommendationManager.handleDragEnd(event)">
                <input type="checkbox" name="customStages" value="${stage.id}" checked
                       style="margin-right: 12px;"
                       onchange="workflowRecommendationManager.updateCustomStageCount()">
                <span style="font-size: 24px; margin-right: 12px;">${stage.icon}</span>
                <div style="flex: 1;">
                    <div style="font-weight: 600; margin-bottom: 4px;">${stage.name}</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">${stage.description}</div>
                </div>
                <span class="drag-handle" style="color: var(--text-secondary); cursor: move; padding: 0 8px;">⋮⋮</span>
            </div>
        `
      )
      .join('');

    const contentHTML = `
            <div style="max-height: 70vh; overflow-y: auto; padding: 4px;">
                <div style="margin-bottom: 20px; padding: 16px; background: #f0f9ff; border-left: 4px solid #3b82f6; border-radius: 8px;">
                    <div style="font-weight: 600; margin-bottom: 8px; color: #1e40af;">💡 提示</div>
                    <div style="color: #1e3a8a; font-size: 13px; line-height: 1.6;">
                        • 勾选需要的阶段<br>
                        • 拖拽调整阶段顺序<br>
                        • 至少选择一个阶段
                    </div>
                </div>

                <div style="margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <h4 style="margin: 0; font-size: 16px; font-weight: 600;">自定义工作流阶段</h4>
                        <span id="customStageCount" style="font-size: 13px; color: var(--text-secondary);">已选 7/7 个阶段</span>
                    </div>
                    <div id="customStagesList">
                        ${stagesHTML}
                    </div>
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        <input type="checkbox" id="saveAsTemplate" style="margin: 0;">
                        <span style="font-size: 14px;">保存为自定义模板（暂不可用）</span>
                    </label>
                </div>

                <div style="display: flex; gap: 12px; padding-top: 16px; border-top: 1px solid var(--border);">
                    <button class="btn-secondary" onclick="window.modalManager.close('customWorkflowEditor')" style="flex: 1;">
                        取消
                    </button>
                    <button class="btn-primary" onclick="workflowRecommendationManager.confirmCustomWorkflow(${JSON.stringify(onConfirm).replace(/"/g, '&quot;')})" style="flex: 1;">
                        确认创建
                    </button>
                </div>
            </div>
        `;

    window.modalManager.showCustomModal('🎨 自定义工作流', contentHTML, 'customWorkflowEditor');

    // 保存回调
    this._currentOnConfirm = onConfirm;

    // 初始化计数
    this.updateCustomStageCount();
  }

  /**
   * 更新自定义阶段计数
   */
  updateCustomStageCount() {
    const checkboxes = document.querySelectorAll('input[name="customStages"]');
    const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
    const totalCount = checkboxes.length;

    const countElement = document.getElementById('customStageCount');
    if (countElement) {
      countElement.textContent = `已选 ${checkedCount}/${totalCount} 个阶段`;
    }
  }

  /**
   * 拖拽开始
   */
  handleDragStart(event) {
    event.target.style.opacity = '0.5';
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/html', event.target.innerHTML);
    this._draggedElement = event.target;
  }

  /**
   * 拖拽经过
   */
  handleDragOver(event) {
    if (event.preventDefault) {
      event.preventDefault();
    }
    event.dataTransfer.dropEffect = 'move';

    const target = event.target.closest('.custom-stage-item');
    if (target && target !== this._draggedElement) {
      target.style.borderTop = '2px solid #667eea';
    }

    return false;
  }

  /**
   * 拖拽放下
   */
  handleDrop(event) {
    if (event.stopPropagation) {
      event.stopPropagation();
    }

    const target = event.target.closest('.custom-stage-item');
    if (target && target !== this._draggedElement) {
      const container = target.parentNode;
      const draggedIndex = Array.from(container.children).indexOf(this._draggedElement);
      const targetIndex = Array.from(container.children).indexOf(target);

      if (draggedIndex < targetIndex) {
        container.insertBefore(this._draggedElement, target.nextSibling);
      } else {
        container.insertBefore(this._draggedElement, target);
      }
    }

    target.style.borderTop = '';

    return false;
  }

  /**
   * 拖拽结束
   */
  handleDragEnd(event) {
    event.target.style.opacity = '1';

    // 清除所有边框高亮
    const items = document.querySelectorAll('.custom-stage-item');
    items.forEach(item => {
      item.style.borderTop = '';
    });

    this._draggedElement = null;
  }

  /**
   * 确认自定义工作流
   */
  confirmCustomWorkflow(onConfirm) {
    // 获取所有阶段项（按当前顺序）
    const stageItems = document.querySelectorAll('.custom-stage-item');
    const selectedStages = [];

    stageItems.forEach(item => {
      const checkbox = item.querySelector('input[name="customStages"]');
      if (checkbox && checkbox.checked) {
        selectedStages.push(checkbox.value);
      }
    });

    if (selectedStages.length === 0) {
      if (window.modalManager) {
        window.modalManager.alert('请至少选择一个阶段', 'warning');
      }
      return;
    }

    // 关闭对话框
    if (window.modalManager) {
      window.modalManager.close('customWorkflowEditor');
    }

    // 调用回调
    if (this._currentOnConfirm) {
      this._currentOnConfirm(selectedStages);
    }
  }
}

// 导出（浏览器环境）
if (typeof window !== 'undefined') {
  window.WorkflowRecommendationManager = WorkflowRecommendationManager;
  window.workflowRecommendationManager = new WorkflowRecommendationManager();

  // 自动初始化
  window.addEventListener('DOMContentLoaded', () => {
    if (window.workflowRecommendationManager) {
      window.workflowRecommendationManager.init();
    }
  });
}
