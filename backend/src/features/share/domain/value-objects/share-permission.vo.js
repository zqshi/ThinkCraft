/**
 * Share权限 值对象
 */
import { ValueObject } from '../../../../shared/domain/value-object.base.js';

export class SharePermission extends ValueObject {
  static READ = 'read';
  static WRITE = 'write';
  static ADMIN = 'admin';

  constructor(value) {
    super({ value });
  }

  get value() {
    return this.props.value;
  }

  validate() {
    const validPermissions = [SharePermission.READ, SharePermission.WRITE, SharePermission.ADMIN];

    if (!validPermissions.includes(this.props.value)) {
      throw new Error(
        `Invalid share permission: ${this.props.value}. Must be one of: ${validPermissions.join(', ')}`
      );
    }
  }

  isRead() {
    return this.props.value === SharePermission.READ;
  }

  isWrite() {
    return this.props.value === SharePermission.WRITE;
  }

  isAdmin() {
    return this.props.value === SharePermission.ADMIN;
  }

  canRead() {
    return true;
  }

  canWrite() {
    return this.isWrite() || this.isAdmin();
  }

  canAdmin() {
    return this.isAdmin();
  }

  getDisplayName() {
    const displayNames = {
      [SharePermission.READ]: '只读',
      [SharePermission.WRITE]: '可编辑',
      [SharePermission.ADMIN]: '管理员'
    };

    return displayNames[this.props.value] || this.props.value;
  }
}
