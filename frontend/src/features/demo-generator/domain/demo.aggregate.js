/**
 * Demo聚合根
 * 管理演示项目的业务逻辑
 */
import { AggregateRoot } from '../../../shared/domain/aggregate-root.base.js';

export class Demo extends AggregateRoot {
  constructor(
    id,
    title,
    projectId,
    type,
    status = DemoStatus.PENDING,
    description = '',
    requirements = '',
    codeFiles = new Map(),
    createdBy = null,
    generatedAt = null,
    metadata = {}
  ) {
    super(id);
    this._title = title;
    this._projectId = projectId;
    this._type = type;
    this._status = status;
    this._description = description;
    this._requirements = requirements;
    this._codeFiles = codeFiles;
    this._createdBy = createdBy;
    this._generatedAt = generatedAt;
    this._metadata = metadata;
  }

  /**
   * 创建演示项目
   */
  static create(title, projectId, type, description, requirements, createdBy) {
    const demoId = DemoId.generate();
    const demoTitle = new DemoTitle(title);
    const demoType = DemoType.fromString(type);
    const userId = new UserId(createdBy);

    const demo = new Demo(
      demoId,
      demoTitle,
      projectId,
      demoType,
      DemoStatus.PENDING,
      description,
      requirements,
      new Map(),
      userId
    );

    // 添加领域事件
    demo.addDomainEvent(
      new DemoCreatedEvent({
        demoId: demoId.value,
        projectId: projectId,
        title: title,
        type: type,
        createdBy: createdBy,
        timestamp: new Date()
      })
    );

    return demo;
  }

  /**
   * 开始生成
   */
  startGeneration() {
    if (!this._status.canGenerate()) {
      throw new Error(`当前状态不能开始生成: ${this._status.value}`);
    }

    this._status = DemoStatus.GENERATING;
    this.updateTimestamp();

    this.addDomainEvent(
      new DemoGenerationStartedEvent({
        demoId: this.id.value,
        projectId: this._projectId,
        type: this._type.value,
        timestamp: new Date()
      })
    );
  }

  /**
   * 完成生成
   */
  completeGeneration(codeFiles) {
    if (!this._status.isGenerating()) {
      throw new Error('当前状态不是生成中');
    }

    this._status = DemoStatus.COMPLETED;
    this._generatedAt = new Date();

    // 添加代码文件
    codeFiles.forEach(file => {
      this._codeFiles.set(file.path, file);
    });

    this.updateTimestamp();

    this.addDomainEvent(
      new DemoGenerationCompletedEvent({
        demoId: this.id.value,
        projectId: this._projectId,
        fileCount: codeFiles.length,
        timestamp: new Date()
      })
    );
  }

  /**
   * 添加代码文件
   */
  addCodeFile(file) {
    if (!(file instanceof CodeFile)) {
      throw new Error('必须是CodeFile类型');
    }

    this._codeFiles.set(file.path, file);
    this.updateTimestamp();
  }

  /**
   * 获取代码文件
   */
  getCodeFile(path) {
    return this._codeFiles.get(path);
  }

  /**
   * 获取所有代码文件
   */
  getAllCodeFiles() {
    return Array.from(this._codeFiles.values());
  }

  /**
   * 更新描述
   */
  updateDescription(description) {
    if (this._status.isCompleted()) {
      throw new Error('已完成的演示项目不能更新描述');
    }

    this._description = description;
    this.updateTimestamp();
  }

