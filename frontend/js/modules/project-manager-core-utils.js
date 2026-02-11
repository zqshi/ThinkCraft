/**
 * ProjectManager 核心工具模块
 */

window.projectManagerCoreUtils = {
  formatTimeAgo(pm, timestamp) {
    const now = Date.now();
    const diff = now - timestamp;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}天前`;
    }
    if (hours > 0) {
      return `${hours}小时前`;
    }
    if (minutes > 0) {
      return `${minutes}分钟前`;
    }
    return '刚刚';
  },

  escapeHtml(pm, text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  mergeArtifacts(pm, existing = [], incoming = []) {
    const merged = Array.isArray(existing) ? [...existing] : [];
    const byId = new Map();
    merged.forEach(item => {
      if (item?.id) {
        byId.set(item.id, item);
      }
    });
    (incoming || []).forEach(item => {
      if (!item) return;
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
};
