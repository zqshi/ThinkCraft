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
    if (!stage) return 0;
    if (stage.status === 'completed') return 100;
    if (stage.status === 'pending') return 0;
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
      'product-manager': { name: '产品经理', emoji: '📱', icon: '📱' },
      'ui-ux-designer': { name: 'UI/UX设计师', emoji: '🎨', icon: '🎨' },
      'frontend-developer': { name: '前端开发', emoji: '💻', icon: '💻' },
      'backend-developer': { name: '后端开发', emoji: '⚙️', icon: '⚙️' },
      'qa-engineer': { name: '测试工程师', emoji: '🔍', icon: '🔍' },
      devops: { name: '运维工程师', emoji: '🚀', icon: '🚀' },
      marketing: { name: '市场营销', emoji: '📢', icon: '📢' },
      operations: { name: '运营专员', emoji: '📊', icon: '📊' },
      'strategy-design': { name: '战略设计师', emoji: '🎯', icon: '🎯' },
      'tech-lead': { name: '技术负责人', emoji: '👨‍💻', icon: '👨‍💻' }
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
    if (!raw) return '';
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
