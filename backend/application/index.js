import { callDeepSeekAPI } from '../config/deepseek.js';
import { eventBus } from '../infrastructure/events/EventBus.js';

import { agentHireService, taskAssignmentService, salaryService } from '../domains/agent/index.js';
import { conversationService } from '../domains/conversation/index.js';
import { reportGenerationService } from '../domains/report/index.js';
import { shareService } from '../domains/share/index.js';
import { businessPlanGenerationService } from '../domains/businessPlan/index.js';
import { demoGenerationService } from '../domains/demo/index.js';
import { pdfExportService } from '../domains/pdfExport/index.js';
import { collaborationPlanningService, collaborationExecutionService } from '../domains/collaboration/index.js';

import { AgentUseCases } from './usecases/agent/AgentUseCases.js';
import { ChatUseCases } from './usecases/chat/ChatUseCases.js';
import { ConversationUseCases } from './usecases/conversation/ConversationUseCases.js';
import { ReportUseCases } from './usecases/report/ReportUseCases.js';
import { ShareUseCases } from './usecases/share/ShareUseCases.js';
import { BusinessPlanUseCases } from './usecases/businessPlan/BusinessPlanUseCases.js';
import { DemoUseCases } from './usecases/demo/DemoUseCases.js';
import { PdfExportUseCases } from './usecases/pdfExport/PdfExportUseCases.js';
import { VisionUseCases } from './usecases/vision/VisionUseCases.js';
import { CollaborationUseCases } from './usecases/collaboration/CollaborationUseCases.js';

export const agentUseCases = new AgentUseCases({
  agentHireService,
  taskAssignmentService,
  salaryService,
  eventBus,
  aiClient: callDeepSeekAPI
});

export const chatUseCases = new ChatUseCases({
  aiClient: callDeepSeekAPI,
  eventBus
});

export const conversationUseCases = new ConversationUseCases({
  conversationService,
  eventBus
});

export const reportUseCases = new ReportUseCases({
  reportGenerationService,
  eventBus
});

export const shareUseCases = new ShareUseCases({
  shareService,
  eventBus
});

export const businessPlanUseCases = new BusinessPlanUseCases({
  businessPlanGenerationService,
  eventBus
});

export const demoUseCases = new DemoUseCases({
  demoGenerationService,
  eventBus
});

export const pdfExportUseCases = new PdfExportUseCases({
  pdfExportService,
  eventBus
});

export const visionUseCases = new VisionUseCases({
  eventBus
});

export const collaborationUseCases = new CollaborationUseCases({
  collaborationPlanningService,
  collaborationExecutionService,
  eventBus
});

export default {
  agentUseCases,
  chatUseCases,
  conversationUseCases,
  reportUseCases,
  shareUseCases,
  businessPlanUseCases,
  demoUseCases,
  pdfExportUseCases,
  visionUseCases,
  collaborationUseCases
};
