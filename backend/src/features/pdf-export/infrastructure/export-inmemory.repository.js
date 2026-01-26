/**
 * Export内存仓库实现
 */
import { IExportRepository } from '../domain/export.repository.js';
import { ExportId } from '../domain/value-objects/export-id.vo.js';
import { ExportStatus } from '../domain/value-objects/export-status.vo.js';

export class ExportInMemoryRepository extends IExportRepository {
  constructor() {
    super();
    this.exports = new Map();
  }

  async save(exportEntity) {
    this.exports.set(exportEntity.id.value, exportEntity);
    return exportEntity;
  }

  async findById(exportId) {
    const id = exportId instanceof ExportId ? exportId.value : exportId;
    return this.exports.get(id) || null;
  }

  async findByProjectId(projectId) {
    const results = [];
    for (const exportEntity of this.exports.values()) {
      if (exportEntity.projectId === projectId) {
        results.push(exportEntity);
      }
    }
    return results;
  }

  async findByStatus(status) {
    const results = [];
    const statusValue = status instanceof ExportStatus ? status.value : status;

    for (const exportEntity of this.exports.values()) {
      if (exportEntity.status.value === statusValue) {
        results.push(exportEntity);
      }
    }
    return results;
  }

  async delete(exportId) {
    const id = exportId instanceof ExportId ? exportId.value : exportId;
    return this.exports.delete(id);
  }

  nextId() {
    return new ExportId(`export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  }

  async clear() {
    this.exports.clear();
  }

  async count() {
    return this.exports.size;
  }
}
