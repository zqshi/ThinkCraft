/**
 * ImageData值对象
 * 封装图片数据及其元信息
 */

export class ImageData {
  constructor(base64, type, sizeKB) {
    this.base64 = base64;
    this.type = type;
    this.sizeKB = sizeKB;
  }

  /**
   * 从Base64字符串创建ImageData
   * @param {string} base64String - Base64编码的图片数据
   * @returns {ImageData} ImageData实例
   */
  static create(base64String) {
    if (!base64String || typeof base64String !== 'string') {
      throw new Error('无效的base64字符串');
    }

    // 移除 data:image/xxx;base64, 前缀（如果有）
    const cleanBase64 = base64String.replace(/^data:image\/\w+;base64,/, '');

    const buffer = Buffer.from(cleanBase64, 'base64');
    const sizeKB = (buffer.length / 1024).toFixed(2);
    const type = this.detectImageType(cleanBase64);

    return new ImageData(cleanBase64, type, parseFloat(sizeKB));
  }

  /**
   * 检测图片类型
   * @param {string} base64 - Base64字符串
   * @returns {string} 图片类型
   */
  static detectImageType(base64) {
    if (base64.startsWith('/9j/')) return 'JPEG';
    if (base64.startsWith('iVBORw0KGgo')) return 'PNG';
    if (base64.startsWith('R0lGOD')) return 'GIF';
    if (base64.startsWith('UklGR')) return 'WEBP';
    return 'UNKNOWN';
  }

  /**
   * 验证图片数据是否有效
   * @param {number} maxSizeMB - 最大文件大小（MB）
   * @returns {boolean} 是否有效
   */
  isValid(maxSizeMB = 10) {
    return this.type !== 'UNKNOWN' && this.sizeKB > 0 && this.sizeKB < maxSizeMB * 1024;
  }

  /**
   * 转换为Buffer
   * @returns {Buffer} Buffer对象
   */
  toBuffer() {
    return Buffer.from(this.base64, 'base64');
  }

  /**
   * 获取图片信息
   * @returns {Object} 图片信息
   */
  getInfo() {
    return {
      type: this.type,
      sizeKB: this.sizeKB,
      sizeMB: (this.sizeKB / 1024).toFixed(2)
    };
  }
}
