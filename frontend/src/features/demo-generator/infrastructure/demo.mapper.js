/**
 * 演示项目DTO映射器
 * 处理领域模型与DTO之间的转换
 */
export class DemoMapper {
  /**
   * 将领域模型转换为DTO
   */
  toDTO(demo) {
    const codeFiles = {};
    demo.codeFiles.forEach(file => {
      codeFiles[file.path] = {
        path: file.path,
        content: file.content,
        language: file.language,
        size: file.size,
        extension: file.getExtension(),
        linesCount: file.getLinesCount(),
        createdAt: file.createdAt
      };
    });

    return {
      id: demo.id.value,
      title: demo.title.value,
      projectId: demo.projectId,
      type: demo.type.value,
      typeDisplay: demo.type.getDisplayName(),
      status: demo.status.value,
      statusDisplay: this.getStatusDisplay(demo.status.value),
      description: demo.description,
      requirements: demo.requirements,
      codeFiles: codeFiles,
      fileCount: demo.fileCount,
      createdBy: demo.createdBy?.value,
      generatedAt: demo.generatedAt,
      createdAt: demo.createdAt,
      updatedAt: demo.updatedAt,
      metadata: demo.metadata,
      canGenerate: demo.status.canGenerate(),
      isPending: demo.status.isPending(),
      isGenerating: demo.status.isGenerating(),
      isCompleted: demo.status.isCompleted()
    };
  }

  /**
   * 将DTO转换为领域模型
   */
  toDomain(dto) {
    // 这个方法通常在从后端获取数据后使用
    // 实际实现会根据后端返回的数据结构进行调整
    return dto;
  }

  /**
   * 创建用例的DTO转换为领域模型参数
   */
  toCreateDomain(createDto) {
    return {
      title: createDto.title,
      projectId: createDto.projectId,
      type: createDto.type,
      description: createDto.description,
      requirements: createDto.requirements,
      createdBy: createDto.createdBy
    };
  }

  /**
   * 获取状态显示文本
   */
  getStatusDisplay(status) {
    const statusMap = {
      PENDING: '待生成',
      GENERATING: '生成中',
      COMPLETED: '已完成',
      FAILED: '生成失败'
    };
    return statusMap[status] || status;
  }

  /**
   * 将列表转换为DTO
   */
  toDTOList(demos) {
    return demos.map(demo => this.toDTO(demo));
  }

  /**
   * 创建精简DTO（用于列表显示）
   */
  toMinimalDTO(demo) {
    return {
      id: demo.id.value,
      title: demo.title.value,
      projectId: demo.projectId,
      type: demo.type.value,
      typeDisplay: demo.type.getDisplayName(),
      status: demo.status.value,
      statusDisplay: this.getStatusDisplay(demo.status.value),
      description: demo.description,
      fileCount: demo.fileCount,
      totalSize: this.calculateTotalSize(demo.codeFiles),
      createdAt: demo.createdAt,
      updatedAt: demo.updatedAt,
      isCompleted: demo.status.isCompleted()
    };
  }

  /**
   * 计算代码文件总大小
   */
  calculateTotalSize(codeFiles) {
    return codeFiles.reduce((total, file) => total + file.size, 0);
  }

  /**
   * 创建代码文件DTO
   */
  toCodeFileDTO(codeFile) {
    return {
      path: codeFile.path,
      content: codeFile.content,
      language: codeFile.language,
      size: codeFile.size,
      extension: codeFile.getExtension(),
      linesCount: codeFile.getLinesCount(),
      createdAt: codeFile.createdAt
    };
  }

  /**
   * 创建生成进度DTO
   */
  toProgressDTO(demo) {
    const totalFiles = demo.fileCount;
    const completedFiles = demo.status.isCompleted() ? totalFiles : 0;
    const progress = totalFiles > 0 ? (completedFiles / totalFiles) * 100 : 0;

    return {
      demoId: demo.id.value,
      status: demo.status.value,
      statusDisplay: this.getStatusDisplay(demo.status.value),
      progress: Math.round(progress),
      totalFiles: totalFiles,
      completedFiles: completedFiles,
      isGenerating: demo.status.isGenerating(),
      isCompleted: demo.status.isCompleted()
    };
  }
}

export default DemoMapper;
