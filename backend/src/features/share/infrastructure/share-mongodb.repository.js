/**
 * Share MongoDB 仓库实现
 */
import { IShareRepository } from '../domain/share.repository.js';
import { Share } from '../domain/share.aggregate.js';
import { ShareId } from '../domain/value-objects/share-id.vo.js';
import { ShareStatus } from '../domain/value-objects/share-status.vo.js';
import { ShareModel } from './share.model.js';

export class ShareMongoRepository extends IShareRepository {
  async save(share) {
    const data = share.toJSON();
    await ShareModel.findByIdAndUpdate(
      data.id,
      {
        _id: data.id,
        resourceId: data.resourceId,
        resourceType: data.resourceType,
        title: data.title,
        description: data.description,
        shareLink: data.shareLink,
        permission: data.permission,
        status: data.status,
        expiresAt: data.expiresAt || null,
        password: data.password || null,
        accessCount: data.accessCount || 0,
        lastAccessedAt: data.lastAccessedAt || null,
        createdBy: data.createdBy
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return share;
  }

  async findById(shareId) {
    const id = shareId instanceof ShareId ? shareId.value : shareId;
    const doc = await ShareModel.findById(id).lean();
    return doc ? Share.fromJSON(this._fromDoc(doc)) : null;
  }

  async findByShareLink(shareLink) {
    const doc = await ShareModel.findOne({ shareLink }).lean();
    return doc ? Share.fromJSON(this._fromDoc(doc)) : null;
  }

  async findByResourceId(resourceId) {
    const docs = await ShareModel.find({ resourceId }).sort({ createdAt: -1 }).lean();
    return docs.map(doc => Share.fromJSON(this._fromDoc(doc)));
  }

  async findByCreatedBy(createdBy) {
    const docs = await ShareModel.find({ createdBy }).sort({ createdAt: -1 }).lean();
    return docs.map(doc => Share.fromJSON(this._fromDoc(doc)));
  }

  async findByStatus(status) {
    const statusValue = status instanceof ShareStatus ? status.value : status;
    const docs = await ShareModel.find({ status: statusValue }).sort({ updatedAt: -1 }).lean();
    return docs.map(doc => Share.fromJSON(this._fromDoc(doc)));
  }

  async findExpired() {
    const now = new Date();
    const docs = await ShareModel.find({ expiresAt: { $lte: now } }).lean();
    return docs.map(doc => Share.fromJSON(this._fromDoc(doc)));
  }

  async delete(shareId) {
    const id = shareId instanceof ShareId ? shareId.value : shareId;
    await ShareModel.findByIdAndDelete(id);
    return true;
  }

  async deleteByResourceId(resourceId) {
    await ShareModel.deleteMany({ resourceId });
    return true;
  }

  async countByCreatedBy(createdBy) {
    return ShareModel.countDocuments({ createdBy });
  }

  _fromDoc(doc) {
    return {
      id: doc._id,
      resourceId: doc.resourceId,
      resourceType: doc.resourceType,
      title: doc.title,
      description: doc.description,
      shareLink: doc.shareLink,
      permission: doc.permission,
      status: doc.status,
      expiresAt: doc.expiresAt,
      password: doc.password,
      accessCount: doc.accessCount,
      lastAccessedAt: doc.lastAccessedAt,
      createdBy: doc.createdBy,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      version: doc.version || 0
    };
  }
}

export default ShareMongoRepository;
