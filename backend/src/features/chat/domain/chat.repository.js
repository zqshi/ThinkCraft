/**
 * 聊天聚合根仓库接口
 */
import { IAggregateRootRepository } from '../../../shared/domain/index.js';

export class IChatRepository extends IAggregateRootRepository {
  /**
   * 根据ID查找聊天
   * @param {string} id
   */
  async findById(_id) {
    throw new Error('必须实现findById方法');
  }

  /**
   * 保存聊天
   * @param {Chat} chat
   */
  async save(_chat) {
    throw new Error('必须实现save方法');
  }

  /**
   * 查找所有聊天
   */
  async findAll(_userId) {
    throw new Error('必须实现findAll方法');
  }

  /**
   * 根据用户ID查找聊天
   * @param {string} userId
   */
  async findByUserId(_userId) {
    throw new Error('必须实现findByUserId方法');
  }

  /**
   * 查找置顶的聊天
   */
  async findPinned(_userId) {
    throw new Error('必须实现findPinned方法');
  }

  /**
   * 根据标签查找聊天
   * @param {string[]} tags
   */
  async findByTags(_tags, _userId) {
    throw new Error('必须实现findByTags方法');
  }

  /**
   * 删除聊天
   * @param {string} id
   */
  async delete(_id) {
    throw new Error('必须实现delete方法');
  }

  /**
   * 检查聊天是否存在
   * @param {string} id
   */
  async exists(_id) {
    throw new Error('必须实现exists方法');
  }

  /**
   * 统计聊天数量
   */
  async count() {
    throw new Error('必须实现count方法');
  }

  /**
   * 搜索聊天
   * @param {string} keyword
   */
  async search(_keyword) {
    throw new Error('必须实现search方法');
  }
}
