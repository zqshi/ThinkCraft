export class ReportCreatedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'ReportCreated',
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
  get type() {
    return this.payload.type;
  }
  get title() {
    return this.payload.title;
  }
  get generatedBy() {
    return this.payload.generatedBy;
  }
}
