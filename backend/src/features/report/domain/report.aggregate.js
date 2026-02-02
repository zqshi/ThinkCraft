/**
 * Report聚合根
 */
import { AggregateRoot } from '../../../shared/domain/aggregate-root.base.js';
import { ReportId } from './value-objects/report-id.vo.js';
import { ReportType } from './value-objects/report-type.vo.js';
import { ReportStatus } from './value-objects/report-status.vo.js';
import { ReportSection } from './entities/report-section.entity.js';
import { ReportCreatedEvent } from './events/report-created.event.js';
import { ReportGenerationStartedEvent } from './events/report-generation-started.event.js';
import { ReportCompletedEvent } from './events/report-completed.event.js';
import { ReportFailedEvent } from './events/report-failed.event.js';
import { ReportSectionAddedEvent } from './events/report-section-added.event.js';
import { ReportSectionUpdatedEvent } from './events/report-section-updated.event.js';

export class Report extends AggregateRoot {
  constructor(id, props) {
    super(id, props);
    this._sections = new Map();
  }

  get projectId() {
    return this.props.projectId;
  }

  get type() {
    return this.props.type;
  }

  get status() {
    return this.props.status;
  }

  get title() {
    return this.props.title;
  }

  get description() {
    return this.props.description;
  }

  get sections() {
    return Array.from(this._sections.values()).sort((a, b) => a.order - b.order);
  }

  get metadata() {
    return this.props.metadata;
  }

  get createdAt() {
    return this.props.createdAt;
  }

  get updatedAt() {
    return this.props.updatedAt;
  }

