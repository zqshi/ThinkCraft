export class ReportSectionRemovedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'ReportSectionRemoved',
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
  get sectionTitle() {
    return this.payload.sectionTitle;
  }
}
