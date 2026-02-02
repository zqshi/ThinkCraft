/**
 * 视觉识别用例
 * 处理视觉分析相关的业务用例
 */
import { VisionImage } from '../domain/value-objects/vision-image.vo.js';
import { VisionRepository } from '../infrastructure/vision.repository.js';
import { VisionMapper } from '../infrastructure/vision.mapper.js';
import { Result } from '../../../shared/result.js';

export class VisionUseCase {
  constructor() {
    this.repository = new VisionRepository();
    this.mapper = new VisionMapper();
  }

  /**
   * 创建视觉任务
   */
  async createVisionTask(createDto) {
    try {
      const { taskType, prompt, createdBy } = createDto;
      let { imageData } = createDto;

      if (!taskType || !imageData) {
        return Result.fail('任务类型和图片数据不能为空');
      }

      // 验证图片数据
      try {
        const image = new VisionImage(imageData);
        // 如果图片太大，进行压缩
        if (image.size.bytes > 2 * 1024 * 1024) {
          // 2MB
          const compressed = await image.compress(1024, 768, 0.8);
          imageData = compressed.getDataUrl();
        }
      } catch (error) {
        return Result.fail(`图片数据无效: ${error.message}`);
      }

      const visionTask = VisionTask.create({
        taskType,
        imageData,
        prompt,
        createdBy
      });

      await this.repository.save(visionTask);

      const dto = this.mapper.toDTO(visionTask);
      return Result.ok(dto);
    } catch (error) {
      console.error('创建视觉任务失败:', error);
      return Result.fail(`创建视觉任务失败: ${error.message}`);
    }
  }

  /**
   * 获取视觉任务
   */
  async getVisionTask(id) {
    try {
      const visionTask = await this.repository.findById(id);

      if (!visionTask) {
        return Result.fail('视觉任务不存在');
      }

      const dto = this.mapper.toDTO(visionTask);
      return Result.ok(dto);
    } catch (error) {
      console.error('获取视觉任务失败:', error);
      return Result.fail(`获取视觉任务失败: ${error.message}`);
    }
  }

  /**
   * 开始处理视觉任务
   */
  async processVisionTask(id) {
    try {
      const visionTask = await this.repository.findById(id);

      if (!visionTask) {
        return Result.fail('视觉任务不存在');
      }

      if (!visionTask.status.canStart()) {
        return Result.fail('当前状态不能开始处理');
      }

      visionTask.start();
      await this.repository.save(visionTask);

      // 模拟异步处理过程
      this.simulateProcessing(id);

      const dto = this.mapper.toDTO(visionTask);
      return Result.ok(dto);
    } catch (error) {
      console.error('处理视觉任务失败:', error);
      return Result.fail(`处理视觉任务失败: ${error.message}`);
    }
  }

  /**
   * 模拟处理过程（实际情况应调用AI服务）
   */
  async simulateProcessing(taskId) {
    try {
      // 模拟处理时长（2-5秒）
      const processingTime = Math.floor(Math.random() * 3000) + 2000;

      // 等待处理完成
      await new Promise(resolve => setTimeout(resolve, processingTime));

      // 重新获取任务
      const visionTask = await this.repository.findById(taskId);
      if (!visionTask || visionTask.status.value !== 'PROCESSING') {
        return;
      }

      // 根据任务类型生成模拟结果
      let result;
      const confidence = Math.random() * 0.3 + 0.7; // 70-100%置信度

      switch (visionTask.taskType.value) {
      case 'IMAGE_ANALYSIS':
        result = {
          description: '这是一张包含多个元素的图片，主要特征已识别。',
          objects: ['物体1', '物体2', '物体3'],
          colors: ['#FF0000', '#00FF00', '#0000FF'],
          scene: '室内场景'
        };
        break;

      case 'OCR':
        result = {
          text: '识别到的文字内容示例。\n这是多行文字的模拟结果。',
          regions: [
            { text: '第一行文字', confidence: 0.95, bbox: [10, 10, 100, 30] },
            { text: '第二行文字', confidence: 0.92, bbox: [10, 40, 120, 60] }
          ],
          language: 'zh-CN'
        };
        break;

      case 'OBJECT_DETECTION':
        result = {
          objects: [
            {
              label: 'person',
              score: 0.98,
              bbox: [50, 100, 200, 400],
              attributes: { confidence: 0.98 }
            },
            {
              label: 'car',
              score: 0.95,
              bbox: [300, 200, 500, 350],
              attributes: { confidence: 0.95 }
            }
          ],
          count: 2
        };
        break;

      case 'FACE_DETECTION':
        result = {
          faces: [
            {
              bbox: [100, 50, 200, 150],
              landmarks: {
                leftEye: [120, 80],
                rightEye: [180, 80],
                nose: [150, 110],
                mouth: [130, 130, 170, 130]
              },
              attributes: {
                gender: 'unknown',
                age: 25,
                emotion: 'neutral'
              }
            }
          ],
          count: 1
        };
        break;

      case 'TEXT_DETECTION':
        result = {
          textBlocks: [
            {
              text: '检测到的文本',
              bbox: [10, 10, 200, 50],
              confidence: 0.94,
              language: 'zh-CN'
            }
          ],
          fullText: '检测到的文本 \n更多文本内容'
        };
        break;

      case 'SCENE_DETECTION':
        result = {
          scene: 'office',
          categories: [
            { name: 'indoor', confidence: 0.92 },
            { name: 'office', confidence: 0.88 },
            { name: 'workspace', confidence: 0.85 }
          ],
          attributes: {
            time: 'day',
            lighting: 'bright'
          }
        };
        break;

      case 'COLOR_ANALYSIS':
        result = {
          dominantColors: [
            { hex: '#FF6B6B', name: '珊瑚红', percentage: 0.35 },
            { hex: '#4ECDC4', name: '青绿色', percentage: 0.25 },
            { hex: '#45B7D1', name: '天蓝色', percentage: 0.2 }
          ],
          palette: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57'],
          colorHarmony: 'triadic'
        };
        break;

      default:
        result = { message: '分析完成' };
      }

      // 完成任务
      visionTask.complete(result, confidence, processingTime);
      await this.repository.save(visionTask);
    } catch (error) {
      console.error('处理视觉任务失败:', error);
      // 标记任务为失败
      const visionTask = await this.repository.findById(taskId);
      if (visionTask) {
        visionTask.fail(error.message);
        await this.repository.save(visionTask);
      }
    }
  }