  /**
   * 更新需求
   */
  updateRequirements(requirements) {
    if (this._status.isCompleted()) {
      throw new Error('已完成的演示项目不能更新需求');
    }

    this._requirements = requirements;
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
   * 验证演示项目
   */
  validate() {
    if (!this._title || !this._title.value) {
      throw new Error('演示项目标题不能为空');
    }

    if (!this._projectId) {
      throw new Error('项目ID不能为空');
    }

    if (!(this._type instanceof DemoType)) {
      throw new Error('类型必须是DemoType类型');
    }

    if (!(this._status instanceof DemoStatus)) {
      throw new Error('状态必须是DemoStatus类型');
    }
  }

  // Getters
  get title() {
    return this._title;
  }
  get projectId() {
    return this._projectId;
  }
  get type() {
    return this._type;
  }
  get status() {
    return this._status;
  }
  get description() {
    return this._description;
  }
  get requirements() {
    return this._requirements;
  }
  get codeFiles() {
    return this.getAllCodeFiles();
  }
  get createdBy() {
    return this._createdBy;
  }
  get generatedAt() {
    return this._generatedAt;
  }
  get metadata() {
    return { ...this._metadata };
  }
  get isPending() {
    return this._status.isPending();
  }
  get isGenerating() {
    return this._status.isGenerating();
  }
  get isCompleted() {
    return this._status.isCompleted();
  }
  get fileCount() {
    return this._codeFiles.size;
  }

  toJSON() {
    const codeFilesObj = {};
    this._codeFiles.forEach((file, path) => {
      codeFilesObj[path] = file.toJSON();
    });

    return {
      ...super.toJSON(),
      title: this._title.value,
      projectId: this._projectId,
      type: this._type.value,
      status: this._status.value,
      description: this._description,
      requirements: this._requirements,
      codeFiles: codeFilesObj,
      createdBy: this._createdBy?.value,
      generatedAt: this._generatedAt,
      metadata: this._metadata,
      fileCount: this.fileCount
    };
  }

  /**
   * 从JSON创建演示项目
   */
  static fromJSON(json) {
    const codeFiles = new Map();
    if (json.codeFiles) {
      Object.entries(json.codeFiles).forEach(([path, fileData]) => {
        codeFiles.set(path, CodeFile.fromJSON(fileData));
      });
    }

    const demo = new Demo(
      new DemoId(json.id),
      new DemoTitle(json.title),
      json.projectId,
      DemoType.fromString(json.type),
      DemoStatus.fromString(json.status),
      json.description,
      json.requirements,
      codeFiles,
      json.createdBy ? new UserId(json.createdBy) : null,
      json.generatedAt ? new Date(json.generatedAt) : null,
      json.metadata || {}
    );

    // 设置时间戳
    demo._createdAt = new Date(json.createdAt);
    demo._updatedAt = new Date(json.updatedAt);

    return demo;
  }
}

/**
 * 演示项目工厂
 */
export class DemoFactory {
  static createFromRequirements(title, projectId, type, requirements, createdBy) {
    return Demo.create(title, projectId, type, '', requirements, createdBy);
  }

  static createFromDescription(title, projectId, type, description, createdBy) {
    return Demo.create(title, projectId, type, description, '', createdBy);
  }

  static createFromJSON(json) {
    return Demo.fromJSON(json);
  }
}

/**
 * 代码文件实体
 */
export class CodeFile {
  constructor(path, content, language, size = 0) {
    this._path = path;
    this._content = content;
    this._language = language;
    this._size = size || content.length;
    this._createdAt = new Date();
  }

  get path() {
    return this._path;
  }
  get content() {
    return this._content;
  }
  get language() {
    return this._language;
  }
  get size() {
    return this._size;
  }
  get createdAt() {
    return this._createdAt;
  }

  getExtension() {
    const parts = this._path.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }

  getLinesCount() {
    return this._content.split('\n').length;
  }

  toJSON() {
    return {
      path: this._path,
      content: this._content,
      language: this._language,
      size: this._size,
      createdAt: this._createdAt,
      extension: this.getExtension(),
      linesCount: this.getLinesCount()
    };
  }

  static fromJSON(json) {
    const file = new CodeFile(json.path, json.content, json.language, json.size);
    file._createdAt = new Date(json.createdAt);
    return file;
  }
}

/**
 * 演示项目类型
 */
export class DemoType {
  static WEB_APP = new DemoType('WEB_APP');
  static MOBILE_APP = new DemoType('MOBILE_APP');
  static DESKTOP_APP = new DemoType('DESKTOP_APP');
  static API_SERVICE = new DemoType('API_SERVICE');
  static LIBRARY = new DemoType('LIBRARY');
  static CLI_TOOL = new DemoType('CLI_TOOL');

