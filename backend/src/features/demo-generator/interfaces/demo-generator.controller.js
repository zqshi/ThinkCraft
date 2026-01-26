/**
 * Demo Generator 控制器
 */
import { DemoGeneratorUseCase } from '../application/demo-generator.use-case.js';
import { DemoInMemoryRepository } from '../infrastructure/demo-inmemory.repository.js';
import { DemoGenerationService } from '../application/demo-generation.service.js';
import { CreateDemoRequestDto, GenerateDemoRequestDto } from '../application/demo-generator.dto.js';

export class DemoGeneratorController {
  constructor() {
    this.demoGeneratorUseCase = new DemoGeneratorUseCase(
      new DemoInMemoryRepository(),
      new DemoGenerationService()
    );
  }

  /**
   * 创建Demo
   */
  async createDemo(req, res) {
    try {
      const requestDto = new CreateDemoRequestDto({
        projectId: req.body.projectId,
        type: req.body.type,
        title: req.body.title,
        description: req.body.description,
        requirements: req.body.requirements
      });

      const result = await this.demoGeneratorUseCase.createDemo(requestDto);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 生成Demo代码
   */
  async generateDemo(req, res) {
    try {
      const requestDto = new GenerateDemoRequestDto({
        demoId: req.params.demoId,
        conversation: req.body.conversation,
        additionalContext: req.body.additionalContext
      });

      const result = await this.demoGeneratorUseCase.generateDemo(requestDto);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 获取Demo详情
   */
  async getDemo(req, res) {
    try {
      const result = await this.demoGeneratorUseCase.getDemo(req.params.demoId);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 获取项目的所有Demo
   */
  async getDemosByProject(req, res) {
    try {
      const result = await this.demoGeneratorUseCase.getDemosByProject(req.params.projectId);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 删除Demo
   */
  async deleteDemo(req, res) {
    try {
      await this.demoGeneratorUseCase.deleteDemo(req.params.demoId);
      res.json({
        success: true,
        message: 'Demo deleted successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
}
