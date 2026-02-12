export class ReportSectionAddedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'ReportSectionAdded',
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
  get title() {
    return this.payload.title;
  }
  get orderIndex() {
    return this.payload.orderIndex;
  }
}
