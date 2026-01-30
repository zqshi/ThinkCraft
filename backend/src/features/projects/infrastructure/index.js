/**
 * Projects基础设施层模块导出
 */
import { ProjectMongoRepository } from './project-mongodb.repository.js';

export const projectRepository = new ProjectMongoRepository();
