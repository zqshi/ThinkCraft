/**
 * Domains统一导出
 *
 * 提供所有前端Domain Service的统一访问入口
 */

import { conversationService } from './conversation/ConversationService.js';
import { reportService } from './report/ReportService.js';
import { shareService } from './share/ShareService.js';
import { agentService } from './agent/AgentService.js';

// 导出所有Service实例
export {
  conversationService,
  reportService,
  shareService,
  agentService
};

// 域服务集合
export const domainServices = {
  conversation: conversationService,
  report: reportService,
  share: shareService,
  agent: agentService
};

/**
 * 初始化所有域服务
 * @param {Object} stateManager - 状态管理器
 * @param {Object} storageManager - 存储管理器
 */
export async function initDomainServices(stateManager, storageManager) {
  console.log('[Domains] 初始化所有域服务...');

  try {
    // 初始化ConversationService
    await conversationService.init(stateManager, storageManager);

    // 初始化ReportService
    await reportService.init(storageManager);

    // 初始化ShareService
    await shareService.init();

    // 初始化AgentService
    await agentService.init();

    console.log('[Domains] 所有域服务初始化完成');
    return true;
  } catch (error) {
    console.error('[Domains] 域服务初始化失败:', error);
    return false;
  }
}

export default domainServices;
