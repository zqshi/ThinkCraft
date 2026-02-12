/**
 * Export聚合根仓库接口
 */
export class IExportRepository {
  /**
   * 保存Export
   */
  async save(_exportEntity) {
    throw new Error('Method not implemented');
  }

  /**
   * 根据ID查找Export
   */
  async findById(_exportId) {
    throw new Error('Method not implemented');
  }

  /**
   * 根据项目ID查找所有Export
   */
  async findByProjectId(_projectId) {
    throw new Error('Method not implemented');
  }

  /**
   * 根据状态查找Export
   */
  async findByStatus(_status) {
    throw new Error('Method not implemented');
  }

  /**
   * 删除Export
   */
  async delete(_exportId) {
    throw new Error('Method not implemented');
  }

  /**
   * 获取下一个ID
   */
  nextId() {
    throw new Error('Method not implemented');
  }
}
