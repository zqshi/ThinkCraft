import { AggregateRoot } from '../../../shared/domain/aggregate-root.base.js';
import { ShareId } from './value-objects/share-id.vo.js';
import { ShareType } from './value-objects/share-type.vo.js';
import { SharePermission } from './value-objects/share-permission.vo.js';
import { ShareStatus } from './value-objects/share-status.vo.js';
import { ShareTitle } from './value-objects/share-title.vo.js';
import { ShareDescription } from './value-objects/share-description.vo.js';
import { UserId } from '../../shared/value-objects/user-id.vo.js';
import { ShareCreatedEvent } from './events/share-created.event.js';
import { ShareAccessedEvent } from './events/share-accessed.event.js';
import { ShareRevokedEvent } from './events/share-revoked.event.js';
import { ShareExpiredEvent } from './events/share-expired.event.js';

export class ShareFactory {
  static createShare(props) {
    return Share.create(props);
  }

  static createFromJSON(json) {
    return Share.fromJSON(json);
  }

  /**
   * 创建项目分享
   */
  static createProjectShare(
    projectId,
    title,
    description,
    permission,
    expiresAt,
    password,
    createdBy
  ) {
    return Share.create({
      resourceId: projectId,
      resourceType: 'PROJECT',
      title,
      description,
      permission,
      expiresAt,
      password,
      createdBy
    });
  }

  /**
   * 创建报告分享
   */
  static createReportShare(
    reportId,
    title,
    description,
    permission,
    expiresAt,
    password,
    createdBy
  ) {
    return Share.create({
      resourceId: reportId,
      resourceType: 'REPORT',
      title,
      description,
      permission,
      expiresAt,
      password,
      createdBy
    });
  }

  /**
   * 创建商业计划书分享
   */
  static createBusinessPlanShare(
    planId,
    title,
    description,
    permission,
    expiresAt,
    password,
    createdBy
  ) {
    return Share.create({
      resourceId: planId,
      resourceType: 'BUSINESS_PLAN',
      title,
      description,
      permission,
      expiresAt,
      password,
      createdBy
    });
  }
}
