import { StateStore } from '../core/StateStore.js';

/**
 * Demo生成状态管理
 */
export class DemoState extends StateStore {
  constructor() {
    super({
      type: null, // 'web' | 'app' | 'miniapp' | 'admin' | null
      status: 'idle', // 'idle' | 'generating' | 'completed' | 'error'
      techStack: [],
      features: [],
      currentStep: null, // 'type-analysis' | 'prd' | 'architecture' | 'code' | 'test' | 'deploy'
      steps: [], // Agent执行步骤
      results: {
        analysis: null,
        prd: null,
        architecture: null,
        code: null,
        test: null,
        deploy: null
      },
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

  getTechStack() {
    return [...this._state.techStack];
  }

  getFeatures() {
    return [...this._state.features];
  }

  getCurrentStep() {
    return this._state.currentStep;
  }

  getSteps() {
    return [...this._state.steps];
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

  setTechStack(techStack) {
    this.setState({ techStack: [...techStack] });
  }

  setFeatures(features) {
    this.setState({ features: [...features] });
  }

  setCurrentStep(step) {
    this.setState({ currentStep: step });
  }

  addStep(step) {
    this.setState({
      steps: [...this._state.steps, step]
    });
  }

  updateStepResult(stepName, result) {
    this.setState({
      results: {
        ...this._state.results,
        [stepName]: result
      }
    });
  }

  setError(error) {
    this.setState({
      error,
      status: 'error'
    });
  }

  // ========== Demo生成流程控制 ==========

  startDemoGeneration(type, techStack, features) {
    this.setState({
      type,
      status: 'generating',
      techStack: [...techStack],
      features: [...features],
      currentStep: 'type-analysis',
      steps: [],
      results: {
        analysis: null,
        prd: null,
        architecture: null,
        code: null,
        test: null,
        deploy: null
      },
      error: null,
      startTime: Date.now(),
      endTime: null
    });
  }

  completeDemoGeneration() {
    this.setState({
      status: 'completed',
      currentStep: null,
      endTime: Date.now()
    });
  }

  resetDemo() {
    this.setState({
      type: null,
      status: 'idle',
      techStack: [],
      features: [],
      currentStep: null,
      steps: [],
      results: {
        analysis: null,
        prd: null,
        architecture: null,
        code: null,
        test: null,
        deploy: null
      },
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

  getCompletedSteps() {
    return Object.values(this._state.results).filter(r => r !== null).length;
  }

  getTotalSteps() {
    return Object.keys(this._state.results).length;
  }

  getProgress() {
    const completed = this.getCompletedSteps();
    const total = this.getTotalSteps();
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }
}

// 导出单例
export const demoState = new DemoState();
