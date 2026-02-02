/**
 * 仓库工厂
 * 根据环境变量选择仓库实现（内存 or MongoDB）
 */
import { UserInMemoryRepository } from '../../features/auth/infrastructure/user-inmemory.repository.js';
import { UserMongoRepository } from '../../features/auth/infrastructure/user-mongodb.repository.js';
import { InMemoryChatRepository } from '../../features/chat/infrastructure/chat-inmemory.repository.js';
import { ChatMongoRepository } from '../../features/chat/infrastructure/chat-mongodb.repository.js';
import { ProjectInMemoryRepository } from '../../features/projects/infrastructure/project-inmemory.repository.js';
import { ProjectMongoRepository } from '../../features/projects/infrastructure/project-mongodb.repository.js';
import { BusinessPlanInMemoryRepository } from '../../features/business-plan/infrastructure/business-plan-inmemory.repository.js';
import { BusinessPlanMongoRepository } from '../../features/business-plan/infrastructure/business-plan-mongodb.repository.js';
import { ReportInMemoryRepository } from '../../features/report/infrastructure/report-inmemory.repository.js';
import { ReportMongoRepository } from '../../features/report/infrastructure/report-mongodb.repository.js';
import { ShareInMemoryRepository } from '../../features/share/infrastructure/share-inmemory.repository.js';
import { ShareMongoRepository } from '../../features/share/infrastructure/share-mongodb.repository.js';

/**
 * 存储类型枚举
 */
export const StorageType = {
  MEMORY: 'memory',
  MONGODB: 'mongodb'
};

/**
 * 仓库工厂类
 */
class RepositoryFactory {
  constructor() {
    // 从环境变量获取存储类型，默认为内存
    this.storageType = process.env.DB_TYPE || StorageType.MEMORY;
    this.repositories = new Map();

    console.log(`[RepositoryFactory] 使用存储类型: ${this.storageType}`);
  }

  /**
   * 获取用户仓库
   */
  getUserRepository() {
    const key = 'user';

    if (!this.repositories.has(key)) {
      let repository;

      switch (this.storageType) {
        case StorageType.MONGODB:
          repository = new UserMongoRepository();
          console.log('[RepositoryFactory] 创建MongoDB用户仓库');
          break;

        case StorageType.MEMORY:
        default:
          repository = new UserInMemoryRepository();
          console.log('[RepositoryFactory] 创建内存用户仓库');
          break;
      }

      this.repositories.set(key, repository);
    }

    return this.repositories.get(key);
  }

  getChatRepository() {
    const key = 'chat';

    if (!this.repositories.has(key)) {
      let repository;

      switch (this.storageType) {
        case StorageType.MONGODB:
          repository = new ChatMongoRepository();
          console.log('[RepositoryFactory] 创建MongoDB聊天仓库');
          break;
        case StorageType.MEMORY:
        default:
          repository = new InMemoryChatRepository();
          console.log('[RepositoryFactory] 创建内存聊天仓库');
          break;
      }

      this.repositories.set(key, repository);
    }

    return this.repositories.get(key);
  }

  getProjectRepository() {
    const key = 'project';

    if (!this.repositories.has(key)) {
      let repository;

      switch (this.storageType) {
        case StorageType.MONGODB:
          repository = new ProjectMongoRepository();
          console.log('[RepositoryFactory] 创建MongoDB项目仓库');
          break;
        case StorageType.MEMORY:
        default:
          repository = new ProjectInMemoryRepository();
          console.log('[RepositoryFactory] 创建内存项目仓库');
          break;
      }

      this.repositories.set(key, repository);
    }

    return this.repositories.get(key);
  }

  getBusinessPlanRepository() {
    const key = 'business-plan';

    if (!this.repositories.has(key)) {
      let repository;

      switch (this.storageType) {
        case StorageType.MONGODB:
          repository = new BusinessPlanMongoRepository();
          console.log('[RepositoryFactory] 创建MongoDB商业计划书仓库');
          break;
        case StorageType.MEMORY:
        default:
          repository = new BusinessPlanInMemoryRepository();
          console.log('[RepositoryFactory] 创建内存商业计划书仓库');
          break;
      }

      this.repositories.set(key, repository);
    }

    return this.repositories.get(key);
  }

  getReportRepository() {
    const key = 'report';

    if (!this.repositories.has(key)) {
      let repository;

      switch (this.storageType) {
        case StorageType.MONGODB:
          repository = new ReportMongoRepository();
          console.log('[RepositoryFactory] 创建MongoDB报告仓库');
          break;
        case StorageType.MEMORY:
        default:
          repository = new ReportInMemoryRepository();
          console.log('[RepositoryFactory] 创建内存报告仓库');
          break;
      }

      this.repositories.set(key, repository);
    }

    return this.repositories.get(key);
  }

  getShareRepository() {
    const key = 'share';

    if (!this.repositories.has(key)) {
      let repository;

      switch (this.storageType) {
        case StorageType.MONGODB:
          repository = new ShareMongoRepository();
          console.log('[RepositoryFactory] 创建MongoDB分享仓库');
          break;
        case StorageType.MEMORY:
        default:
          repository = new ShareInMemoryRepository();
          console.log('[RepositoryFactory] 创建内存分享仓库');
          break;
      }

      this.repositories.set(key, repository);
    }

    return this.repositories.get(key);
  }

  /**
   * 设置存储类型
   */
  setStorageType(type) {
    if (!Object.values(StorageType).includes(type)) {
      throw new Error(`不支持的存储类型: ${type}`);
    }

    if (this.storageType !== type) {
      console.log(`[RepositoryFactory] 切换存储类型: ${this.storageType} -> ${type}`);
      this.storageType = type;
      // 清空已创建的仓库实例
      this.repositories.clear();
    }
  }

  /**
   * 获取当前存储类型
   */
  getStorageType() {
    return this.storageType;
  }

  /**
   * 清空所有仓库实例
   */
  clear() {
    this.repositories.clear();
  }
}

// 导出单例实例
export const repositoryFactory = new RepositoryFactory();

/**
 * 便捷方法：获取用户仓库
 */
export function getUserRepository() {
  return repositoryFactory.getUserRepository();
}

/**
 * 通用方法：根据类型获取仓库
 */
export function getRepository(type) {
  switch (type) {
    case 'user':
      return getUserRepository();
    case 'chat':
      return repositoryFactory.getChatRepository();
    case 'project':
      return repositoryFactory.getProjectRepository();
    case 'business-plan':
      return repositoryFactory.getBusinessPlanRepository();
    case 'report':
      return repositoryFactory.getReportRepository();
    case 'share':
      return repositoryFactory.getShareRepository();
    default:
      throw new Error(`不支持的仓库类型: ${type}`);
  }
}
