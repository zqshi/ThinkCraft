/**
 * Projects基础设施层模块导出
 */
import { getRepository } from '../../../shared/infrastructure/repository.factory.js';

export const projectRepository = getRepository('project');
