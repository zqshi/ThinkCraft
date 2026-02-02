/**
 * 视觉图片值对象
 */
export class VisionImage {
  constructor(data) {
    this._data = data;
    this._format = this.detectFormat();
    this._size = this.calculateSize();
    this._dimensions = null; // 将在需要时解析
    this.validate();
  }

  validate() {
    if (!this._data || typeof this._data !== 'string') {
      throw new Error('图片数据必须是Base64字符串');
    }

    // 检查是否为有效的Base64
    const base64Regex = /^data:image\/[a-zA-Z+]+;base64,[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(this._data)) {
      throw new Error('无效的图片格式，必须是Base64编码的图片');
    }

    // 检查大小限制（10MB）
    const sizeInBytes = this.getSizeInBytes();
    if (sizeInBytes > 10 * 1024 * 1024) {
      throw new Error('图片大小不能超过10MB');
    }
  }

  detectFormat() {
    if (this._data.startsWith('data:image/jpeg')) {
      return 'JPEG';
    }
    if (this._data.startsWith('data:image/png')) {
      return 'PNG';
    }
    if (this._data.startsWith('data:image/gif')) {
      return 'GIF';
    }
    if (this._data.startsWith('data:image/webp')) {
      return 'WEBP';
    }
    if (this._data.startsWith('data:image/bmp')) {
      return 'BMP';
    }
    return 'UNKNOWN';
  }

  calculateSize() {
    const base64Data = this._data.split(',')[1];
    const sizeInBytes = (base64Data.length * 3) / 4;
    return {
      bytes: sizeInBytes,
      kb: Math.round((sizeInBytes / 1024) * 100) / 100,
      mb: Math.round((sizeInBytes / (1024 * 1024)) * 100) / 100
    };
  }

  getSizeInBytes() {
    const base64Data = this._data.split(',')[1];
    return (base64Data.length * 3) / 4;
  }

  /**
   * 获取图片的Base64数据（不含前缀）
   */
  getBase64Data() {
    return this._data.split(',')[1];
  }

  /**
   * 获取完整的Data URL
   */
  getDataUrl() {
    return this._data;
  }

  /**
   * 转换为文件对象
   */
  toFile(filename = 'image') {
    const byteString = atob(this.getBase64Data());
    const mimeString = this._data.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);

    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }

    const blob = new Blob([ab], { type: mimeString });
    return new File([blob], `${filename}.${this._format.toLowerCase()}`, { type: mimeString });
  }

  /**
   * 压缩图片
   */
  async compress(maxWidth = 1920, maxHeight = 1080, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // 计算缩放比例
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          blob => {
            const reader = new FileReader();
            reader.onloadend = () => {
              resolve(new VisionImage(reader.result));
            };
            reader.readAsDataURL(blob);
          },
          `image/${this._format.toLowerCase()}`,
          quality
        );
      };
      img.onerror = reject;
      img.src = this._data;
    });
  }

  get format() {
    return this._format;
  }
  get size() {
    return this._size;
  }
  get dimensions() {
    return this._dimensions;
  }

  equals(other) {
    return other instanceof VisionImage && this._data === other._data;
  }

  toJSON() {
    return {
      data: this._data,
      format: this._format,
      size: this._size
    };
  }

  static fromJSON(json) {
    return new VisionImage(json.data);
  }

  static fromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          resolve(new VisionImage(e.target.result));
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  static validateBase64Image(base64String) {
    try {
      new VisionImage(base64String);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * 视觉提示词值对象
 */
export class VisionPrompt {
  constructor(value) {
    this._value = value;
    this.validate();
  }

  validate() {
    if (typeof this._value !== 'string') {
      throw new Error('提示词必须是字符串');
    }

    if (this._value.length > 1000) {
      throw new Error('提示词不能超过1000个字符');
    }
  }

  get value() {
    return this._value;
  }
  get length() {
    return this._value.length;
  }

  equals(other) {
    return other instanceof VisionPrompt && this._value === other._value;
  }

  toString() {
    return this._value;
  }
  toJSON() {
    return this._value;
  }
}

/**
 * 视觉结果值对象
 */
export class VisionResult {
  constructor(data) {
    this._data = data;
    this._type = this.detectType();
    this.validate();
  }

  validate() {
    if (!this._data) {
      throw new Error('结果数据不能为空');
    }

    // 根据类型验证数据结构
    switch (this._type) {
    case 'text':
      if (typeof this._data !== 'string') {
        throw new Error('文本结果必须是字符串');
      }
      break;
    case 'objects':
      if (!Array.isArray(this._data)) {
        throw new Error('物体检测结果必须是数组');
      }
      break;
    case 'analysis':
      if (typeof this._data !== 'object') {
        throw new Error('分析结果必须是对象');
      }
      break;
    }
  }

  detectType() {
    if (typeof this._data === 'string') {
      return 'text';
    }
    if (Array.isArray(this._data)) {
      return 'objects';
    }
    if (typeof this._data === 'object') {
      return 'analysis';
    }
    return 'unknown';
  }

  get type() {
    return this._type;
  }
  get data() {
    return this._data;
  }

  getText() {
    return this._type === 'text' ? this._data : null;
  }

  getObjects() {
    return this._type === 'objects' ? this._data : null;
  }

  getAnalysis() {
    return this._type === 'analysis' ? this._data : null;
  }

  equals(other) {
    return (
      other instanceof VisionResult &&
      this._type === other._type &&
      JSON.stringify(this._data) === JSON.stringify(other._data)
    );
  }

  toJSON() {
    return {
      type: this._type,
      data: this._data
    };
  }

  static fromJSON(json) {
    return new VisionResult(json.data);
  }

  static createTextResult(text) {
    return new VisionResult(text);
  }

  static createObjectsResult(objects) {
    return new VisionResult(objects);
  }

  static createAnalysisResult(analysis) {
    return new VisionResult(analysis);
  }
}
