/**
 * ProjectManager 阶段与类型工具模块
 */

window.projectManagerStageUtils = {
  getStageStatusLabel(pm, status) {
    const labels = {
      pending: '待执行',
      active: '执行中',
      in_progress: '执行中',
      completed: '已完成',
      blocked: '阻塞中'
    };
    return labels[status] || status;
  },

  calculateStageProgress(pm, stage) {
    if (!stage) {
      return 0;
    }
    if (stage.status === 'completed') {
      return 100;
    }
    if (stage.status === 'pending') {
      return 0;
    }
    if (stage.status === 'active' || stage.status === 'in_progress') {
      const artifacts = stage.artifacts || [];
      if (artifacts.length === 0) {
        return 50;
      }
      const completedCount = artifacts.filter(a => a.status === 'completed').length;
      return Math.round((completedCount / artifacts.length) * 100);
    }
    return 0;
  },

  getAgentDefinition(pm, agentType) {
    const agentDefs = {
      'product-manager': {
        name: '产品经理',
        emoji: '📱',
        icon: '📱',
        roleTag: '需求统筹',
        persona: '围绕用户价值拆解需求，平衡范围、优先级与交付节奏。'
      },
      'ui-ux-designer': {
        name: 'UI/UX设计师',
        emoji: '🎨',
        icon: '🎨',
        roleTag: '体验设计',
        persona: '聚焦关键路径体验，输出清晰可实现的交互与视觉方案。'
      },
      'frontend-developer': {
        name: '前端开发',
        emoji: '💻',
        icon: '💻',
        roleTag: '前端实现',
        persona: '负责页面与交互落地，关注性能、可维护性和一致性。'
      },
      'backend-developer': {
        name: '后端开发',
        emoji: '⚙️',
        icon: '⚙️',
        roleTag: '后端实现',
        persona: '搭建稳定服务与数据能力，确保接口可靠和扩展性。'
      },
      'qa-engineer': {
        name: '测试工程师',
        emoji: '🔍',
        icon: '🔍',
        roleTag: '质量保障',
        persona: '通过测试策略与缺陷追踪，提前暴露风险保障交付质量。'
      },
      devops: {
        name: '运维工程师',
        emoji: '🚀',
        icon: '🚀',
        roleTag: '发布运维',
        persona: '维护部署链路与运行环境，保障发布效率与系统稳定。'
      },
      marketing: {
        name: '市场营销',
        emoji: '📢',
        icon: '📢',
        roleTag: '增长推广',
        persona: '制定传播与获客策略，推动产品触达目标用户。'
      },
      operations: {
        name: '运营专员',
        emoji: '📊',
        icon: '📊',
        roleTag: '运营增长',
        persona: '围绕用户留存与转化持续优化运营动作与数据闭环。'
      },
      'strategy-design': {
        name: '战略设计师',
        emoji: '🎯',
        icon: '🎯',
        roleTag: '战略规划',
        persona: '校准业务方向与关键假设，输出可执行的阶段策略。'
      },
      'tech-lead': {
        name: '技术负责人',
        emoji: '👨‍💻',
        icon: '👨‍💻',
        roleTag: '技术决策',
        persona: '主导架构与关键技术选型，控制复杂度与技术风险。'
      }
    };
    return agentDefs[agentType] || null;
  },

  getArtifactTypeDefinition(pm, artifactType) {
    return pm.artifactTypeDefs[artifactType] || { name: artifactType, icon: '📄' };
  },

  normalizeArtifactTypeId(pm, value) {
    if (!value || typeof value !== 'string') {
      return '';
    }
    const raw = value.trim();
    if (!raw) {
      return '';
    }
    if (pm.artifactTypeDefs[raw]) {
      return raw;
    }
    const normalized = pm.normalizeDeliverableKey(raw);
    for (const [id, def] of Object.entries(pm.artifactTypeDefs)) {
      if (pm.normalizeDeliverableKey(id) === normalized) {
        return id;
      }
      if (def?.name && pm.normalizeDeliverableKey(def.name) === normalized) {
        return id;
      }
    }
    return '';
  }
};
