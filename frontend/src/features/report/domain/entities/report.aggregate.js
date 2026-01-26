/**
 * 报告聚合根
 */
import { AggregateRoot } from '../../../../shared/domain/aggregate-root.base.js';
import { ReportId } from '../value-objects/report-id.vo.js';
import { ReportType } from '../value-objects/report-type.vo.js';
import { ReportStatus } from '../value-objects/report-status.vo.js';
import { ReportSection } from '../value-objects/report-section.vo.js';
import { ReportCreatedEvent } from '../events/report-created.event.js';
import { ReportSectionAddedEvent } from '../events/report-section-added.event.js';
import { ReportGeneratedEvent } from '../events/report-generated.event.js';
import { ReportStatusChangedEvent } from '../events/report-status-changed.event.js';

export class Report extends AggregateRoot {
  constructor(id) {
    super(id);
    this._projectId = null;
    this._type = null;
    this._title = '';
    this._description = '';
    this._status = null;
    this._sections = [];
    this._metadata = {};
    this._generatedContent = '';
    this._generatedAt = null;
    this._generatedBy = null;
    this._templateId = null;
    this._tags = [];
    this._permissions = {
      canView: [],
      canEdit: [],
      canDelete: []
    };
  }

  // 工厂方法
  static create(props) {
    const reportId = new ReportId();
    const report = new Report(reportId);

    report._projectId = props.projectId;
    report._type = props.type || ReportType.CUSTOM_REPORT;
    report._title = props.title || 'Untitled Report';
    report._description = props.description || '';
    report._status = new ReportStatus('draft');
    report._sections = [];
    report._metadata = props.metadata || {};
    report._tags = props.tags || [];
    report._createdAt = new Date();

    // 添加领域事件
    report.addDomainEvent(
      new ReportCreatedEvent({
        reportId: reportId.value,
        projectId: props.projectId,
        type: report._type.value,
        title: report._title,
        description: report._description
      })
    );

    return report;
  }

  // 添加章节
  addSection(sectionProps) {
    const section = new ReportSection({
      title: sectionProps.title,
      content: sectionProps.content,
      type: sectionProps.type || 'text',
      order: this._sections.length + 1,
      metadata: sectionProps.metadata || {}
    });

    this._sections.push(section);

    // 添加领域事件
    this.addDomainEvent(
      new ReportSectionAddedEvent({
        reportId: this.id.value,
        projectId: this._projectId,
        sectionTitle: section.title,
        sectionType: section.type,
        sectionOrder: section.order
      })
    );

    return section;
  }

  // 更新章节
  updateSection(index, updates) {
    if (index < 0 || index >= this._sections.length) {
      throw new Error('Section index out of range');
    }

    const section = this._sections[index];
    section.update(updates);

    this._updatedAt = new Date();
  }

  // 删除章节
  removeSection(index) {
    if (index < 0 || index >= this._sections.length) {
      throw new Error('Section index out of range');
    }

    this._sections.splice(index, 1);

    // 重新排序
    this._sections.forEach((section, i) => {
      section.order = i + 1;
    });

    this._updatedAt = new Date();
  }

  // 生成报告
  generate(content, generatedBy) {
    if (!this._status.isDraft() && !this._status.isRevision()) {
      throw new Error('Report can only be generated when status is DRAFT or REVISION');
    }

    this._generatedContent = content;
    this._generatedAt = new Date();
    this._generatedBy = generatedBy;
    this._status = new ReportStatus('generated');

    // 添加领域事件
    this.addDomainEvent(
      new ReportGeneratedEvent({
        reportId: this.id.value,
        projectId: this._projectId,
        type: this._type.value,
        title: this._title,
        generatedBy: generatedBy,
        sectionCount: this._sections.length
      })
    );

    this._updatedAt = new Date();
  }

  // 更新状态
  updateStatus(newStatus) {
    const oldStatus = this._status.value;
    this._status = new ReportStatus(newStatus);

    // 添加领域事件
    this.addDomainEvent(
      new ReportStatusChangedEvent({
        reportId: this.id.value,
        projectId: this._projectId,
        oldStatus: oldStatus,
        newStatus: newStatus,
        changedAt: new Date()
      })
    );

    this._updatedAt = new Date();
  }

  // 更新基本信息
  updateInfo(updates) {
    if (updates.title !== undefined) {
      this._title = updates.title;
    }
    if (updates.description !== undefined) {
      this._description = updates.description;
    }
    if (updates.metadata !== undefined) {
      this._metadata = { ...this._metadata, ...updates.metadata };
    }
    if (updates.tags !== undefined) {
      this._tags = updates.tags;
    }

    this._updatedAt = new Date();
  }

  // 设置模板
  setTemplate(templateId) {
    this._templateId = templateId;
    this._updatedAt = new Date();
  }

  // 更新权限
  updatePermissions(permissions) {
    if (permissions.canView !== undefined) {
      this._permissions.canView = permissions.canView;
    }
    if (permissions.canEdit !== undefined) {
      this._permissions.canEdit = permissions.canEdit;
    }
    if (permissions.canDelete !== undefined) {
      this._permissions.canDelete = permissions.canDelete;
    }

    this._updatedAt = new Date();
  }

  // 获取报告摘要
  getSummary() {
    return {
      id: this.id.value,
      projectId: this._projectId,
      type: this._type.value,
      typeDisplayName: this._type.getDisplayName(),
      title: this._title,
      description: this._description,
      status: this._status.value,
      statusDisplayName: this._status.getDisplayName(),
      sectionCount: this._sections.length,
      tags: this._tags,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      generatedAt: this._generatedAt,
      generatedBy: this._generatedBy
    };
  }

  // 获取完整报告数据
  getFullReport() {
    return {
      ...this.getSummary(),
      sections: this._sections.map(section => section.toJSON()),
      metadata: this._metadata,
      generatedContent: this._generatedContent,
      templateId: this._templateId,
      permissions: this._permissions
    };
  }

  // 属性访问器
  get projectId() {
    return this._projectId;
  }
  get type() {
    return this._type;
  }
  get title() {
    return this._title;
  }
  get description() {
    return this._description;
  }
  get status() {
    return this._status;
  }
  get sections() {
    return [...this._sections];
  }
  get metadata() {
    return { ...this._metadata };
  }
  get generatedContent() {
    return this._generatedContent;
  }
  get generatedAt() {
    return this._generatedAt;
  }
  get generatedBy() {
    return this._generatedBy;
  }
  get templateId() {
    return this._templateId;
  }
  get tags() {
    return [...this._tags];
  }
  get permissions() {
    return { ...this._permissions };
  }

  // 状态检查方法
  isDraft() {
    return this._status.isDraft();
  }
  isGenerated() {
    return this._status.isGenerated();
  }
  isPublished() {
    return this._status.isPublished();
  }
  isArchived() {
    return this._status.isArchived();
  }
  isRevision() {
    return this._status.isRevision();
  }

  // 权限检查
  canView(userId) {
    return (
      this._permissions.canView.includes(userId) ||
      this._permissions.canEdit.includes(userId) ||
      this._permissions.canDelete.includes(userId)
    );
  }

  canEdit(userId) {
    return (
      this._permissions.canEdit.includes(userId) || this._permissions.canDelete.includes(userId)
    );
  }

  canDelete(userId) {
    return this._permissions.canDelete.includes(userId);
  }
}
