/**
 * 演示项目用例
 * 处理演示项目的业务用例
 */
import { Demo, DemoFactory } from '../domain/demo.aggregate.js';
import { DemoRepository } from '../infrastructure/demo.repository.js';
import { DemoMapper } from '../infrastructure/demo.mapper.js';
import { Result } from '../../../shared/result.js';

export class DemoUseCase {
  constructor() {
    this.repository = new DemoRepository();
    this.mapper = new DemoMapper();
  }

  /**
   * 创建演示项目
   */
  async createDemo(createDto) {
    try {
      const { title, projectId, type, description, requirements, createdBy } = createDto;

      if (!title || !projectId || !type || !createdBy) {
        return Result.fail('标题、项目ID、类型和创建者ID不能为空');
      }

      const demo = Demo.create(title, projectId, type, description, requirements, createdBy);

      await this.repository.save(demo);

      const dto = this.mapper.toDTO(demo);
      return Result.ok(dto);
    } catch (error) {
      console.error('创建演示项目失败:', error);
      return Result.fail(`创建演示项目失败: ${error.message}`);
    }
  }

  /**
   * 获取演示项目
   */
  async getDemo(id) {
    try {
      const demo = await this.repository.findById(id);

      if (!demo) {
        return Result.fail('演示项目不存在');
      }

      const dto = this.mapper.toDTO(demo);
      return Result.ok(dto);
    } catch (error) {
      console.error('获取演示项目失败:', error);
      return Result.fail(`获取演示项目失败: ${error.message}`);
    }
  }

  /**
   * 获取项目的演示项目
   */
  async getDemoByProject(projectId) {
    try {
      const demo = await this.repository.findByProjectId(projectId);

      if (!demo) {
        return Result.ok(null);
      }

      const dto = this.mapper.toDTO(demo);
      return Result.ok(dto);
    } catch (error) {
      console.error('获取项目演示项目失败:', error);
      return Result.fail(`获取项目演示项目失败: ${error.message}`);
    }
  }

  /**
   * 开始生成演示项目
   */
  async startGeneration(demoId) {
    try {
      const demo = await this.repository.findById(demoId);

      if (!demo) {
        return Result.fail('演示项目不存在');
      }

      if (!demo.status.canGenerate()) {
        return Result.fail('当前状态不能开始生成');
      }

      demo.startGeneration();

      await this.repository.save(demo);

      const dto = this.mapper.toDTO(demo);
      return Result.ok(dto);
    } catch (error) {
      console.error('开始生成失败:', error);
      return Result.fail(`开始生成失败: ${error.message}`);
    }
  }

  /**
   * 完成生成演示项目
   */
  async completeGeneration(demoId, codeFiles) {
    try {
      const demo = await this.repository.findById(demoId);

      if (!demo) {
        return Result.fail('演示项目不存在');
      }

      if (!demo.status.isGenerating()) {
        return Result.fail('当前状态不是生成中');
      }

      demo.completeGeneration(codeFiles);

      await this.repository.save(demo);

      const dto = this.mapper.toDTO(demo);
      return Result.ok(dto);
    } catch (error) {
      console.error('完成生成失败:', error);
      return Result.fail(`完成生成失败: ${error.message}`);
    }
  }

  /**
   * 更新演示项目描述
   */
  async updateDescription(id, description) {
    try {
      const demo = await this.repository.findById(id);

      if (!demo) {
        return Result.fail('演示项目不存在');
      }

      demo.updateDescription(description);

      await this.repository.save(demo);

      const dto = this.mapper.toDTO(demo);
      return Result.ok(dto);
    } catch (error) {
      console.error('更新描述失败:', error);
      return Result.fail(`更新描述失败: ${error.message}`);
    }
  }

  /**
   * 更新演示项目需求
   */
  async updateRequirements(id, requirements) {
    try {
      const demo = await this.repository.findById(id);

      if (!demo) {
        return Result.fail('演示项目不存在');
      }

      demo.updateRequirements(requirements);

      await this.repository.save(demo);

      const dto = this.mapper.toDTO(demo);
      return Result.ok(dto);
    } catch (error) {
      console.error('更新需求失败:', error);
      return Result.fail(`更新需求失败: ${error.message}`);
    }
  }

  /**
   * 获取演示项目列表
   */
  async getDemoList(filters = {}) {
    try {
      const demos = await this.repository.findAll(filters);

      const dtos = demos.map(demo => this.mapper.toDTO(demo));

      return Result.ok({
        items: dtos,
        total: dtos.length
      });
    } catch (error) {
      console.error('获取演示项目列表失败:', error);
      return Result.fail(`获取演示项目列表失败: ${error.message}`);
    }
  }

  /**
   * 从需求创建演示项目
   */
  async createFromRequirements(createDto) {
    try {
      const { title, projectId, type, requirements, createdBy } = createDto;

      if (!title || !projectId || !type || !requirements || !createdBy) {
        return Result.fail('所有字段都不能为空');
      }

      const demo = DemoFactory.createFromRequirements(
        title,
        projectId,
        type,
        requirements,
        createdBy
      );

      await this.repository.save(demo);

      const dto = this.mapper.toDTO(demo);
      return Result.ok(dto);
    } catch (error) {
      console.error('从需求创建演示项目失败:', error);
      return Result.fail(`从需求创建演示项目失败: ${error.message}`);
    }
  }

  /**
   * 删除演示项目
   */
  async deleteDemo(id) {
    try {
      await this.repository.delete(id);
      return Result.ok(true);
    } catch (error) {
      console.error('删除演示项目失败:', error);
      return Result.fail(`删除演示项目失败: ${error.message}`);
    }
  }

  /**
   * 获取代码文件
   */
  async getCodeFile(demoId, filePath) {
    try {
      const demo = await this.repository.findById(demoId);

      if (!demo) {
        return Result.fail('演示项目不存在');
      }

      const codeFile = demo.getCodeFile(filePath);

      if (!codeFile) {
        return Result.fail('代码文件不存在');
      }

      return Result.ok(codeFile);
    } catch (error) {
      console.error('获取代码文件失败:', error);
      return Result.fail(`获取代码文件失败: ${error.message}`);
    }
  }

  /**
   * 下载演示项目
   */
  async downloadDemo(demoId) {
    try {
      const demo = await this.repository.findById(demoId);

      if (!demo) {
        return Result.fail('演示项目不存在');
      }

      if (!demo.status.isCompleted()) {
        return Result.fail('演示项目尚未完成生成');
      }

      // 这里应该调用后端的下载接口
      const downloadUrl = `/api/demos/${demoId}/download`;

      return Result.ok({
        downloadUrl,
        filename: `${demo.title.value.replace(/\s+/g, '_')}.zip`
      });
    } catch (error) {
      console.error('下载演示项目失败:', error);
      return Result.fail(`下载演示项目失败: ${error.message}`);
    }
  }
}

export default DemoUseCase;
