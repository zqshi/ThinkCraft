/**
 * 报告聚合根
 * 管理报告的业务逻辑和完整性
 */
import { AggregateRoot } from '../../../shared/domain/aggregate-root.base.js';
import { ReportId } from './value-objects/report-id.vo.js';
import { ReportType } from './value-objects/report-type.vo.js';
import { ReportStatus } from './value-objects/report-status.vo.js';
import { ReportTitle } from './value-objects/report-title.vo.js';
import { ReportDescription } from './value-objects/report-description.vo.js';
import { ReportSection } from './entities/report-section.entity.js';
import { ReportSectionId } from './value-objects/report-section-id.vo.js';
import { ReportSectionTitle } from './value-objects/report-section-title.vo.js';
import { ReportSectionContent } from './value-objects/report-section-content.vo.js';
import { UserId } from '../../shared/value-objects/user-id.vo.js';
import { ReportCreatedEvent } from './events/report-created.event.js';
import { ReportSectionAddedEvent } from './events/report-section-added.event.js';
import { ReportSectionUpdatedEvent } from './events/report-section-updated.event.js';
import { ReportSectionRemovedEvent } from './events/report-section-removed.event.js';
import { ReportGeneratedEvent } from './events/report-generated.event.js';
import { ReportStatusChangedEvent } from './events/report-status-changed.event.js';

export class Report extends AggregateRoot {
  constructor(
    id,
    projectId,
    type,
    title,
    description = null,
    status = ReportStatus.DRAFT,
    sections = [],
    generatedBy = null,
    generatedAt = null,
    totalPages = 0,
    wordCount = 0,
    metadata = {}
  ) {
    super(id);
    this._projectId = projectId;
    this._type = type;
    this._title = title;
    this._description = description;
    this._status = status;
    this._sections = sections;
    this._generatedBy = generatedBy;
    this._generatedAt = generatedAt;
    this._totalPages = totalPages;
    this._wordCount = wordCount;
    this._metadata = metadata;
  }

  /**
   * 创建报告
   */
  static create({ projectId, type, title, description, generatedBy }) {
    const reportId = ReportId.generate();
    const reportType = type instanceof ReportType ? type : ReportType.fromString(type);
    const reportTitle = new ReportTitle(title);
    const reportDescription = description ? new ReportDescription(description) : null;
    const userId = generatedBy ? new UserId(generatedBy) : null;

    const report = new Report(
      reportId,
      projectId,
      reportType,
      reportTitle,
      reportDescription,
      ReportStatus.DRAFT,
      [],
      userId
    );

    // 添加领域事件
    report.addDomainEvent(
      new ReportCreatedEvent({
        reportId: reportId.value,
        projectId: projectId,
        type: reportType.value,
        title: title,
        generatedBy: generatedBy,
        timestamp: new Date()
      })
    );

    return report;
  }

  /**
   * 添加章节
   */
  addSection({ title, content, orderIndex, sectionType = 'content' }) {
    if (this._status.isGenerated()) {
      throw new Error('已生成的报告不能添加章节');
    }

    const sectionId = ReportSectionId.generate();
    const sectionTitle = new ReportSectionTitle(title);
    const sectionContent = new ReportSectionContent(content);

    const section = new ReportSection(
      sectionId,
      this.id,
      sectionTitle,
      sectionContent,
      orderIndex !== undefined ? orderIndex : this._sections.length,
      sectionType
    );

    // 插入到指定位置
    if (orderIndex !== undefined) {
      this._sections.splice(orderIndex, 0, section);
      // 更新后续章节的索引
      for (let i = orderIndex + 1; i < this._sections.length; i++) {
        this._sections[i].updateOrderIndex(i);
      }
    } else {
      this._sections.push(section);
    }

    this.updateWordCount();
    this.updateTimestamp();

    this.addDomainEvent(
      new ReportSectionAddedEvent({
        reportId: this.id.value,
        sectionId: sectionId.value,
        title: title,
        orderIndex: section.orderIndex,
        sectionType: sectionType,
        timestamp: new Date()
      })
    );

    return section;
  }

