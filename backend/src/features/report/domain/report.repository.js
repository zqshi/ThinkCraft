/**
 * Report聚合根仓库接口
 */
export class IReportRepository {
  /**
   * 保存Report
   */
  async save(report) {
    throw new Error('Method not implemented');
  }

  /**
   * 根据ID查找Report
   */
  async findById(reportId) {
    throw new Error('Method not implemented');
  }

  /**
   * 根据项目ID查找所有Report
   */
  async findByProjectId(projectId) {
    throw new Error('Method not implemented');
  }

  /**
   * 根据类型查找Report
   */
  async findByType(type) {
    throw new Error('Method not implemented');
  }

  /**
   * 根据状态查找Report
   */
  async findByStatus(status) {
    throw new Error('Method not implemented');
  }

  /**
   * 删除Report
   */
  async delete(reportId) {
    throw new Error('Method not implemented');
  }

  /**
   * 获取下一个ID
   */
  nextId() {
    throw new Error('Method not implemented');
  }
}
