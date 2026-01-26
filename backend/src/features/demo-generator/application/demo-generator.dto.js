/**
 * Demo Generator DTOs
 */

/**
 * 创建Demo请求DTO
 */
export class CreateDemoRequestDto {
  constructor({ projectId, type, title, description, requirements }) {
    this.projectId = projectId;
    this.type = type;
    this.title = title;
    this.description = description;
    this.requirements = requirements || [];
  }

  validate() {
    if (!this.projectId) {
      throw new Error('Project ID is required');
    }

    if (!this.type) {
      throw new Error('Demo type is required');
    }

    if (!this.title) {
      throw new Error('Title is required');
    }

    if (!this.description) {
      throw new Error('Description is required');
    }
  }
}

/**
 * Demo响应DTO
 */
export class DemoResponseDto {
  constructor({
    id,
    projectId,
    type,
    status,
    title,
    description,
    requirements,
    codeFiles,
    createdAt,
    completedAt
  }) {
    this.id = id;
    this.projectId = projectId;
    this.type = type;
    this.status = status;
    this.title = title;
    this.description = description;
    this.requirements = requirements;
    this.codeFiles = codeFiles || [];
    this.createdAt = createdAt;
    this.completedAt = completedAt;
  }

  static fromAggregate(demo) {
    return new DemoResponseDto({
      id: demo.id.value,
      projectId: demo.projectId,
      type: demo.type.value,
      status: demo.status.value,
      title: demo.title,
      description: demo.description,
      requirements: demo.requirements,
      codeFiles: demo.codeFiles.map(file => ({
        id: file.id,
        filename: file.filename,
        language: file.language,
        size: file.size
      })),
      createdAt: demo.createdAt,
      completedAt: demo.completedAt
    });
  }
}

/**
 * 生成Demo请求DTO
 */
export class GenerateDemoRequestDto {
  constructor({ demoId, conversation, additionalContext }) {
    this.demoId = demoId;
    this.conversation = conversation;
    this.additionalContext = additionalContext || {};
  }

  validate() {
    if (!this.demoId) {
      throw new Error('Demo ID is required');
    }

    if (!this.conversation || !Array.isArray(this.conversation)) {
      throw new Error('Conversation must be an array');
    }
  }
}
