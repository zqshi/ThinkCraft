/**
 * 视觉任务类型值对象
 */
export class VisionTaskType {
  static IMAGE_ANALYSIS = new VisionTaskType('IMAGE_ANALYSIS');
  static OCR = new VisionTaskType('OCR');
  static OBJECT_DETECTION = new VisionTaskType('OBJECT_DETECTION');
  static FACE_DETECTION = new VisionTaskType('FACE_DETECTION');
  static TEXT_DETECTION = new VisionTaskType('TEXT_DETECTION');
  static SCENE_DETECTION = new VisionTaskType('SCENE_DETECTION');
  static COLOR_ANALYSIS = new VisionTaskType('COLOR_ANALYSIS');

  constructor(value) {
    this._value = value;
    this.validate();
  }

  static fromString(value) {
    const type = this[value.toUpperCase()];
    if (!type) {
      throw new Error(`无效的视觉任务类型: ${value}`);
    }
    return type;
  }

  validate() {
    const validTypes = [
      'IMAGE_ANALYSIS',
      'OCR',
      'OBJECT_DETECTION',
      'FACE_DETECTION',
      'TEXT_DETECTION',
      'SCENE_DETECTION',
      'COLOR_ANALYSIS'
    ];
    if (!validTypes.includes(this._value)) {
      throw new Error(`无效的视觉任务类型: ${this._value}`);
    }
  }

  get value() {
    return this._value;
  }

  getDisplayName() {
    const names = {
      IMAGE_ANALYSIS: '图片分析',
      OCR: '文字识别',
      OBJECT_DETECTION: '物体检测',
      FACE_DETECTION: '人脸检测',
      TEXT_DETECTION: '文本检测',
      SCENE_DETECTION: '场景检测',
      COLOR_ANALYSIS: '色彩分析'
    };
    return names[this._value] || this._value;
  }

  getIcon() {
    const icons = {
      IMAGE_ANALYSIS: '🖼️',
      OCR: '📝',
      OBJECT_DETECTION: '🎯',
      FACE_DETECTION: '👤',
      TEXT_DETECTION: '📄',
      SCENE_DETECTION: '🌄',
      COLOR_ANALYSIS: '🎨'
    };
    return icons[this._value] || '🖼️';
  }

  equals(other) {
    return other instanceof VisionTaskType && this._value === other._value;
  }

  toString() {
    return this._value;
  }
  toJSON() {
    return this._value;
  }
}
