/**
 * 章节生成事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class ChapterGeneratedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'ChapterGenerated',
      aggregateId: payload.businessPlanId,
      payload
    });
  }

  get businessPlanId() {
    return this.payload.businessPlanId;
  }

  get chapterId() {
    return this.payload.chapterId;
  }

  get chapterType() {
    return this.payload.chapterType;
  }

  get title() {
    return this.payload.title;
  }

  get tokens() {
    return this.payload.tokens;
  }
}