  /**
   * 批量创建视觉任务
   */
  async createVisionTasks(tasksData) {
    try {
      const results = [];

      for (const taskData of tasksData) {
        const result = await this.createVisionTask(taskData);
        results.push(result);

        // 如果创建成功，自动开始处理
        if (result.isSuccess) {
          this.processVisionTask(result.value.id);
        }
      }

      return Result.ok(results);
    } catch (error) {
      console.error('批量创建视觉任务失败:', error);
      return Result.fail(`批量创建视觉任务失败: ${error.message}`);
    }
  }

  /**
   * 获取用户的视觉任务
   */
  async getVisionTasksByUser(createdBy, filters = {}) {
    try {
      const tasks = await this.repository.findByCreator(createdBy, filters);

      const dtos = tasks.map(task => this.mapper.toDTO(task));

      return Result.ok({
        items: dtos,
        total: dtos.length
      });
    } catch (error) {
      console.error('获取用户视觉任务失败:', error);
      return Result.fail(`获取用户视觉任务失败: ${error.message}`);
    }
  }

  /**
   * 获取指定类型的视觉任务
   */
  async getVisionTasksByType(taskType, filters = {}) {
    try {
      const tasks = await this.repository.findByType(taskType, filters);

      const dtos = tasks.map(task => this.mapper.toDTO(task));

      return Result.ok({
        items: dtos,
        total: dtos.length
      });
    } catch (error) {
      console.error('获取视觉任务失败:', error);
      return Result.fail(`获取视觉任务失败: ${error.message}`);
    }
  }

  /**
   * 删除视觉任务
   */
  async deleteVisionTask(id) {
    try {
      await this.repository.delete(id);
      return Result.ok(true);
    } catch (error) {
      console.error('删除视觉任务失败:', error);
      return Result.fail(`删除视觉任务失败: ${error.message}`);
    }
  }

  /**
   * 取消视觉任务
   */
  async cancelVisionTask(id) {
    try {
      const visionTask = await this.repository.findById(id);

      if (!visionTask) {
        return Result.fail('视觉任务不存在');
      }

      if (!visionTask.status.canCancel()) {
        return Result.fail('当前状态不能取消任务');
      }

      visionTask.status = VisionTaskStatus.CANCELLED;
      visionTask.updateTimestamp();

      await this.repository.save(visionTask);

      const dto = this.mapper.toDTO(visionTask);
      return Result.ok(dto);
    } catch (error) {
      console.error('取消视觉任务失败:', error);
      return Result.fail(`取消视觉任务失败: ${error.message}`);
    }
  }

  /**
   * 获取视觉任务统计
   */
  async getVisionTaskStats(createdBy) {
    try {
      const stats = await this.repository.getStats(createdBy);
      return Result.ok(stats);
    } catch (error) {
      console.error('获取视觉任务统计失败:', error);
      return Result.fail(`获取视觉任务统计失败: ${error.message}`);
    }
  }

  /**
   * 分析图片（便捷方法）
   */
  async analyzeImage(imageData, taskType = 'IMAGE_ANALYSIS', prompt = null, createdBy = null) {
    try {
      // 创建任务
      const createResult = await this.createVisionTask({
        taskType,
        imageData,
        prompt,
        createdBy
      });

      if (!createResult.isSuccess) {
        return createResult;
      }

      const taskId = createResult.value.id;

      // 开始处理
      const processResult = await this.processVisionTask(taskId);

      if (!processResult.isSuccess) {
        return processResult;
      }

      // 等待处理完成（轮询）
      let attempts = 0;
      const maxAttempts = 30; // 最多等待30秒

      while (attempts < maxAttempts) {
        const taskResult = await this.getVisionTask(taskId);

        if (taskResult.isSuccess && taskResult.value.status.isTerminal()) {
          return taskResult;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }

      return Result.fail('任务处理超时');
    } catch (error) {
      console.error('分析图片失败:', error);
      return Result.fail(`分析图片失败: ${error.message}`);
    }
  }
}

export default VisionUseCase;
