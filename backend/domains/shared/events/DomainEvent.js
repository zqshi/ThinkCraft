/**
 * DomainEvent base type for application/infrastructure layers.
 */
export class DomainEvent {
  constructor(type, payload = {}, meta = {}) {
    this.type = type;
    this.payload = payload;
    this.occurredAt = meta.occurredAt || new Date().toISOString();
    this.meta = meta;
  }
}

export default DomainEvent;
