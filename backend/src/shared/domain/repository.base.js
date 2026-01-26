/**
 * 仓库接口基类
 * 提供领域对象的持久化抽象
 */
export class IRepository {
  /**
   * 保存实体
   * @param {Entity} entity
   */
  async save(entity) {
    throw new Error('必须实现save方法');
  }

  /**
   * 根据ID查找实体
   * @param {string} id
   */
  async findById(id) {
    throw new Error('必须实现findById方法');
  }

  /**
   * 查找所有实体
   */
  async findAll() {
    throw new Error('必须实现findAll方法');
  }

  /**
   * 删除实体
   * @param {string} id
   */
  async delete(id) {
    throw new Error('必须实现delete方法');
  }

  /**
   * 检查实体是否存在
   * @param {string} id
   */
  async exists(id) {
    throw new Error('必须实现exists方法');
  }
}

/**
 * 聚合根仓库接口
 */
export class IAggregateRootRepository extends IRepository {
  /**
   * 根据ID查找聚合根
   * @param {string} id
   */
  async findById(id) {
    throw new Error('必须实现findById方法');
  }

  /**
   * 保存聚合根及其所有子对象
   * @param {AggregateRoot} aggregate
   */
  async save(aggregate) {
    throw new Error('必须实现save方法');
  }
}
