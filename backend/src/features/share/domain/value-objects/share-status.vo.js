/**
 * Share状态 值对象
 */
import { ValueObject } from '../../../../shared/domain/value-object.base.js';

export class ShareStatus extends ValueObject {
  static ACTIVE = 'active';
  static EXPIRED = 'expired';
  static REVOKED = 'revoked';
  static PASSWORD_PROTECTED = 'password_protected';

  constructor(value) {
    super({ value });
  }

  get value() {
    return this.props.value;
  }

  validate() {
    const validStatuses = [
      ShareStatus.ACTIVE,
      ShareStatus.EXPIRED,
      ShareStatus.REVOKED,
      ShareStatus.PASSWORD_PROTECTED
    ];

    if (!validStatuses.includes(this.props.value)) {
      throw new Error(
        `Invalid share status: ${this.props.value}. Must be one of: ${validStatuses.join(', ')}`
      );
    }
  }

  isActive() {
    return this.props.value === ShareStatus.ACTIVE;
  }

  isExpired() {
    return this.props.value === ShareStatus.EXPIRED;
  }

  isRevoked() {
    return this.props.value === ShareStatus.REVOKED;
  }

  isPasswordProtected() {
    return this.props.value === ShareStatus.PASSWORD_PROTECTED;
  }

  isAccessible() {
    return this.isActive() || this.isPasswordProtected();
  }

  getDisplayName() {
    const displayNames = {
      [ShareStatus.ACTIVE]: '活跃',
      [ShareStatus.EXPIRED]: '已过期',
      [ShareStatus.REVOKED]: '已撤销',
      [ShareStatus.PASSWORD_PROTECTED]: '密码保护'
    };

    return displayNames[this.props.value] || this.props.value;
  }
}