  /**
   * 更新章节
   */
  updateSection(sectionId, { title, content, orderIndex }) {
    const section = this._sections.find(s => s.id.value === sectionId);

    if (!section) {
      throw new Error(`章节不存在: ${sectionId}`);
    }

    if (this._status.isGenerated()) {
      throw new Error('已生成的报告不能更新章节');
    }

    const oldOrderIndex = section.orderIndex;

    if (title !== undefined) {
      section.updateTitle(title);
    }

    if (content !== undefined) {
      section.updateContent(content);
    }

    if (orderIndex !== undefined && orderIndex !== oldOrderIndex) {
      this.reorderSection(section, orderIndex);
    }

    this.updateWordCount();
    this.updateTimestamp();

    this.addDomainEvent(
      new ReportSectionUpdatedEvent({
        reportId: this.id.value,
        sectionId: sectionId,
        title: title,
        content: content,
        orderIndex: orderIndex,
        timestamp: new Date()
      })
    );

    return section;
  }

  /**
   * 删除章节
   */
  removeSection(sectionId) {
    const sectionIndex = this._sections.findIndex(s => s.id.value === sectionId);

    if (sectionIndex === -1) {
      throw new Error(`章节不存在: ${sectionId}`);
    }

    if (this._status.isGenerated()) {
      throw new Error('已生成的报告不能删除章节');
    }

    const section = this._sections[sectionIndex];
    this._sections.splice(sectionIndex, 1);

    // 更新后续章节的索引
    for (let i = sectionIndex; i < this._sections.length; i++) {
      this._sections[i].updateOrderIndex(i);
    }

    this.updateWordCount();
    this.updateTimestamp();

    this.addDomainEvent(
      new ReportSectionRemovedEvent({
        reportId: this.id.value,
        sectionId: sectionId,
        sectionTitle: section.title.value,
        timestamp: new Date()
      })
    );
  }

  /**
   * 重新排序章节
   */
  reorderSection(section, newOrderIndex) {
    const currentIndex = this._sections.findIndex(s => s.id.value === section.id.value);

    if (currentIndex === -1) {
      throw new Error('章节不在报告中');
    }

    // 从当前位置移除
    this._sections.splice(currentIndex, 1);

    // 插入到新位置
    this._sections.splice(newOrderIndex, 0, section);

    // 更新所有章节的索引
    this._sections.forEach((s, index) => {
      s.updateOrderIndex(index);
    });
  }

  /**
   * 生成报告
   */
  generate(generatedBy) {
    if (this._sections.length === 0) {
      throw new Error('报告没有内容，不能生成');
    }

    if (this._status.isGenerated()) {
      throw new Error('报告已经生成');
    }

    const oldStatus = this._status;
    this._status = ReportStatus.GENERATED;
    this._generatedBy = new UserId(generatedBy);
    this._generatedAt = new Date();
    this.updateTimestamp();

    // 计算总页数（简化计算，实际需要更复杂的分页逻辑）
    const wordsPerPage = 250; // 假设每页250词
    this._totalPages = Math.ceil(this._wordCount / wordsPerPage);

    this.addDomainEvent(
      new ReportGeneratedEvent({
        reportId: this.id.value,
        projectId: this._projectId,
        oldStatus: oldStatus.value,
        newStatus: ReportStatus.GENERATED.value,
        totalPages: this._totalPages,
        wordCount: this._wordCount,
        generatedBy: generatedBy,
        timestamp: new Date()
      })
    );
  }

  /**
   * 更新状态
   */
  updateStatus(newStatus) {
    const oldStatus = this._status;
    this._status =
      newStatus instanceof ReportStatus ? newStatus : ReportStatus.fromString(newStatus);
    this.updateTimestamp();

    this.addDomainEvent(
      new ReportStatusChangedEvent({
        reportId: this.id.value,
        projectId: this._projectId,
        oldStatus: oldStatus.value,
        newStatus: this._status.value,
        timestamp: new Date()
      })
    );
  }

  /**
   * 添加元数据
   */
  addMetadata(key, value) {
    this._metadata[key] = value;
    this.updateTimestamp();
  }

  /**
   * 移除元数据
   */
  removeMetadata(key) {
    delete this._metadata[key];
    this.updateTimestamp();
  }

  /**
   * 更新字数统计
   */
  updateWordCount() {
    this._wordCount = this._sections.reduce((total, section) => {
      return total + section.wordCount;
    }, 0);
  }

  /**
   * 获取章节
   */
  getSection(sectionId) {
    return this._sections.find(s => s.id.value === sectionId);
  }

