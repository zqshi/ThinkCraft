import { DomainEvent } from '../../../domains/shared/events/DomainEvent.js';
import { EVENT_TYPES } from '../../../domains/shared/events/EventTypes.js';

export class ReportUseCases {
  constructor({ reportGenerationService, eventBus }) {
    this.reportGenerationService = reportGenerationService;
    this.eventBus = eventBus;
  }

  async generateReport({ conversationId, userId, messages }) {
    const result = await this.reportGenerationService.generateReport(conversationId, userId, messages);

    this.eventBus.publish(new DomainEvent(EVENT_TYPES.REPORT_GENERATED, {
      reportId: result.id,
      conversationId,
      userId
    }));

    return result;
  }

  async getReport({ reportId }) {
    return this.reportGenerationService.getReport(reportId);
  }

  async getReportByConversationId({ conversationId }) {
    return this.reportGenerationService.getReportByConversationId(conversationId);
  }

  async getUserReports({ userId, options }) {
    return this.reportGenerationService.getUserReports(userId, options);
  }

  async updateStatus({ reportId, status }) {
    return this.reportGenerationService.updateStatus(reportId, status);
  }

  async updateReportData({ reportId, reportData }) {
    return this.reportGenerationService.updateReportData(reportId, reportData);
  }

  async deleteReport({ reportId, userId }) {
    return this.reportGenerationService.deleteReport(reportId, userId);
  }

  async regenerateReport({ reportId, messages }) {
    const result = await this.reportGenerationService.regenerateReport(reportId, messages);

    this.eventBus.publish(new DomainEvent(EVENT_TYPES.REPORT_REGENERATED, {
      reportId
    }));

    return result;
  }

  async getStats() {
    return this.reportGenerationService.getStats();
  }

  async getUserStats({ userId }) {
    return this.reportGenerationService.getUserStats(userId);
  }
}

export default ReportUseCases;
