import { Model } from 'sequelize';

/**
 * BaseModel基类
 *
 * 所有Model的基类，提供通用方法
 */
export class BaseModel extends Model {
  /**
   * 根据用户ID查询
   */
  static async findByUserId(userId, options = {}) {
    return this.findAll({
      where: { userId },
      ...options
    });
  }

  /**
   * 分页查询
   */
  static async paginate(page = 1, pageSize = 20, options = {}) {
    const offset = (page - 1) * pageSize;
    const limit = pageSize;

    const { count, rows } = await this.findAndCountAll({
      offset,
      limit,
      ...options
    });

    return {
      total: count,
      page,
      pageSize,
      totalPages: Math.ceil(count / pageSize),
      data: rows
    };
  }

  /**
   * 软删除（如果需要）
   * 注意：需要在Model中添加deletedAt字段
   */
  async softDelete() {
    if (this.deletedAt !== undefined) {
      this.deletedAt = new Date();
      return this.save();
    }
    throw new Error('此Model不支持软删除');
  }

  /**
   * 转换为纯对象
   */
  toJSON() {
    const values = Object.assign({}, this.get());

    // 移除内部字段
    delete values._previousDataValues;
    delete values._changed;
    delete values._options;
    delete values.isNewRecord;

    return values;
  }
}
