export class DomainEvent {
  constructor({ eventName, aggregateId, payload }) {
    this.eventName = eventName;
    this.aggregateId = aggregateId;
    this.payload = payload;
    this.timestamp = new Date();
    this.eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
