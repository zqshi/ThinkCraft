export class ReportStatus {
  static DRAFT = new ReportStatus('DRAFT');
  static IN_PROGRESS = new ReportStatus('IN_PROGRESS');
  static GENERATED = new ReportStatus('GENERATED');
  static ARCHIVED = new ReportStatus('ARCHIVED');

  constructor(value) {
    this._value = value;
    this.validate();
  }

  static fromString(value) {
    const status = this[value.toUpperCase()];
    if (!status) {
      throw new Error(`无效的报告状态: ${value}`);
    }
    return status;
  }

  validate() {
    const validStatuses = ['DRAFT', 'IN_PROGRESS', 'GENERATED', 'ARCHIVED'];
    if (!validStatuses.includes(this._value)) {
      throw new Error(`无效的报告状态: ${this._value}`);
    }
  }

  get value() {
    return this._value;
  }

  isDraft() {
    return this._value === 'DRAFT';
  }
  isInProgress() {
    return this._value === 'IN_PROGRESS';
  }
  isGenerated() {
    return this._value === 'GENERATED';
  }
  isArchived() {
    return this._value === 'ARCHIVED';
  }

  canEdit() {
    return this._value === 'DRAFT' || this._value === 'IN_PROGRESS';
  }

  canGenerate() {
    return this._value === 'DRAFT' || this._value === 'IN_PROGRESS';
  }

  equals(other) {
    return other instanceof ReportStatus && this._value === other._value;
  }

  toString() {
    return this._value;
  }
  toJSON() {
    return this._value;
  }
}
