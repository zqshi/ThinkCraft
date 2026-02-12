/**
 * Agent聚合根仓库接口
 */
import { IAggregateRootRepository } from '../../../shared/domain/index.js';

export class IAgentRepository extends IAggregateRootRepository {
  /**
   * 根据ID查找Agent
   * @param {string} id
   */
  async findById(_id) {
    throw new Error('必须实现findById方法');
  }

  /**
   * 保存Agent
   * @param {Agent} agent
   */
  async save(_agent) {
    throw new Error('必须实现save方法');
  }

  /**
   * 查找所有Agent
   */
  async findAll() {
    throw new Error('必须实现findAll方法');
  }

  /**
   * 根据类型查找Agent
   * @param {string} type
   */
  async findByType(_type) {
    throw new Error('必须实现findByType方法');
  }

  /**
   * 根据状态查找Agent
   * @param {string} status
   */
  async findByStatus(_status) {
    throw new Error('必须实现findByStatus方法');
  }

  /**
   * 根据能力查找Agent
   * @param {string[]} capabilities
   */
  async findByCapabilities(_capabilities) {
    throw new Error('必须实现findByCapabilities方法');
  }

  /**
   * 删除Agent
   * @param {string} id
   */
  async delete(_id) {
    throw new Error('必须实现delete方法');
  }

  /**
   * 检查Agent是否存在
   * @param {string} id
   */
  async exists(_id) {
    throw new Error('必须实现exists方法');
  }

  /**
   * 统计Agent数量
   */
  async count() {
    throw new Error('必须实现count方法');
  }

  /**
   * 查找可用的Agent（可以执行任务的）
   */
  async findAvailable() {
    throw new Error('必须实现findAvailable方法');
  }
}
