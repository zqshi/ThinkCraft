/**
 * Demo Generator 用例实现
 */
import { Demo, DemoType, DemoStatus, IDemoRepository } from '../domain/index.js';
import {
  CreateDemoRequestDto,
  DemoResponseDto,
  GenerateDemoRequestDto
} from './demo-generator.dto.js';
import { DemoGenerationService } from './demo-generation.service.js';

export class DemoGeneratorUseCase {
  constructor(
    demoRepository = new IDemoRepository(),
    generationService = new DemoGenerationService()
  ) {
    this.demoRepository = demoRepository;
    this.generationService = generationService;
  }

  /**
   * 创建Demo
   */
  async createDemo(requestDto) {
    requestDto.validate();

    const demoType = new DemoType(requestDto.type);
    const demo = Demo.create({
      projectId: requestDto.projectId,
      type: demoType,
      title: requestDto.title,
      description: requestDto.description,
      requirements: requestDto.requirements
    });

    await this.demoRepository.save(demo);

    return DemoResponseDto.fromAggregate(demo);
  }

  /**
   * 生成Demo代码
   */
  async generateDemo(requestDto) {
    requestDto.validate();

    const demo = await this.demoRepository.findById(requestDto.demoId);
    if (!demo) {
      throw new Error('Demo not found');
    }

    if (!demo.status.isPending()) {
      throw new Error('Demo generation can only be started when status is PENDING');
    }

    // 开始生成
    demo.startGeneration();
    await this.demoRepository.save(demo);

    try {
      // 调用生成服务
      const codeFiles = await this.generationService.generateCode(
        demo,
        requestDto.conversation,
        requestDto.additionalContext
      );

      // 添加生成的代码文件
      codeFiles.forEach(file => {
        demo.addCodeFile(file);
      });

      // 完成生成
      demo.completeGeneration();
      await this.demoRepository.save(demo);

      return DemoResponseDto.fromAggregate(demo);
    } catch (error) {
      // 生成失败
      demo.failGeneration(error);
      await this.demoRepository.save(demo);
      throw error;
    }
  }

  /**
   * 获取Demo详情
   */
  async getDemo(demoId) {
    const demo = await this.demoRepository.findById(demoId);
    if (!demo) {
      throw new Error('Demo not found');
    }

    return DemoResponseDto.fromAggregate(demo);
  }

  /**
   * 获取项目的所有Demo
   */
  async getDemosByProject(projectId) {
    const demos = await this.demoRepository.findByProjectId(projectId);
    return demos.map(demo => DemoResponseDto.fromAggregate(demo));
  }

  /**
   * 删除Demo
   */
  async deleteDemo(demoId) {
    const demo = await this.demoRepository.findById(demoId);
    if (!demo) {
      throw new Error('Demo not found');
    }

    await this.demoRepository.delete(demoId);
    return true;
  }
}
