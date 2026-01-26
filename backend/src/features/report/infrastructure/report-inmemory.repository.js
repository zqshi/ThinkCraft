/**
 * Report内存仓库实现
 */
import { IReportRepository } from '../domain/report.repository.js';
import { ReportId } from '../domain/value-objects/report-id.vo.js';
import { ReportType } from '../domain/value-objects/report-type.vo.js';
import { ReportStatus } from '../domain/value-objects/report-status.vo.js';

export class ReportInMemoryRepository extends IReportRepository {
  constructor() {
    super();
    this.reports = new Map();
  }

  async save(report) {
    this.reports.set(report.id.value, report);
    return report;
  }

  async findById(reportId) {
    const id = reportId instanceof ReportId ? reportId.value : reportId;
    return this.reports.get(id) || null;
  }

  async findByProjectId(projectId) {
    const results = [];
    for (const report of this.reports.values()) {
      if (report.projectId === projectId) {
        results.push(report);
      }
    }
    return results.sort((a, b) => b.createdAt - a.createdAt);
  }

  async findByType(type) {
    const results = [];
    const typeValue = type instanceof ReportType ? type.value : type;

    for (const report of this.reports.values()) {
      if (report.type.value === typeValue) {
        results.push(report);
      }
    }
    return results.sort((a, b) => b.createdAt - a.createdAt);
  }

  async findByStatus(status) {
    const results = [];
    const statusValue = status instanceof ReportStatus ? status.value : status;

    for (const report of this.reports.values()) {
      if (report.status.value === statusValue) {
        results.push(report);
      }
    }
    return results.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async delete(reportId) {
    const id = reportId instanceof ReportId ? reportId.value : reportId;
    return this.reports.delete(id);
  }

  nextId() {
    return new ReportId(`report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  }

  async clear() {
    this.reports.clear();
  }

  async count() {
    return this.reports.size;
  }

  /**
   * 获取所有报告（用于实现分页）
   */
  async findAll(offset = 0, limit = 50) {
    const reports = Array.from(this.reports.values()).sort((a, b) => b.createdAt - a.createdAt);

    return {
      data: reports.slice(offset, offset + limit),
      total: reports.length,
      hasMore: offset + limit < reports.length
    };
  }
}

export default ReportInMemoryRepository;
