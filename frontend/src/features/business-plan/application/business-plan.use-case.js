/**
 * 商业计划书用例
 * 处理商业计划书的业务用例
 */
import { BusinessPlan } from '../domain/business-plan.aggregate.js';
import { BusinessPlanRepository } from '../infrastructure/business-plan.repository.js';
import { BusinessPlanMapper } from '../infrastructure/business-plan.mapper.js';
import { Result } from '../../../shared/result.js';

export class BusinessPlanUseCase {
  constructor() {
    this.repository = new BusinessPlanRepository();
    this.mapper = new BusinessPlanMapper();
  }

  /**
   * 创建商业计划书
   */
  async createBusinessPlan(createDto) {
    try {
      const { title, projectId, generatedBy } = createDto;

      if (!title || !projectId || !generatedBy) {
        return Result.fail('标题、项目ID和创建者ID不能为空');
      }

      const businessPlan = BusinessPlan.create(title, projectId, generatedBy);

      await this.repository.save(businessPlan);

      const dto = this.mapper.toDTO(businessPlan);
      return Result.ok(dto);
    } catch (error) {
      console.error('创建商业计划书失败:', error);
      return Result.fail(`创建商业计划书失败: ${error.message}`);
    }
  }

  /**
   * 获取商业计划书
   */
  async getBusinessPlan(id) {
    try {
      const businessPlan = await this.repository.findById(id);

      if (!businessPlan) {
        return Result.fail('商业计划书不存在');
      }

      const dto = this.mapper.toDTO(businessPlan);
      return Result.ok(dto);
    } catch (error) {
      console.error('获取商业计划书失败:', error);
      return Result.fail(`获取商业计划书失败: ${error.message}`);
    }
  }

  /**
   * 获取项目的商业计划书
   */
  async getBusinessPlanByProject(projectId) {
    try {
      const businessPlan = await this.repository.findByProjectId(projectId);

      if (!businessPlan) {
        return Result.ok(null);
      }

      const dto = this.mapper.toDTO(businessPlan);
      return Result.ok(dto);
    } catch (error) {
      console.error('获取项目商业计划书失败:', error);
      return Result.fail(`获取项目商业计划书失败: ${error.message}`);
    }
  }

  /**
   * 生成章节
   */
  async generateChapter(businessPlanId, chapterType, title, content, tokens = 0) {
    try {
      const businessPlan = await this.repository.findById(businessPlanId);

      if (!businessPlan) {
        return Result.fail('商业计划书不存在');
      }

      if (!businessPlan.status.canGenerate()) {
        return Result.fail('当前状态不能生成章节');
      }

      businessPlan.generateChapter(chapterType, title, content, tokens);

      await this.repository.save(businessPlan);

      const dto = this.mapper.toDTO(businessPlan);
      return Result.ok(dto);
    } catch (error) {
      console.error('生成章节失败:', error);
      return Result.fail(`生成章节失败: ${error.message}`);
    }
  }

  /**
   * 完成商业计划书
   */
  async completeBusinessPlan(id) {
    try {
      const businessPlan = await this.repository.findById(id);

      if (!businessPlan) {
        return Result.fail('商业计划书不存在');
      }

      businessPlan.complete();

      await this.repository.save(businessPlan);

      const dto = this.mapper.toDTO(businessPlan);
      return Result.ok(dto);
    } catch (error) {
      console.error('完成商业计划书失败:', error);
      return Result.fail(`完成商业计划书失败: ${error.message}`);
    }
  }

  /**
   * 更新章节
   */
  async updateChapter(businessPlanId, chapterType, content, tokens = 0) {
    try {
      const businessPlan = await this.repository.findById(businessPlanId);

      if (!businessPlan) {
        return Result.fail('商业计划书不存在');
      }

      businessPlan.updateChapter(chapterType, content, tokens);

      await this.repository.save(businessPlan);

      const dto = this.mapper.toDTO(businessPlan);
      return Result.ok(dto);
    } catch (error) {
      console.error('更新章节失败:', error);
      return Result.fail(`更新章节失败: ${error.message}`);
    }
  }

  /**
   * 删除章节
   */
  async deleteChapter(businessPlanId, chapterType) {
    try {
      const businessPlan = await this.repository.findById(businessPlanId);

      if (!businessPlan) {
        return Result.fail('商业计划书不存在');
      }

      businessPlan.deleteChapter(chapterType);

      await this.repository.save(businessPlan);

      const dto = this.mapper.toDTO(businessPlan);
      return Result.ok(dto);
    } catch (error) {
      console.error('删除章节失败:', error);
      return Result.fail(`删除章节失败: ${error.message}`);
    }
  }

  /**
   * 更新标题
   */
  async updateTitle(id, newTitle) {
    try {
      const businessPlan = await this.repository.findById(id);

      if (!businessPlan) {
        return Result.fail('商业计划书不存在');
      }

      businessPlan.updateTitle(newTitle);

      await this.repository.save(businessPlan);

      const dto = this.mapper.toDTO(businessPlan);
      return Result.ok(dto);
    } catch (error) {
      console.error('更新标题失败:', error);
      return Result.fail(`更新标题失败: ${error.message}`);
    }
  }

  /**
   * 获取商业计划书列表
   */
  async getBusinessPlanList(filters = {}) {
    try {
      const businessPlans = await this.repository.findAll(filters);

      const dtos = businessPlans.map(bp => this.mapper.toDTO(bp));

      return Result.ok({
        items: dtos,
        total: dtos.length
      });
    } catch (error) {
      console.error('获取商业计划书列表失败:', error);
      return Result.fail(`获取商业计划书列表失败: ${error.message}`);
    }
  }
}
