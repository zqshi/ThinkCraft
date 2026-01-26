/**
 * 值对象基类
 * 值对象是无状态的，通过属性值判断相等性
 */
export class ValueObject {
  constructor(props) {
    if (!props || typeof props !== 'object') {
      throw new Error('值对象属性必须是一个对象');
    }
    this._props = { ...props };
    this.validate();
  }

  /**
   * 获取属性
   */
  get props() {
    return { ...this._props };
  }

  /**
   * 判断相等性（基于属性值）
   */
  equals(other) {
    if (!other || !(other instanceof ValueObject)) {
      return false;
    }
    return JSON.stringify(this._props) === JSON.stringify(other._props);
  }

  /**
   * 转换为JSON
   */
  toJSON() {
    return { ...this._props };
  }

  /**
   * 验证值对象有效性
   * 子类需要重写此方法
   */
  validate() {
    throw new Error('子类必须实现validate方法');
  }

  /**
   * 创建值对象的静态工厂方法
   */
  static create(props) {
    return new this(props);
  }
}