  get completedAt() {
    return this.props.completedAt;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      projectId: this.props.projectId,
      type: this.props.type?.value || this.props.type,
      status: this.props.status?.value || this.props.status,
      title: this.props.title,
      description: this.props.description,
      sections: this.sections.map(section => ({
        id: section.id,
        title: section.title,
        content: section.content,
        order: section.order,
        type: section.type,
        metadata: section.metadata
      })),
      metadata: this.props.metadata || {},
      completedAt: this.props.completedAt
    };
  }

  static fromJSON(data) {
    const report = new Report(new ReportId(data.id), {
      projectId: data.projectId,
      type: new ReportType(data.type),
      status: new ReportStatus(data.status),
      title: data.title,
      description: data.description,
      metadata: data.metadata || {},
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
      completedAt: data.completedAt ? new Date(data.completedAt) : null
    });

    report._version = data.version || 0;
    report._sections = new Map();

    for (const section of data.sections || []) {
      const reportSection = new ReportSection(section.id, {
        title: section.title,
        content: section.content,
        order: section.order,
        type: section.type,
        metadata: section.metadata || {}
      });
      report._sections.set(reportSection.id, reportSection);
    }

    report.createdAt = report.props.createdAt;
    report.updatedAt = report.props.updatedAt;

    return report;
  }

  static create(props) {
    const report = new Report(new ReportId(`report_${Date.now()}`), {
      ...props,
      status: new ReportStatus(ReportStatus.DRAFT),
      metadata: props.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null
    });

    report.addDomainEvent(
      new ReportCreatedEvent({
        reportId: report.id.value,
        projectId: props.projectId,
        type: props.type.value,
        title: props.title
      })
    );

    return report;
  }

  updateTitle(newTitle) {
    if (!this.status.canEdit()) {
      throw new Error('Report title can only be updated when status is DRAFT or FAILED');
    }

    this.props.title = newTitle;
    this.touch();
  }

  updateDescription(newDescription) {
    if (!this.status.canEdit()) {
      throw new Error('Report description can only be updated when status is DRAFT or FAILED');
    }

    this.props.description = newDescription;
    this.touch();
  }

  addSection(sectionData) {
    if (!this.status.canEdit()) {
      throw new Error('Report sections can only be added when status is DRAFT or FAILED');
    }

    const section = new ReportSection(`section_${Date.now()}_${Math.random()}`, {
      ...sectionData,
      order: sectionData.order || this._sections.size
    });

    this._sections.set(section.id, section);
    this.touch();

    this.addDomainEvent(
      new ReportSectionAddedEvent({
        reportId: this.id.value,
        sectionId: section.id,
        title: section.title,
        order: section.order
      })
    );

    return section;
  }

  updateSection(sectionId, updates) {
    if (!this.status.canEdit()) {
      throw new Error('Report sections can only be updated when status is DRAFT or FAILED');
    }

    const section = this._sections.get(sectionId);
    if (!section) {
      throw new Error('Section not found');
    }

    if (updates.title !== undefined) {
      section.updateTitle(updates.title);
    }

    if (updates.content !== undefined) {
      section.updateContent(updates.content);
    }

    if (updates.order !== undefined) {
      section.updateOrder(updates.order);
    }

    if (updates.metadata !== undefined) {
      section.updateMetadata(updates.metadata);
    }

    this.touch();

    this.addDomainEvent(
      new ReportSectionUpdatedEvent({
        reportId: this.id.value,
        sectionId: section.id,
        updates
      })
    );
  }

  removeSection(sectionId) {
    if (!this.status.canEdit()) {
      throw new Error('Report sections can only be removed when status is DRAFT or FAILED');
    }

    const section = this._sections.get(sectionId);
    if (!section) {
      throw new Error('Section not found');
    }

    this._sections.delete(sectionId);
    this.touch();
  }

  startGeneration() {
    if (!this.status.canGenerate()) {
      throw new Error('Report generation can only be started when status is DRAFT or FAILED');
    }

    this.props.status = new ReportStatus(ReportStatus.GENERATING);
    this.touch();

    this.addDomainEvent(
      new ReportGenerationStartedEvent({
        reportId: this.id.value,
        projectId: this.props.projectId,
        type: this.props.type.value
      })
    );
  }

  completeGeneration() {
    if (!this.status.isGenerating()) {
      throw new Error('Report can only be completed when status is GENERATING');
    }

    this.props.status = new ReportStatus(ReportStatus.COMPLETED);
    this.props.completedAt = new Date();
    this.touch();

    this.addDomainEvent(
      new ReportCompletedEvent({
        reportId: this.id.value,
        projectId: this.props.projectId,
        type: this.props.type.value,
        sectionCount: this._sections.size,
        completedAt: this.props.completedAt
      })
    );
  }

  failGeneration(error) {
    this.props.status = new ReportStatus(ReportStatus.FAILED);
    this.props.error = error;
    this.touch();

    this.addDomainEvent(
      new ReportFailedEvent({
        reportId: this.id.value,
        projectId: this.props.projectId,
        type: this.props.type.value,
        error: error.message || error
      })
    );
  }

  archive() {
    if (!this.status.canArchive()) {
      throw new Error('Report can only be archived when status is COMPLETED');
    }

    this.props.status = new ReportStatus(ReportStatus.ARCHIVED);
    this.touch();
  }

  updateMetadata(newMetadata) {
    this.props.metadata = { ...this.props.metadata, ...newMetadata };
    this.touch();
  }

  getSectionById(sectionId) {
    return this._sections.get(sectionId) || null;
  }

  getSectionByOrder(order) {
    return this.sections.find(section => section.order === order) || null;
  }

  touch() {
    this.props.updatedAt = new Date();
  }

  validate() {
    if (!this.props.projectId) {
      throw new Error('Project ID is required');
    }

    if (!(this.props.type instanceof ReportType)) {
      throw new Error('Type must be a ReportType instance');
    }

    if (!(this.props.status instanceof ReportStatus)) {
      throw new Error('Status must be a ReportStatus instance');
    }

    if (!this.props.title || typeof this.props.title !== 'string') {
      throw new Error('Title must be a non-empty string');
    }

    if (this.props.description && typeof this.props.description !== 'string') {
      throw new Error('Description must be a string');
    }

    if (!(this.props.metadata instanceof Object)) {
      throw new Error('Metadata must be an object');
    }

    if (!(this.props.createdAt instanceof Date)) {
      throw new Error('Created at must be a Date instance');
    }

    if (!(this.props.updatedAt instanceof Date)) {
      throw new Error('Updated at must be a Date instance');
    }

    if (this.props.completedAt && !(this.props.completedAt instanceof Date)) {
      throw new Error('Completed at must be a Date instance or null');
    }
  }
}
