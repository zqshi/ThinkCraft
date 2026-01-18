import { StateStore } from '../core/StateStore.js';

/**
 * 知识库状态管理
 */
export class KnowledgeState extends StateStore {
  constructor() {
    super({
      viewMode: 'project', // 'project' | 'global' | 'aggregated'
      currentProjectId: null, // 当前查看的项目ID
      organizationType: 'byProject', // 'byProject' | 'byType' | 'byTimeline' | 'byTags'
      selectedTags: [], // 选中的标签
      items: [], // 知识条目列表
      filter: {
        type: null, // 文档类型过滤
        projectId: null, // 项目过滤
        tags: [] // 标签过滤
      },
      searchKeyword: '', // 搜索关键词
      stats: {
        total: 0,
        byProject: {},
        byType: {},
        byTag: {}
      }
    });
  }

  // ========== Getters ==========

  getViewMode() {
    return this._state.viewMode;
  }

  getCurrentProjectId() {
    return this._state.currentProjectId;
  }

  getOrganizationType() {
    return this._state.organizationType;
  }

  getSelectedTags() {
    return [...this._state.selectedTags];
  }

  getItems() {
    return [...this._state.items];
  }

  getFilter() {
    return { ...this._state.filter };
  }

  getSearchKeyword() {
    return this._state.searchKeyword;
  }

  getStats() {
    return JSON.parse(JSON.stringify(this._state.stats));
  }

  // ========== Setters ==========

  setViewMode(viewMode) {
    this.setState({ viewMode });
  }

  setCurrentProjectId(projectId) {
    this.setState({ currentProjectId });
  }

  setOrganizationType(organizationType) {
    this.setState({ organizationType });
  }

  setSelectedTags(tags) {
    this.setState({ selectedTags: [...tags] });
  }

  addSelectedTag(tag) {
    const tags = [...this._state.selectedTags];
    if (!tags.includes(tag)) {
      tags.push(tag);
      this.setState({ selectedTags: tags });
    }
  }

  removeSelectedTag(tag) {
    const tags = this._state.selectedTags.filter(t => t !== tag);
    this.setState({ selectedTags: tags });
  }

  setItems(items) {
    this.setState({ items: [...items] });
    this.updateStats();
  }

  addItem(item) {
    const items = [...this._state.items, item];
    this.setState({ items });
    this.updateStats();
  }

  updateItem(id, updates) {
    const items = this._state.items.map(item =>
      item.id === id ? { ...item, ...updates } : item
    );
    this.setState({ items });
    this.updateStats();
  }

  removeItem(id) {
    const items = this._state.items.filter(item => item.id !== id);
    this.setState({ items });
    this.updateStats();
  }

  setFilter(filter) {
    this.setState({
      filter: { ...this._state.filter, ...filter }
    });
  }

  setSearchKeyword(keyword) {
    this.setState({ searchKeyword: keyword });
  }

  clearFilter() {
    this.setState({
      filter: {
        type: null,
        projectId: null,
        tags: []
      },
      searchKeyword: '',
      selectedTags: []
    });
  }

  // ========== 统计更新 ==========

  updateStats() {
    const items = this._state.items;

    const stats = {
      total: items.length,
      byProject: {},
      byType: {},
      byTag: {}
    };

    items.forEach(item => {
      // 按项目统计
      if (item.projectId) {
        stats.byProject[item.projectId] = (stats.byProject[item.projectId] || 0) + 1;
      }

      // 按类型统计
      if (item.type) {
        stats.byType[item.type] = (stats.byType[item.type] || 0) + 1;
      }

      // 按标签统计
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach(tag => {
          stats.byTag[tag] = (stats.byTag[tag] || 0) + 1;
        });
      }
    });

    this.setState({ stats });
  }

  // ========== 过滤和搜索 ==========

  getFilteredItems() {
    let items = [...this._state.items];
    const { filter, searchKeyword, selectedTags } = this._state;

    // 按类型过滤
    if (filter.type) {
      items = items.filter(item => item.type === filter.type);
    }

    // 按项目过滤
    if (filter.projectId) {
      items = items.filter(item => item.projectId === filter.projectId);
    }

    // 按标签过滤
    if (selectedTags.length > 0) {
      items = items.filter(item =>
        item.tags && selectedTags.every(tag => item.tags.includes(tag))
      );
    }

    // 关键词搜索
    if (searchKeyword) {
      const lowerKeyword = searchKeyword.toLowerCase();
      items = items.filter(item =>
        (item.title && item.title.toLowerCase().includes(lowerKeyword)) ||
        (item.content && item.content.toLowerCase().includes(lowerKeyword)) ||
        (item.tags && item.tags.some(tag => tag.toLowerCase().includes(lowerKeyword)))
      );
    }

    return items;
  }

  // ========== 组织方式 ==========

  getOrganizedItems() {
    const items = this.getFilteredItems();
    const { organizationType } = this._state;

    switch (organizationType) {
      case 'byProject':
        return this._organizeByProject(items);
      case 'byType':
        return this._organizeByType(items);
      case 'byTimeline':
        return this._organizeByTimeline(items);
      case 'byTags':
        return this._organizeByTags(items);
      default:
        return items;
    }
  }

  _organizeByProject(items) {
    const grouped = {};
    items.forEach(item => {
      const projectId = item.projectId || 'global';
      if (!grouped[projectId]) grouped[projectId] = [];
      grouped[projectId].push(item);
    });
    return grouped;
  }

  _organizeByType(items) {
    const grouped = {};
    items.forEach(item => {
      const type = item.type || 'other';
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(item);
    });
    return grouped;
  }

  _organizeByTimeline(items) {
    return items.sort((a, b) => b.createdAt - a.createdAt);
  }

  _organizeByTags(items) {
    const grouped = {};
    items.forEach(item => {
      if (item.tags && item.tags.length > 0) {
        item.tags.forEach(tag => {
          if (!grouped[tag]) grouped[tag] = [];
          grouped[tag].push(item);
        });
      } else {
        if (!grouped['untagged']) grouped['untagged'] = [];
        grouped['untagged'].push(item);
      }
    });
    return grouped;
  }
}

// 导出单例
export const knowledgeState = new KnowledgeState();
