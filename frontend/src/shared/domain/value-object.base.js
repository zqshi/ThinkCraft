/**
 * 前端值对象基类
 * 用于描述领域概念的无状态对象
 */
export class ValueObject {
  constructor() {
    if (new.target === ValueObject) {
      throw new Error('ValueObject是抽象类，不能直接实例化');
    }
  }

  /**
   * 验证值对象的有效性
   * 子类需要重写此方法
   */
  validate() {
    throw new Error('子类必须实现validate方法');
  }

  /**
   * 判断相等性
   * 子类需要重写此方法
   */
  equals(_other) {
    throw new Error('子类必须实现equals方法');
  }

  /**
   * 转换为字符串
   */
  toString() {
    return JSON.stringify(this.toJSON());
  }

  /**
   * 转换为JSON
   * 子类需要重写此方法
   */
  toJSON() {
    throw new Error('子类必须实现toJSON方法');
  }
}
