/**
 * 聚合根基类
 * 维护业务一致性的边界
 */
import { Entity } from './entity.base.js';

export class AggregateRoot extends Entity {
  constructor(id) {
    super(id);
  }

  /**
   * 聚合根验证逻辑
   * 子类可以重写此方法添加特定的验证逻辑
   */
  validate() {
    super.validate();
  }
}
