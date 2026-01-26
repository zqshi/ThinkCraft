/**
 * Demo聚合根仓库接口
 */
export class IDemoRepository {
  /**
   * 保存Demo
   */
  async save(demo) {
    throw new Error('Method not implemented');
  }

  /**
   * 根据ID查找Demo
   */
  async findById(demoId) {
    throw new Error('Method not implemented');
  }

  /**
   * 根据项目ID查找所有Demo
   */
  async findByProjectId(projectId) {
    throw new Error('Method not implemented');
  }

  /**
   * 删除Demo
   */
  async delete(demoId) {
    throw new Error('Method not implemented');
  }

  /**
   * 获取下一个ID
   */
  nextId() {
    throw new Error('Method not implemented');
  }
}
