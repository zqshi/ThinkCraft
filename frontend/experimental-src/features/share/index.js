// Domain exports
export { Share, ShareFactory } from './domain/share.aggregate.js';
export { ShareId } from './domain/value-objects/share-id.vo.js';
export { ShareType } from './domain/value-objects/share-type.vo.js';
export { SharePermission } from './domain/value-objects/share-permission.vo.js';
export { ShareStatus } from './domain/value-objects/share-status.vo.js';
export { ShareTitle } from './domain/value-objects/share-title.vo.js';
export { ShareDescription } from './domain/value-objects/share-description.vo.js';

// Domain events
export { ShareCreatedEvent } from './domain/events/share-created.event.js';
export { ShareAccessedEvent } from './domain/events/share-accessed.event.js';
export { ShareRevokedEvent } from './domain/events/share-revoked.event.js';
export { ShareExpiredEvent } from './domain/events/share-expired.event.js';

// Application exports
export { ShareUseCase } from './application/share.use-case.js';

// Infrastructure exports
export { ShareRepository } from './infrastructure/share.repository.js';
export { ShareMapper } from './infrastructure/share.mapper.js';

// Presentation exports
export { ShareDashboard } from './presentation/share-dashboard.jsx';
