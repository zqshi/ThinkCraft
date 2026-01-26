/**
 * 分享权限值对象
 */
export class SharePermission {
  static READ = new SharePermission('READ');
  static WRITE = new SharePermission('WRITE');
  static COMMENT = new SharePermission('COMMENT');
  static ADMIN = new SharePermission('ADMIN');

  constructor(value) {
    this._value = value;
    this.validate();
  }

  static fromString(value) {
    const permission = this[value.toUpperCase()];
    if (!permission) {
      throw new Error(`无效的分享权限: ${value}`);
    }
    return permission;
  }

  validate() {
    const validPermissions = ['READ', 'WRITE', 'COMMENT', 'ADMIN'];
    if (!validPermissions.includes(this._value)) {
      throw new Error(`无效的分享权限: ${this._value}`);
    }
  }

  get value() {
    return this._value;
  }

  getDisplayName() {
    const names = {
      READ: '只读',
      WRITE: '可编辑',
      COMMENT: '可评论',
      ADMIN: '管理员'
    };
    return names[this._value] || this._value;
  }

  canRead() {
    return true;
  }

  canWrite() {
    return this._value === 'WRITE' || this._value === 'ADMIN';
  }

  canComment() {
    return this._value === 'COMMENT' || this._value === 'ADMIN';
  }

  canAdmin() {
    return this._value === 'ADMIN';
  }

  equals(other) {
    return other instanceof SharePermission && this._value === other._value;
  }

  toString() {
    return this._value;
  }
  toJSON() {
    return this._value;
  }
}
