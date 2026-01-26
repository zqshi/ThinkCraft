import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

/**
 * 推荐生成事件
 */
export class RecommendationGeneratedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'recommendation.generated',
      aggregateId: payload.recommendationId,
      payload
    });
  }

  get recommendationId() {
    return this.payload.recommendationId;
  }

  get projectId() {
    return this.payload.projectId;
  }

  get type() {
    return this.payload.type;
  }

  get confidence() {
    return this.payload.confidence;
  }

  get reason() {
    return this.payload.reason;
  }

  get generatedBy() {
    return this.payload.generatedBy;
  }
}