  /**
   * 获取所有章节（按顺序）
   */
  getAllSections() {
    return [...this._sections].sort((a, b) => a.orderIndex - b.orderIndex);
  }

  /**
   * 获取章节数量
   */
  get sectionCount() {
    return this._sections.length;
  }

  /**
   * 验证报告
   */
  validate() {
    if (!this._title || !this._title.value) {
      throw new Error('报告标题不能为空');
    }

    if (!this._projectId) {
      throw new Error('项目ID不能为空');
    }

    if (!(this._type instanceof ReportType)) {
      throw new Error('报告类型必须是ReportType类型');
    }

    if (!(this._status instanceof ReportStatus)) {
      throw new Error('报告状态必须是ReportStatus类型');
    }

    if (this._description && !(this._description instanceof ReportDescription)) {
      throw new Error('报告描述必须是ReportDescription类型');
    }

    if (!Array.isArray(this._sections)) {
      throw new Error('章节列表必须是数组');
    }

    this._sections.forEach(section => {
      if (!(section instanceof ReportSection)) {
        throw new Error('所有章节必须是ReportSection类型');
      }
    });

    if (this._wordCount < 0) {
      throw new Error('字数不能为负数');
    }

    if (this._totalPages < 0) {
      throw new Error('页数不能为负数');
    }
  }

  // Getters
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
    return this.getAllSections();
  }
  get generatedBy() {
    return this._generatedBy;
  }
  get generatedAt() {
    return this._generatedAt;
  }
  get totalPages() {
    return this._totalPages;
  }
  get wordCount() {
    return this._wordCount;
  }
  get metadata() {
    return { ...this._metadata };
  }
  get isDraft() {
    return this._status.isDraft();
  }
  get isGenerated() {
    return this._status.isGenerated();
  }

  toJSON() {
    return {
      ...super.toJSON(),
      projectId: this._projectId,
      type: this._type.value,
      title: this._title.value,
      description: this._description?.value,
      status: this._status.value,
      sections: this._sections.map(section => section.toJSON()),
      generatedBy: this._generatedBy?.value,
      generatedAt: this._generatedAt,
      totalPages: this._totalPages,
      wordCount: this._wordCount,
      metadata: this._metadata,
      sectionCount: this.sectionCount
    };
  }

  /**
   * 从JSON创建报告
   */
  static fromJSON(json) {
    const sections = json.sections ? json.sections.map(s => ReportSection.fromJSON(s)) : [];

    const report = new Report(
      new ReportId(json.id),
      json.projectId,
      ReportType.fromString(json.type),
      new ReportTitle(json.title),
      json.description ? new ReportDescription(json.description) : null,
      ReportStatus.fromString(json.status),
      sections,
      json.generatedBy ? new UserId(json.generatedBy) : null,
      json.generatedAt ? new Date(json.generatedAt) : null,
      json.totalPages || 0,
      json.wordCount || 0,
      json.metadata || {}
    );

    // 设置时间戳
    report._createdAt = new Date(json.createdAt);
    report._updatedAt = new Date(json.updatedAt);

    return report;
  }
}

/**
 * 报告工厂
 */
export class ReportFactory {
  static createDraft(projectId, type, title, description, generatedBy) {
    return Report.create({
      projectId,
      type,
      title,
      description,
      generatedBy
    });
  }

  static createFromJSON(json) {
    return Report.fromJSON(json);
  }
}

/**
 * 报告章节实体
 */
export class ReportSection {
  constructor(
    id,
    reportId,
    title,
    content,
    orderIndex,
    sectionType = 'content',
    wordCount = 0,
    metadata = {}
  ) {
    this.id = id;
    this._reportId = reportId;
    this._title = title;
    this._content = content;
    this._orderIndex = orderIndex;
    this._sectionType = sectionType;
    this._wordCount = wordCount;
    this._metadata = metadata;
    this._createdAt = new Date();
    this._updatedAt = new Date();
  }

  /**
   * 更新标题
   */
  updateTitle(title) {
    this._title = new ReportSectionTitle(title);
    this.updateTimestamp();
  }

  /**
   * 更新内容
   */
  updateContent(content) {
    this._content = new ReportSectionContent(content);
    this._wordCount = this.calculateWordCount();
    this.updateTimestamp();
  }

