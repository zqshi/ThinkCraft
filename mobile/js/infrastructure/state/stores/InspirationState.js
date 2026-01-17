import { StateStore } from '../core/StateStore.js';

/**
 * 灵感状态管理
 */
export class InspirationState extends StateStore {
  constructor() {
    super({
      mode: 'full', // 'full' | 'quick' (快速捕捉模式)
      items: [], // 灵感列表
      currentEdit: null, // 当前编辑的灵感ID
      filter: 'unprocessed', // 'all' | 'unprocessed' | 'processing' | 'completed'
      autoSaveDelay: 2000, // 自动保存延迟（ms）
      lastSync: null, // 最后同步时间
      totalCount: 0, // 总数统计
      stats: {
        unprocessed: 0,
        processing: 0,
        completed: 0
      }
    });
  }

  // ========== Getters ==========

  getMode() {
    return this._state.mode;
  }

  getItems() {
    return [...this._state.items];
  }

  getCurrentEdit() {
    return this._state.currentEdit;
  }

  getFilter() {
    return this._state.filter;
  }

  getStats() {
    return { ...this._state.stats };
  }

  getTotalCount() {
    return this._state.totalCount;
  }

  // ========== Setters ==========

  setMode(mode) {
    this.setState({ mode });
  }

  setItems(items) {
    this.setState({
      items: [...items],
      totalCount: items.length
    });
  }

  addItem(item) {
    const items = [...this._state.items, item];
    this.setState({
      items,
      totalCount: items.length
    });
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
    this.setState({
      items,
      totalCount: items.length
    });
    this.updateStats();
  }

  setCurrentEdit(id) {
    this.setState({ currentEdit: id });
  }

  setFilter(filter) {
    this.setState({ filter });
  }

  // ========== 统计更新 ==========

  updateStats() {
    const items = this._state.items;
    const stats = {
      unprocessed: items.filter(i => i.status === 'unprocessed').length,
      processing: items.filter(i => i.status === 'processing').length,
      completed: items.filter(i => i.status === 'completed').length
    };

    this.setState({
      stats,
      lastSync: Date.now()
    });
  }

  // ========== 批量操作 ==========

  batchUpdateStatus(ids, newStatus) {
    const items = this._state.items.map(item =>
      ids.includes(item.id) ? { ...item, status: newStatus, updatedAt: Date.now() } : item
    );

    this.setState({ items });
    this.updateStats();
  }

  clearCompleted() {
    const items = this._state.items.filter(item => item.status !== 'completed');
    this.setState({
      items,
      totalCount: items.length
    });
    this.updateStats();
  }

  // ========== 过滤和搜索 ==========

  getFilteredItems() {
    const { items, filter } = this._state;

    if (filter === 'all') {
      return items;
    }

    return items.filter(item => item.status === filter);
  }

  searchItems(keyword) {
    if (!keyword) return this.getFilteredItems();

    const lowerKeyword = keyword.toLowerCase();
    return this.getFilteredItems().filter(item =>
      (item.title && item.title.toLowerCase().includes(lowerKeyword)) ||
      (item.content && item.content.toLowerCase().includes(lowerKeyword)) ||
      (item.tags && item.tags.some(tag => tag.toLowerCase().includes(lowerKeyword)))
    );
  }
}

// 导出单例
export const inspirationState = new InspirationState();
