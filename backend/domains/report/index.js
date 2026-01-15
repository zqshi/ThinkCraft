/**
 * Report领域模块统一导出
 */

import { ReportRepository, reportRepository } from './repositories/ReportRepository.js';
import { ReportGenerationService, reportGenerationService } from './services/ReportGenerationService.js';

// 导出类和实例
export { ReportRepository, reportRepository };
export { ReportGenerationService, reportGenerationService };

// Report领域门面
export const ReportDomain = {
  repository: reportRepository,
  generation: reportGenerationService
};

export default ReportDomain;