  /**
   * 更新排序索引
   */
  updateOrderIndex(orderIndex) {
    this._orderIndex = orderIndex;
    this.updateTimestamp();
  }

  /**
   * 更新元数据
   */
  updateMetadata(key, value) {
    this._metadata[key] = value;
    this.updateTimestamp();
  }

  /**
   * 计算字数
   */
  calculateWordCount() {
    return this._content.value
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0).length;
  }

  /**
   * 获取摘要
   */
  getSummary(maxLength = 200) {
    const content = this._content.value;
    if (content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength) + '...';
  }

  updateTimestamp() {
    this._updatedAt = new Date();
  }

  // Getters
  get reportId() {
    return this._reportId;
  }
  get title() {
    return this._title;
  }
  get content() {
    return this._content;
  }
  get orderIndex() {
    return this._orderIndex;
  }
  get sectionType() {
    return this._sectionType;
  }
  get wordCount() {
    return this._wordCount;
  }
  get metadata() {
    return { ...this._metadata };
  }
  get isContentType() {
    return this._sectionType === 'content';
  }

  toJSON() {
    return {
      id: this.id.value,
      reportId: this._reportId,
      title: this._title.value,
      content: this._content.value,
      orderIndex: this._orderIndex,
      sectionType: this._sectionType,
      wordCount: this._wordCount,
      summary: this.getSummary(100),
      metadata: this._metadata,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt
    };
  }

  /**
   * 从JSON创建章节
   */
  static fromJSON(json) {
    const section = new ReportSection(
      new ReportSectionId(json.id),
      json.reportId,
      new ReportSectionTitle(json.title),
      new ReportSectionContent(json.content),
      json.orderIndex,
      json.sectionType || 'content',
      json.wordCount || 0,
      json.metadata || {}
    );

    section._createdAt = new Date(json.createdAt);
    section._updatedAt = new Date(json.updatedAt);

    return section;
  }
}

/**
 * 报告类型值对象
 */
export class ReportType {
  static PROJECT_SUMMARY = new ReportType('PROJECT_SUMMARY');
  static PROGRESS_REPORT = new ReportType('PROGRESS_REPORT');
  static ANALYSIS_REPORT = new ReportType('ANALYSIS_REPORT');
  static FINANCIAL_REPORT = new ReportType('FINANCIAL_REPORT');
  static TECHNICAL_REPORT = new ReportType('TECHNICAL_REPORT');
  static MARKETING_REPORT = new ReportType('MARKETING_REPORT');
  static CUSTOM_REPORT = new ReportType('CUSTOM_REPORT');

  constructor(value) {
    this._value = value;
    this.validate();
  }

  static fromString(value) {
    const type = this[value.toUpperCase()];
    if (!type) {
      throw new Error(`无效的报告类型: ${value}`);
    }
    return type;
  }

  validate() {
    const validTypes = [
      'PROJECT_SUMMARY',
      'PROGRESS_REPORT',
      'ANALYSIS_REPORT',
      'FINANCIAL_REPORT',
      'TECHNICAL_REPORT',
      'MARKETING_REPORT',
      'CUSTOM_REPORT'
    ];
    if (!validTypes.includes(this._value)) {
      throw new Error(`无效的报告类型: ${this._value}`);
    }
  }

  get value() {
    return this._value;
  }

  getDisplayName() {
    const names = {
      PROJECT_SUMMARY: '项目总结报告',
      PROGRESS_REPORT: '进度报告',
      ANALYSIS_REPORT: '分析报告',
      FINANCIAL_REPORT: '财务报告',
      TECHNICAL_REPORT: '技术报告',
      MARKETING_REPORT: '营销报告',
      CUSTOM_REPORT: '自定义报告'
    };
    return names[this._value] || this._value;
  }

  getTemplate() {
    const templates = {
      PROJECT_SUMMARY: [
        { title: '项目概述', type: 'content' },
        { title: '主要成果', type: 'content' },
        { title: '总结与建议', type: 'content' }
      ],
      PROGRESS_REPORT: [
        { title: '本周完成', type: 'content' },
        { title: '下周计划', type: 'content' },
        { title: '问题与风险', type: 'content' }
      ],
      ANALYSIS_REPORT: [
        { title: '数据概况', type: 'content' },
        { title: '分析结果', type: 'content' },
        { title: '结论与建议', type: 'content' }
      ]
    };
    return templates[this._value] || [];
  }