  constructor(value) {
    this._value = value;
  }

  static fromString(value) {
    const type = this[value.toUpperCase()];
    if (!type) {
      throw new Error(`无效的演示项目类型: ${value}`);
    }
    return type;
  }

  get value() {
    return this._value;
  }

  getDisplayName() {
    const names = {
      WEB_APP: 'Web应用',
      MOBILE_APP: '移动应用',
      DESKTOP_APP: '桌面应用',
      API_SERVICE: 'API服务',
      LIBRARY: '代码库',
      CLI_TOOL: '命令行工具'
    };
    return names[this._value] || this._value;
  }

  equals(other) {
    return other instanceof DemoType && this._value === other._value;
  }

  toString() {
    return this._value;
  }
  toJSON() {
    return this._value;
  }
}

/**
 * 演示项目状态
 */
export class DemoStatus {
  static PENDING = new DemoStatus('PENDING');
  static GENERATING = new DemoStatus('GENERATING');
  static COMPLETED = new DemoStatus('COMPLETED');
  static FAILED = new DemoStatus('FAILED');

  constructor(value) {
    this._value = value;
  }

  static fromString(value) {
    const status = this[value.toUpperCase()];
    if (!status) {
      throw new Error(`无效的演示项目状态: ${value}`);
    }
    return status;
  }

  get value() {
    return this._value;
  }

  isPending() {
    return this._value === 'PENDING';
  }
  isGenerating() {
    return this._value === 'GENERATING';
  }
  isCompleted() {
    return this._value === 'COMPLETED';
  }
  isFailed() {
    return this._value === 'FAILED';
  }

  canGenerate() {
    return this._value === 'PENDING' || this._value === 'FAILED';
  }

  equals(other) {
    return other instanceof DemoStatus && this._value === other._value;
  }

  toString() {
    return this._value;
  }
  toJSON() {
    return this._value;
  }
}

/**
 * 演示项目标题
 */
export class DemoTitle {
  constructor(value) {
    this._value = value;
    this.validate();
  }

  validate() {
    if (!this._value || typeof this._value !== 'string') {
      throw new Error('演示项目标题不能为空且必须是字符串');
    }

    const trimmed = this._value.trim();
    if (trimmed.length === 0) {
      throw new Error('演示项目标题不能为空');
    }

    if (trimmed.length > 100) {
      throw new Error('演示项目标题不能超过100个字符');
    }

    this._value = trimmed;
  }

  get value() {
    return this._value;
  }

  equals(other) {
    return other instanceof DemoTitle && this._value === other._value;
  }

  toString() {
    return this._value;
  }
  toJSON() {
    return this._value;
  }
}

/**
 * 用户ID值对象
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
 * DemoID值对象
 */
export class DemoId {
  constructor(value) {
    this._value = value;
    this.validate();
  }

  static generate() {
    return new DemoId(`demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  }

  validate() {
    if (!this._value || typeof this._value !== 'string') {
      throw new Error('Demo ID必须是字符串');
    }
  }

  get value() {
    return this._value;
  }

  equals(other) {
    return other instanceof DemoId && this._value === other._value;
  }

  toString() {
    return this._value;
  }
  toJSON() {
    return this._value;
  }
}

/**
 * 领域事件
 */
export class DemoCreatedEvent {
  constructor(payload) {
    this.payload = payload;
    this.timestamp = new Date();
  }
}

export class DemoGenerationStartedEvent {
  constructor(payload) {
    this.payload = payload;
    this.timestamp = new Date();
  }
}

export class DemoGenerationCompletedEvent {
  constructor(payload) {
    this.payload = payload;
    this.timestamp = new Date();
  }
}

export class DemoGenerationFailedEvent {
  constructor(payload) {
    this.payload = payload;
    this.timestamp = new Date();
  }
}
