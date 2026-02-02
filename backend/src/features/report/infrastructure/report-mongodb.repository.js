/**
 * Report MongoDB 仓库实现
 */
import { IReportRepository } from '../domain/report.repository.js';
import { Report } from '../domain/report.aggregate.js';
import { ReportId } from '../domain/value-objects/report-id.vo.js';
import { ReportType } from '../domain/value-objects/report-type.vo.js';
import { ReportStatus } from '../domain/value-objects/report-status.vo.js';
import { ReportModel } from './report.model.js';

export class ReportMongoRepository extends IReportRepository {
  async save(report) {
    const data = report.toJSON();
    await ReportModel.findByIdAndUpdate(
      data.id,
      {
        _id: data.id,
        projectId: data.projectId,
        type: data.type,
        status: data.status,
        title: data.title,
        description: data.description,
        sections: data.sections || [],
        metadata: data.metadata || {},
        completedAt: data.completedAt || null,
        version: report.version || 0
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return report;
  }

  async findById(reportId) {
    const id = reportId instanceof ReportId ? reportId.value : reportId;
    const doc = await ReportModel.findById(id).lean();
    return doc ? Report.fromJSON(this._fromDoc(doc)) : null;
  }

  async findByProjectId(projectId) {
    const docs = await ReportModel.find({ projectId }).sort({ createdAt: -1 }).lean();
    return docs.map(doc => Report.fromJSON(this._fromDoc(doc)));
  }

  async findByType(type) {
    const typeValue = type instanceof ReportType ? type.value : type;
    const docs = await ReportModel.find({ type: typeValue }).sort({ createdAt: -1 }).lean();
    return docs.map(doc => Report.fromJSON(this._fromDoc(doc)));
  }

  async findByStatus(status) {
    const statusValue = status instanceof ReportStatus ? status.value : status;
    const docs = await ReportModel.find({ status: statusValue }).sort({ updatedAt: -1 }).lean();
    return docs.map(doc => Report.fromJSON(this._fromDoc(doc)));
  }

  async delete(reportId) {
    const id = reportId instanceof ReportId ? reportId.value : reportId;
    await ReportModel.findByIdAndDelete(id);
    return true;
  }

  nextId() {
    return new ReportId(`report_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);
  }

  _fromDoc(doc) {
    return {
      id: doc._id,
      projectId: doc.projectId,
      type: doc.type,
      status: doc.status,
      title: doc.title,
      description: doc.description,
      sections: doc.sections || [],
      metadata: doc.metadata || {},
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      completedAt: doc.completedAt,
      version: doc.version || 0
    };
  }
}

export default ReportMongoRepository;
