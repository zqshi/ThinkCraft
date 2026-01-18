/**
 * Share领域模块统一导出
 */

import { ShareRepository, shareRepository } from './repositories/ShareRepository.js';
import { ShareService, shareService } from './services/ShareService.js';

// 导出类和实例
export { ShareRepository, shareRepository };
export { ShareService, shareService };

// Share领域门面
export const ShareDomain = {
  repository: shareRepository,
  service: shareService
};

export default ShareDomain;
