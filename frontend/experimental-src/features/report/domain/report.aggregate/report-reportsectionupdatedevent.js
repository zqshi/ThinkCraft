export class ReportSectionUpdatedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'ReportSectionUpdated',
      aggregateId: payload.reportId,
      payload
    });
  }

  get reportId() {
    return this.payload.reportId;
  }
  get sectionId() {
    return this.payload.sectionId;
  }
}
