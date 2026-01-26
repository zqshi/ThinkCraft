/**
 * Demo聚合根
 */
import { AggregateRoot } from '../../../shared/domain/aggregate-root.base.js';
import { DemoId } from './value-objects/demo-id.vo.js';
import { DemoType } from './value-objects/demo-type.vo.js';
import { DemoStatus } from './value-objects/demo-status.vo.js';
import { CodeFile } from './entities/code-file.entity.js';
import { DemoCreatedEvent } from './events/demo-created.event.js';
import { DemoGenerationStartedEvent } from './events/demo-generation-started.event.js';
import { DemoGenerationCompletedEvent } from './events/demo-generation-completed.event.js';
import { DemoGenerationFailedEvent } from './events/demo-generation-failed.event.js';

export class Demo extends AggregateRoot {
  constructor(id, props) {
    super(id, props);
    this._codeFiles = new Map();
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

  get requirements() {
    return this.props.requirements;
  }

  get codeFiles() {
    return Array.from(this._codeFiles.values());
  }

  get createdAt() {
    return this.props.createdAt;
  }

  get completedAt() {
    return this.props.completedAt;
  }

  static create(props) {
    const demo = new Demo(new DemoId(`demo_${Date.now()}`), {
      ...props,
      status: new DemoStatus(DemoStatus.PENDING),
      createdAt: new Date(),
      completedAt: null
    });

    demo.addDomainEvent(
      new DemoCreatedEvent({
        demoId: demo.id.value,
        projectId: props.projectId,
        type: props.type.value,
        title: props.title
      })
    );

    return demo;
  }

  startGeneration() {
    if (!this.props.status.isPending()) {
      throw new Error('Demo generation can only be started when status is PENDING');
    }

    this.props.status = new DemoStatus(DemoStatus.GENERATING);
    this.touch();

    this.addDomainEvent(
      new DemoGenerationStartedEvent({
        demoId: this.id.value,
        projectId: this.props.projectId,
        type: this.props.type.value
      })
    );
  }

  addCodeFile(codeFile) {
    if (!this.props.status.isGenerating()) {
      throw new Error('Code files can only be added during generation');
    }

    this._codeFiles.set(codeFile.id, codeFile);
    this.touch();
  }

  completeGeneration() {
    if (!this.props.status.isGenerating()) {
      throw new Error('Demo can only be completed when status is GENERATING');
    }

    this.props.status = new DemoStatus(DemoStatus.COMPLETED);
    this.props.completedAt = new Date();
    this.touch();

    this.addDomainEvent(
      new DemoGenerationCompletedEvent({
        demoId: this.id.value,
        projectId: this.props.projectId,
        fileCount: this._codeFiles.size,
        completedAt: this.props.completedAt
      })
    );
  }

  failGeneration(error) {
    this.props.status = new DemoStatus(DemoStatus.FAILED);
    this.props.error = error;
    this.props.completedAt = new Date();
    this.touch();

    this.addDomainEvent(
      new DemoGenerationFailedEvent({
        demoId: this.id.value,
        projectId: this.props.projectId,
        error: error.message || error
      })
    );
  }

  getMainFile() {
    // 根据类型返回主文件
    switch (this.props.type.value) {
    case DemoType.WEB:
      return this._codeFiles.get('index.html');
    case DemoType.MOBILE:
      return this._codeFiles.get('App.js') || this._codeFiles.get('main.js');
    case DemoType.API:
      return this._codeFiles.get('server.js') || this._codeFiles.get('app.js');
    default:
      return this.codeFiles[0];
    }
  }

  validate() {
    if (!this.props.projectId) {
      throw new Error('Project ID is required');
    }

    if (!(this.props.type instanceof DemoType)) {
      throw new Error('Type must be a DemoType instance');
    }

    if (!(this.props.status instanceof DemoStatus)) {
      throw new Error('Status must be a DemoStatus instance');
    }

    if (!this.props.title || typeof this.props.title !== 'string') {
      throw new Error('Title must be a non-empty string');
    }

    if (!this.props.description || typeof this.props.description !== 'string') {
      throw new Error('Description must be a non-empty string');
    }

    if (!Array.isArray(this.props.requirements)) {
      throw new Error('Requirements must be an array');
    }

    if (!(this.props.createdAt instanceof Date)) {
      throw new Error('Created at must be a Date instance');
    }

    if (this.props.completedAt && !(this.props.completedAt instanceof Date)) {
      throw new Error('Completed at must be a Date instance or null');
    }
  }
}
