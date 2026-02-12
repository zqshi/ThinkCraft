/**
 * Report聚合根仓库接口
 */
export class IReportRepository {
  /**
   * 保存Report
   */
  async save(_report) {
    throw new Error('Method not implemented');
  }

  /**
   * 根据ID查找Report
   */
  async findById(_reportId) {
    throw new Error('Method not implemented');
  }

  /**
   * 根据项目ID查找所有Report
   */
  async findByProjectId(_projectId) {
    throw new Error('Method not implemented');
  }

  /**
   * 根据类型查找Report
   */
  async findByType(_type) {
    throw new Error('Method not implemented');
  }

  /**
   * 根据状态查找Report
   */
  async findByStatus(_status) {
    throw new Error('Method not implemented');
  }

  /**
   * 删除Report
   */
  async delete(_reportId) {
    throw new Error('Method not implemented');
  }

  /**
   * 获取下一个ID
   */
  nextId() {
    throw new Error('Method not implemented');
  }
}
