export class ReportGeneratedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'ReportGenerated',
      aggregateId: payload.reportId,
      payload
    });
  }

  get reportId() {
    return this.payload.reportId;
  }
  get projectId() {
    return this.payload.projectId;
  }
  get oldStatus() {
    return this.payload.oldStatus;
  }
  get newStatus() {
    return this.payload.newStatus;
  }
  get totalPages() {
    return this.payload.totalPages;
  }
  get wordCount() {
    return this.payload.wordCount;
  }
  get generatedBy() {
    return this.payload.generatedBy;
  }
}
