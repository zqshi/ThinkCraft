/**
 * Share聚合根仓库接口
 */
export class IShareRepository {
  /**
   * 保存Share
   */
  async save(share) {
    throw new Error('Method not implemented');
  }

  /**
   * 根据ID查找Share
   */
  async findById(shareId) {
    throw new Error('Method not implemented');
  }

  /**
   * 根据分享链接查找Share
   */
  async findByShareLink(shareLink) {
    throw new Error('Method not implemented');
  }

  /**
   * 根据资源ID查找所有Share
   */
  async findByResourceId(resourceId) {
    throw new Error('Method not implemented');
  }

  /**
   * 根据创建者查找Share
   */
  async findByCreatedBy(createdBy) {
    throw new Error('Method not implemented');
  }

  /**
   * 根据状态查找Share
   */
  async findByStatus(status) {
    throw new Error('Method not implemented');
  }

  /**
   * 查找过期的分享
   */
  async findExpired() {
    throw new Error('Method not implemented');
  }

  /**
   * 删除Share
   */
  async delete(shareId) {
    throw new Error('Method not implemented');
  }

  /**
   * 获取下一个ID
   */
  nextId() {
    throw new Error('Method not implemented');
  }
}
