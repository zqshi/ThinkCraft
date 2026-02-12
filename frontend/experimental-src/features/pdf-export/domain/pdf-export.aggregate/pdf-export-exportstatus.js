export class ExportStatus {
  static PENDING = new ExportStatus('PENDING');
  static PROCESSING = new ExportStatus('PROCESSING');
  static COMPLETED = new ExportStatus('COMPLETED');
  static FAILED = new ExportStatus('FAILED');

  constructor(value) {
    this._value = value;
    this.validate();
  }

  static fromString(value) {
    const status = this[value.toUpperCase()];
    if (!status) {
      throw new Error(`无效的导出状态: ${value}`);
    }
    return status;
  }

  validate() {
    const validStatuses = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'];
    if (!validStatuses.includes(this._value)) {
      throw new Error(`无效的导出状态: ${this._value}`);
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

  canProcess() {
    return this._value === 'PENDING' || this._value === 'FAILED';
  }

  canUpdate() {
    return this._value === 'PENDING' || this._value === 'FAILED';
  }

  equals(other) {
    return other instanceof ExportStatus && this._value === other._value;
  }

  toString() {
    return this._value;
  }
  toJSON() {
    return this._value;
  }
}
