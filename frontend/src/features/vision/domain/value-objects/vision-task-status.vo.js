/**
 * 视觉任务状态值对象
 */
export class VisionTaskStatus {
  static PENDING = new VisionTaskStatus('PENDING');
  static PROCESSING = new VisionTaskStatus('PROCESSING');
  static COMPLETED = new VisionTaskStatus('COMPLETED');
  static FAILED = new VisionTaskStatus('FAILED');
  static CANCELLED = new VisionTaskStatus('CANCELLED');

  constructor(value) {
    this._value = value;
    this.validate();
  }

  static fromString(value) {
    const status = this[value.toUpperCase()];
    if (!status) {
      throw new Error(`无效的视觉任务状态: ${value}`);
    }
    return status;
  }

  validate() {
    const validStatuses = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'];
    if (!validStatuses.includes(this._value)) {
      throw new Error(`无效的视觉任务状态: ${this._value}`);
    }
  }

  get value() {
    return this._value;
  }

  isPending() {
    return this._value === 'PENDING';
  }
  isProcessing() {
    return this._value === 'PROCESSING';
  }
  isCompleted() {
    return this._value === 'COMPLETED';
  }
  isFailed() {
    return this._value === 'FAILED';
  }
  isCancelled() {
    return this._value === 'CANCELLED';
  }

  canStart() {
    return this._value === 'PENDING' || this._value === 'FAILED';
  }

  canCancel() {
    return this._value === 'PENDING' || this._value === 'PROCESSING';
  }

  isTerminal() {
    return this._value === 'COMPLETED' || this._value === 'FAILED' || this._value === 'CANCELLED';
  }

  getDisplayName() {
    const names = {
      PENDING: '待处理',
      PROCESSING: '处理中',
      COMPLETED: '已完成',
      FAILED: '失败',
      CANCELLED: '已取消'
    };
    return names[this._value] || this._value;
  }

  getColor() {
    const colors = {
      PENDING: '#ffa500',
      PROCESSING: '#1890ff',
      COMPLETED: '#52c41a',
      FAILED: '#ff4d4f',
      CANCELLED: '#8c8c8c'
    };
    return colors[this._value] || '#000000';
  }

  equals(other) {
    return other instanceof VisionTaskStatus && this._value === other._value;
  }

  toString() {
    return this._value;
  }
  toJSON() {
    return this._value;
  }
}
