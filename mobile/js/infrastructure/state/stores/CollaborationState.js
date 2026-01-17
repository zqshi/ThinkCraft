import { StateStore } from '../core/StateStore.js';

/**
 * 协同状态管理
 * 管理智能协同编排系统的状态
 */
export class CollaborationState extends StateStore {
  constructor() {
    super({
      // 项目上下文
      projectId: null,
      project: null,

      // 当前协同计划
      currentPlanId: null,
      currentPlan: null,

      // UI流程状态
      step: 'idle',  // 'idle' | 'input' | 'analyzing' | 'hiring' | 'modes' | 'executing' | 'completed'

      // 能力分析结果
      capabilityAnalysis: null,

      // 三种协同模式
      modes: null,

      // 执行进度
      executionProgress: null,

      // 加载状态
      isCreating: false,
      isAnalyzing: false,
      isGenerating: false,
      isExecuting: false,

      // 错误信息
      error: null
    });
  }

  // ========== Getters ==========

  getProjectId() {
    return this._state.projectId;
  }

  getProject() {
    return this._state.project;
  }

  getCurrentPlanId() {
    return this._state.currentPlanId;
  }

  getCurrentPlan() {
    return this._state.currentPlan;
  }

  getStep() {
    return this._state.step;
  }

  getCapabilityAnalysis() {
    return this._state.capabilityAnalysis;
  }

  getModes() {
    return this._state.modes;
  }

  getExecutionProgress() {
    return this._state.executionProgress;
  }

  getError() {
    return this._state.error;
  }

  isCreating() {
    return this._state.isCreating;
  }

  isAnalyzing() {
    return this._state.isAnalyzing;
  }

  isGenerating() {
    return this._state.isGenerating;
  }

  isExecuting() {
    return this._state.isExecuting;
  }

  // ========== Setters ==========

  setProject(projectId, project = null) {
    this.setState({
      projectId,
      project
    });
  }

  setCurrentPlan(planId, plan = null) {
    this.setState({
      currentPlanId: planId,
      currentPlan: plan,
      step: plan ? 'modes' : 'input'
    });
  }

  setStep(step) {
    this.setState({ step });
  }

  setCapabilityAnalysis(analysis) {
    this.setState({ capabilityAnalysis: analysis });
  }

  setModes(modes) {
    this.setState({ modes });
  }

  setExecutionProgress(progress) {
    this.setState({ executionProgress: progress });
  }

  setError(error) {
    this.setState({ error });
  }

  setCreating(isCreating) {
    this.setState({ isCreating });
  }

  setAnalyzing(isAnalyzing) {
    this.setState({ isAnalyzing });
  }

  setGenerating(isGenerating) {
    this.setState({ isGenerating });
  }

  setExecuting(isExecuting) {
    this.setState({ isExecuting });
  }

  // ========== Actions ==========

  /**
   * 开始创建协同计划
   */
  startCreating() {
    this.setState({
      step: 'input',
      isCreating: false,
      error: null
    });
  }

  /**
   * 创建成功
   */
  createSuccess(planId) {
    this.setState({
      currentPlanId: planId,
      step: 'analyzing',
      isCreating: false
    });
  }

  /**
   * 分析能力成功
   */
  analyzeSuccess(analysis) {
    this.setState({
      capabilityAnalysis: analysis,
      step: analysis.isSufficient ? 'modes' : 'hiring',
      isAnalyzing: false
    });
  }

  /**
   * 生成模式成功
   */
  generateModesSuccess(modes) {
    this.setState({
      modes,
      step: 'modes',
      isGenerating: false
    });
  }

  /**
   * 开始执行
   */
  startExecution() {
    this.setState({
      step: 'executing',
      isExecuting: true,
      executionProgress: { status: 'running', progress: 0 }
    });
  }

  /**
   * 执行完成
   */
  executeSuccess(result) {
    this.setState({
      step: 'completed',
      isExecuting: false,
      executionProgress: { status: 'completed', result }
    });
  }

  /**
   * 重置状态
   */
  reset() {
    this.setState({
      projectId: null,
      project: null,
      currentPlanId: null,
      currentPlan: null,
      step: 'idle',
      capabilityAnalysis: null,
      modes: null,
      executionProgress: null,
      isCreating: false,
      isAnalyzing: false,
      isGenerating: false,
      isExecuting: false,
      error: null
    });
  }

  /**
   * 错误处理
   */
  handleError(error) {
    this.setState({
      error: error.message || error,
      isCreating: false,
      isAnalyzing: false,
      isGenerating: false,
      isExecuting: false
    });
  }
}

// 导出单例实例
export const collaborationState = new CollaborationState();
export default collaborationState;
