import { EventEmitter } from 'events';

export class EventBus {
  constructor() {
    this.emitter = new EventEmitter();
  }

  publish(event) {
    this.emitter.emit(event.type, event);
  }

  subscribe(eventType, handler) {
    this.emitter.on(eventType, handler);
  }
}

export const eventBus = new EventBus();
export default eventBus;
