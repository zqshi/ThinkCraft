/**
 * 分享状态值对象
 */
export class ShareStatus {
  static ACTIVE = new ShareStatus('ACTIVE');
  static PASSWORD_PROTECTED = new ShareStatus('PASSWORD_PROTECTED');
  static EXPIRED = new ShareStatus('EXPIRED');
  static REVOKED = new ShareStatus('REVOKED');

  constructor(value) {
    this._value = value;
    this.validate();
  }

  static fromString(value) {
    const status = this[value.toUpperCase()];
    if (!status) {
      throw new Error(`无效的分享状态: ${value}`);
    }
    return status;
  }

  validate() {
    const validStatuses = ['ACTIVE', 'PASSWORD_PROTECTED', 'EXPIRED', 'REVOKED'];
    if (!validStatuses.includes(this._value)) {
      throw new Error(`无效的分享状态: ${this._value}`);
    }
  }

  get value() {
    return this._value;
  }

  isActive() {
    return this._value === 'ACTIVE';
  }
  isPasswordProtected() {
    return this._value === 'PASSWORD_PROTECTED';
  }
  isExpired() {
    return this._value === 'EXPIRED';
  }
  isRevoked() {
    return this._value === 'REVOKED';
  }

  canAccess() {
    return this._value === 'ACTIVE' || this._value === 'PASSWORD_PROTECTED';
  }

  canEdit() {
    return this._value === 'ACTIVE' || this._value === 'PASSWORD_PROTECTED';
  }

  equals(other) {
    return other instanceof ShareStatus && this._value === other._value;
  }

  toString() {
    return this._value;
  }
  toJSON() {
    return this._value;
  }
}