  equals(other) {
    return other instanceof ReportType && this._value === other._value;
  }

  toString() {
    return this._value;
  }
  toJSON() {
    return this._value;
  }
}

/**
 * 报告状态值对象
 */
export class ReportStatus {
  static DRAFT = new ReportStatus('DRAFT');
  static IN_PROGRESS = new ReportStatus('IN_PROGRESS');
  static GENERATED = new ReportStatus('GENERATED');
  static ARCHIVED = new ReportStatus('ARCHIVED');

  constructor(value) {
    this._value = value;
    this.validate();
  }

  static fromString(value) {
    const status = this[value.toUpperCase()];
    if (!status) {
      throw new Error(`无效的报告状态: ${value}`);
    }
    return status;
  }

  validate() {
    const validStatuses = ['DRAFT', 'IN_PROGRESS', 'GENERATED', 'ARCHIVED'];
    if (!validStatuses.includes(this._value)) {
      throw new Error(`无效的报告状态: ${this._value}`);
    }
  }

  get value() {
    return this._value;
  }

  isDraft() {
    return this._value === 'DRAFT';
  }
  isInProgress() {
    return this._value === 'IN_PROGRESS';
  }
  isGenerated() {
    return this._value === 'GENERATED';
  }
  isArchived() {
    return this._value === 'ARCHIVED';
  }

  canEdit() {
    return this._value === 'DRAFT' || this._value === 'IN_PROGRESS';
  }

  canGenerate() {
    return this._value === 'DRAFT' || this._value === 'IN_PROGRESS';
  }

  equals(other) {
    return other instanceof ReportStatus && this._value === other._value;
  }

  toString() {
    return this._value;
  }
  toJSON() {
    return this._value;
  }
}

/**
 * 报告标题值对象
 */
export class ReportTitle {
  constructor(value) {
    this._value = value;
    this.validate();
  }

  validate() {
    if (!this._value || typeof this._value !== 'string') {
      throw new Error('报告标题不能为空且必须是字符串');
    }

    const trimmed = this._value.trim();
    if (trimmed.length === 0) {
      throw new Error('报告标题不能为空');
    }

    if (trimmed.length > 200) {
      throw new Error('报告标题不能超过200个字符');
    }

    this._value = trimmed;
  }

  get value() {
    return this._value;
  }

  equals(other) {
    return other instanceof ReportTitle && this._value === other._value;
  }

  toString() {
    return this._value;
  }
  toJSON() {
    return this._value;
  }
}

/**
 * 报告描述值对象
 */
export class ReportDescription {
  constructor(value) {
    this._value = value;
    this.validate();
  }

  validate() {
    if (typeof this._value !== 'string') {
      throw new Error('报告描述必须是字符串');
    }

    if (this._value.length > 2000) {
      throw new Error('报告描述不能超过2000个字符');
    }
  }

  get value() {
    return this._value;
  }
  get length() {
    return this._value.length;
  }

  getSummary(maxLength = 100) {
    if (this._value.length <= maxLength) {
      return this._value;
    }
    return this._value.substring(0, maxLength) + '...';
  }

  equals(other) {
    return other instanceof ReportDescription && this._value === other._value;
  }

  toString() {
    return this._value;
  }
  toJSON() {
    return this._value;
  }
}

/**
 * 章节ID值对象
 */
export class ReportSectionId {
  constructor(value) {
    this._value = value;
    this.validate();
  }

