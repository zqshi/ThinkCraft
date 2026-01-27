// Domain exports
export {
  WorkflowRecommendation,
  RecommendationItem,
  WorkflowRecommendationFactory
} from './domain/recommendation.aggregate.js';
export { RecommendationId } from './domain/value-objects/recommendation-id.vo.js';
export { RecommendationType } from './domain/value-objects/recommendation-type.vo.js';
export { RecommendationConfidence } from './domain/value-objects/recommendation-confidence.vo.js';

// Domain events
export { RecommendationGeneratedEvent } from './domain/events/recommendation-generated.event.js';

// Application exports
export { RecommendationUseCase } from './application/recommendation.use-case.js';

// Infrastructure exports
export { RecommendationRepository } from './infrastructure/recommendation.repository.js';
export { RecommendationMapper } from './infrastructure/recommendation.mapper.js';
