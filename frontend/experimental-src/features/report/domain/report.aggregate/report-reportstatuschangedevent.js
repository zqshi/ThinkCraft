export class ReportStatusChangedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'ReportStatusChanged',
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
}
