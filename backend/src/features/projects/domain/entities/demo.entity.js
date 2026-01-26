/**
 * Demo实体
 * 管理Demo模式项目的演示配置
 */
import { Entity } from '../../../../shared/domain/entity.base.js';

export class Demo extends Entity {
  constructor(
    id,
    type = null,
    code = null,
    previewUrl = null,
    downloadUrl = null,
    generatedAt = null
  ) {
    super(id);
    this._type = type;
    this._code = code;
    this._previewUrl = previewUrl;
    this._downloadUrl = downloadUrl;
    this._generatedAt = generatedAt;
  }

  /**
   * 创建Demo配置
   */
  static create() {
    const demoId = `demo_${Date.now()}`;
    return new Demo(demoId);
  }

  /**
   * 更新Demo代码
   */
  updateCode(code, type, previewUrl, downloadUrl) {
    this._code = code;
    this._type = type || this._type;
    this._previewUrl = previewUrl || this._previewUrl;
    this._downloadUrl = downloadUrl || this._downloadUrl;
    this._generatedAt = new Date();
  }

  /**
   * 清除代码
   */
  clearCode() {
    this._code = null;
    this._type = null;
    this._previewUrl = null;
    this._downloadUrl = null;
    this._generatedAt = null;
  }

  /**
   * 检查是否有代码
   */
  hasCode() {
    return Boolean(this._code);
  }

  /**
   * 验证Demo配置
   */
  validate() {
    if (this._code && !this._type) {
      throw new Error('Demo代码存在时必须指定类型');
    }

    if (this._previewUrl && !this._isValidUrl(this._previewUrl)) {
      throw new Error('预览URL格式不正确');
    }

    if (this._downloadUrl && !this._isValidUrl(this._downloadUrl)) {
      throw new Error('下载URL格式不正确');
    }
  }

  /**
   * 验证URL格式
   */
  _isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Getters
  get type() {
    return this._type;
  }
  get code() {
    return this._code;
  }
  get previewUrl() {
    return this._previewUrl;
  }
  get downloadUrl() {
    return this._downloadUrl;
  }
  get generatedAt() {
    return this._generatedAt;
  }

  toJSON() {
    return {
      id: this.id,
      type: this._type,
      code: this._code,
      previewUrl: this._previewUrl,
      downloadUrl: this._downloadUrl,
      generatedAt: this._generatedAt
    };
  }
}
