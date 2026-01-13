import { StateStore } from '../core/StateStore.js';

/**
 * 生成流程状态管理
 */
export class GenerationState extends StateStore {
  constructor() {
    super({
      type: null, // 'business-plan' | 'proposal' | 'demo' | null
      status: 'idle', // 'idle' | 'selecting' | 'generating' | 'completed' | 'error'
      selectedChapters: [],
      progress: {
        current: 0,
        total: 0,
        currentAgent: null,
        percentage: 0
      },
      results: {}, // { chapterId: { content, agent, timestamp } }
      error: null,
      startTime: null,
      endTime: null
    });
  }

  // ========== Getters ==========

  getType() {
    return this._state.type;
  }

  getStatus() {
    return this._state.status;
  }

  getSelectedChapters() {
    return [...this._state.selectedChapters];
  }

  getProgress() {
    return { ...this._state.progress };
  }

  getResults() {
    return { ...this._state.results };
  }

  getError() {
    return this._state.error;
  }

  isGenerating() {
    return this._state.status === 'generating';
  }

  isCompleted() {
    return this._state.status === 'completed';
  }

  // ========== Setters ==========

  setType(type) {
    this.setState({ type });
  }

  setStatus(status) {
    this.setState({ status });
  }

  setSelectedChapters(chapters) {
    this.setState({ selectedChapters: [...chapters] });
  }

  updateProgress(current, total, currentAgent = null) {
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    this.setState({
      progress: {
        current,
        total,
        currentAgent,
        percentage
      }
    });
  }

  addResult(chapterId, result) {
    this.setState({
      results: {
        ...this._state.results,
        [chapterId]: result
      }
    });
  }

  setError(error) {
    this.setState({
      error,
      status: 'error'
    });
  }

  // ========== 生成流程控制 ==========

  startGeneration(type, chapters) {
    this.setState({
      type,
      status: 'generating',
      selectedChapters: [...chapters],
      progress: {
        current: 0,
        total: chapters.length,
        currentAgent: null,
        percentage: 0
      },
      results: {},
      error: null,
      startTime: Date.now(),
      endTime: null
    });
  }

  completeGeneration() {
    this.setState({
      status: 'completed',
      endTime: Date.now()
    });
  }

  resetGeneration() {
    this.setState({
      type: null,
      status: 'idle',
      selectedChapters: [],
      progress: {
        current: 0,
        total: 0,
        currentAgent: null,
        percentage: 0
      },
      results: {},
      error: null,
      startTime: null,
      endTime: null
    });
  }

  // ========== 辅助方法 ==========

  getDuration() {
    if (!this._state.startTime) return 0;
    const endTime = this._state.endTime || Date.now();
    return endTime - this._state.startTime;
  }

  getCompletedChapters() {
    return Object.keys(this._state.results).length;
  }

  getCompletionPercentage() {
    return this._state.progress.percentage;
  }
}

// 导出单例
export const generationState = new GenerationState();
