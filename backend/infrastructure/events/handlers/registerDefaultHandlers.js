import { eventBus } from '../EventBus.js';
import { domainLoggers } from '../../logging/domainLogger.js';
import { EVENT_TYPES } from '../../../domains/shared/events/EventTypes.js';

export const registerDefaultHandlers = () => {
  const logger = domainLoggers.Events;

  Object.values(EVENT_TYPES).forEach((eventType) => {
    eventBus.subscribe(eventType, (event) => {
      logger.info('Domain event', {
        type: event.type,
        occurredAt: event.occurredAt,
        payload: event.payload
      });
    });
  });
};

export default registerDefaultHandlers;