  static generate() {
    return new ReportSectionId(`section_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  }

  validate() {
    if (!this._value || typeof this._value !== 'string') {
      throw new Error('章节ID必须是字符串');
    }
  }

  get value() {
    return this._value;
  }

  equals(other) {
    return other instanceof ReportSectionId && this._value === other._value;
  }

  toString() {
    return this._value;
  }
  toJSON() {
    return this._value;
  }
}

/**
 * 章节标题值对象
 */
export class ReportSectionTitle {
  constructor(value) {
    this._value = value;
    this.validate();
  }

  validate() {
    if (!this._value || typeof this._value !== 'string') {
      throw new Error('章节标题不能为空且必须是字符串');
    }

    const trimmed = this._value.trim();
    if (trimmed.length === 0) {
      throw new Error('章节标题不能为空');
    }

    if (trimmed.length > 150) {
      throw new Error('章节标题不能超过150个字符');
    }

    this._value = trimmed;
  }

  get value() {
    return this._value;
  }

  equals(other) {
    return other instanceof ReportSectionTitle && this._value === other._value;
  }

  toString() {
    return this._value;
  }
  toJSON() {
    return this._value;
  }
}

/**
 * 章节内容值对象
 */
export class ReportSectionContent {
  constructor(value) {
    this._value = value;
    this.validate();
  }

  validate() {
    if (typeof this._value !== 'string') {
      throw new Error('章节内容必须是字符串');
    }

    if (this._value.length > 10000) {
      throw new Error('章节内容不能超过10000个字符');
    }
  }

  get value() {
    return this._value;
  }
  get length() {
    return this._value.length;
  }

  getSummary(maxLength = 200) {
    if (this._value.length <= maxLength) {
      return this._value;
    }
    return this._value.substring(0, maxLength) + '...';
  }

  getWordCount() {
    return this._value
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0).length;
  }

  equals(other) {
    return other instanceof ReportSectionContent && this._value === other._value;
  }

  toString() {
    return this._value;
  }
  toJSON() {
    return this._value;
  }
}

/**
 * 用户ID值对象（共享）
 */
export class UserId {
  constructor(value) {
    this._value = value;
  }

  get value() {
    return this._value;
  }

  equals(other) {
    return other instanceof UserId && this._value === other._value;
  }

  toString() {
    return this._value;
  }
  toJSON() {
    return this._value;
  }
}

/**
 * 领域事件基类
 */
export class DomainEvent {
  constructor({ eventName, aggregateId, payload }) {
    this.eventName = eventName;
    this.aggregateId = aggregateId;
    this.payload = payload;
    this.timestamp = new Date();
    this.eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 报告创建事件
 */
export class ReportCreatedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'ReportCreated',
      aggregateId: payload.reportId,
      payload
    });
  }

  get reportId() {
    return this.payload.reportId;
  }
  get projectId() {
    return this.payload.projectId;
  }
  get type() {
    return this.payload.type;
  }
  get title() {
    return this.payload.title;
  }
  get generatedBy() {
    return this.payload.generatedBy;
  }
}

/**
 * 章节添加事件
 */
export class ReportSectionAddedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'ReportSectionAdded',
      aggregateId: payload.reportId,
      payload
    });
  }

  get reportId() {
    return this.payload.reportId;
  }
  get sectionId() {
    return this.payload.sectionId;
  }
  get title() {
    return this.payload.title;
  }
  get orderIndex() {
    return this.payload.orderIndex;
  }
}

/**
 * 章节更新事件
 */
export class ReportSectionUpdatedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'ReportSectionUpdated',
      aggregateId: payload.reportId,
      payload
    });
  }

  get reportId() {
    return this.payload.reportId;
  }
  get sectionId() {
    return this.payload.sectionId;
  }
}

/**
 * 章节删除事件
 */
export class ReportSectionRemovedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'ReportSectionRemoved',
      aggregateId: payload.reportId,
      payload
    });
  }

  get reportId() {
    return this.payload.reportId;
  }
  get sectionId() {
    return this.payload.sectionId;
  }
  get sectionTitle() {
    return this.payload.sectionTitle;
  }
}

/**
 * 报告生成事件
 */
export class ReportGeneratedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'ReportGenerated',
      aggregateId: payload.reportId,
      payload
    });
  }

  get reportId() {
    return this.payload.reportId;
  }
  get projectId() {
    return this.payload.projectId;
  }
  get oldStatus() {
    return this.payload.oldStatus;
  }
  get newStatus() {
    return this.payload.newStatus;
  }
  get totalPages() {
    return this.payload.totalPages;
  }
  get wordCount() {
    return this.payload.wordCount;
  }
  get generatedBy() {
    return this.payload.generatedBy;
  }
}

/**
 * 报告状态变更事件
 */
export class ReportStatusChangedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'ReportStatusChanged',
      aggregateId: payload.reportId,
      payload
    });
  }

  get reportId() {
    return this.payload.reportId;
  }
  get projectId() {
    return this.payload.projectId;
  }
  get oldStatus() {
    return this.payload.oldStatus;
  }
  get newStatus() {
    return this.payload.newStatus;
  }
}
