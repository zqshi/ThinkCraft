/**
 * 视觉任务ID值对象
 */
export class VisionTaskId {
  constructor(value) {
    this._value = value;
    this.validate();
  }

  static generate() {
    return new VisionTaskId(`vision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  }

  validate() {
    if (!this._value || typeof this._value !== 'string') {
      throw new Error('视觉任务ID必须是字符串');
    }

    if (!/^vision_[a-zA-Z0-9_]+$/.test(this._value)) {
      throw new Error('视觉任务ID格式无效');
    }
  }

  get value() {
    return this._value;
  }

  equals(other) {
    return other instanceof VisionTaskId && this._value === other._value;
  }

  toString() {
    return this._value;
  }
  toJSON() {
    return this._value;
  }
}
