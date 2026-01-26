/**
 * 项目聚合根
 * 管理项目实体的业务逻辑和状态
 */
import { AggregateRoot } from '../../../shared/domain/aggregate-root.base.js';
import { ProjectId } from './value-objects/project-id.vo.js';
import { ProjectName } from './value-objects/project-name.vo.js';
import { ProjectMode } from './value-objects/project-mode.vo.js';
import { ProjectStatus } from './value-objects/project-status.vo.js';
import { IdeaId } from './value-objects/idea-id.vo.js';
import { Workflow } from './entities/workflow.entity.js';
import { Demo } from './entities/demo.entity.js';
import { ProjectCreatedEvent } from './events/project-created.event.js';
import { ProjectUpdatedEvent } from './events/project-updated.event.js';
import { ProjectModeUpgradedEvent } from './events/project-mode-upgraded.event.js';
import { ProjectDeletedEvent } from './events/project-deleted.event.js';

export class Project extends AggregateRoot {
  constructor(
    id,
    ideaId,
    name,
    mode,
    status = ProjectStatus.PLANNING,
    workflow = null,
    demo = null
  ) {
    super(id);
    this._ideaId = ideaId;
    this._name = name;
    this._mode = mode;
    this._status = status;
    this._workflow = workflow;
    this._demo = demo;
    this._createdAt = new Date();
    this._updatedAt = new Date();
  }

  /**
   * 创建新项目
   */
  static create(ideaId, name, mode) {
    const projectId = ProjectId.generate();
    const ideaIdObj = new IdeaId(ideaId);
    const projectName = new ProjectName(name);
    const projectMode = ProjectMode.fromString(mode);

    // 根据模式创建相应的实体
    let workflow = null;
    let demo = null;

    if (projectMode.isDevelopment()) {
      workflow = Workflow.createDefault();
    } else if (projectMode.isDemo()) {
      demo = Demo.create();
    }

    const project = new Project(
      projectId,
      ideaIdObj,
      projectName,
      projectMode,
      ProjectStatus.PLANNING,
      workflow,
      demo
    );

    // 添加项目创建事件
    project.addDomainEvent(new ProjectCreatedEvent(projectId.value, ideaId, name, mode));

    return project;
  }

  /**
   * 更新项目信息
   */
  update(updates) {
    const oldData = this.toJSON();

    if (updates.name !== undefined) {
      this._name = new ProjectName(updates.name);
    }

    if (updates.status !== undefined) {
      this._status = ProjectStatus.fromString(updates.status);
    }

    this.updateTimestamp();

    // 添加项目更新事件
    this.addDomainEvent(new ProjectUpdatedEvent(this.id.value, oldData, this.toJSON()));
  }

  /**
   * 升级项目模式（Demo → Development）
   */
  upgradeToDevelopment() {
    if (!this._mode.isDemo()) {
      throw new Error('只有Demo模式的项目可以升级到Development模式');
    }

    // 保存旧的Demo数据
    const oldDemo = this._demo;

    // 升级模式
    this._mode = ProjectMode.DEVELOPMENT;
    this._workflow = Workflow.createDefault();

    // 如果有Demo代码，迁移到开发阶段
    if (oldDemo && oldDemo.code) {
      const developmentStage = this._workflow.getStage('development');
      if (developmentStage) {
        developmentStage.addArtifact({
          id: `artifact-${Date.now()}`,
          type: 'demo-code',
          name: 'Demo原型代码',
          content: oldDemo.code,
          source: 'from-demo'
        });
      }
    }

    // 清空Demo数据
    this._demo = null;

    this.updateTimestamp();

    // 添加模式升级事件
    this.addDomainEvent(new ProjectModeUpgradedEvent(this.id.value, 'demo', 'development'));
  }

  /**
   * 删除项目
   */
  delete() {
    this._status = ProjectStatus.DELETED;
    this.updateTimestamp();

    // 添加项目删除事件
    this.addDomainEvent(new ProjectDeletedEvent(this.id.value, this._name.value));
  }

  /**
   * 自定义工作流
   */
  customizeWorkflow(stages) {
    if (!this._mode.isDevelopment()) {
      throw new Error('只有Development模式的项目支持自定义工作流');
    }

    if (!this._workflow) {
      throw new Error('项目没有工作流');
    }

    this._workflow.customizeStages(stages);
    this.updateTimestamp();
  }

  /**
   * 更新Demo代码
   */
  updateDemoCode(code, type, previewUrl, downloadUrl) {
    if (!this._mode.isDemo()) {
      throw new Error('只有Demo模式的项目支持更新Demo代码');
    }

    if (!this._demo) {
      throw new Error('项目没有Demo配置');
    }

    this._demo.updateCode(code, type, previewUrl, downloadUrl);
    this.updateTimestamp();
  }

  /**
   * 验证项目状态
   */
  validate() {
    if (!this._ideaId || !this._name || !this._mode) {
      throw new Error('项目信息不完整');
    }

    if (this._status.isDeleted()) {
      throw new Error('项目已被删除');
    }

    // 验证模式一致性
    if (this._mode.isDevelopment() && !this._workflow) {
      throw new Error('Development模式的项目必须包含工作流');
    }

    if (this._mode.isDemo() && !this._demo) {
      throw new Error('Demo模式的项目必须包含Demo配置');
    }
  }

  // Getters
  get ideaId() {
    return this._ideaId;
  }
  get name() {
    return this._name;
  }
  get mode() {
    return this._mode;
  }
  get status() {
    return this._status;
  }
  get workflow() {
    return this._workflow;
  }
  get demo() {
    return this._demo;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      ideaId: this._ideaId.value,
      name: this._name.value,
      mode: this._mode.value,
      status: this._status.value,
      workflow: this._workflow ? this._workflow.toJSON() : null,
      demo: this._demo ? this._demo.toJSON() : null
    };
  }
}

// 导入依赖（解决循环依赖问题）
import { User } from '../../auth/domain/user.aggregate.js'; // 如果需要关联用户
