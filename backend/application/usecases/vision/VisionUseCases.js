import { DomainEvent } from '../../../domains/shared/events/DomainEvent.js';
import { EVENT_TYPES } from '../../../domains/shared/events/EventTypes.js';

export class VisionUseCases {
  constructor({ eventBus }) {
    this.eventBus = eventBus;
  }

  analyzeImage({ image, prompt }) {
    if (!image) {
      return {
        success: false,
        error: '必须提供图片数据（Base64格式）'
      };
    }

    const imageBuffer = Buffer.from(image, 'base64');
    const imageSizeKB = (imageBuffer.length / 1024).toFixed(2);

    let imageType = 'unknown';
    if (image.startsWith('/9j/')) {
      imageType = 'JPEG';
    } else if (image.startsWith('iVBORw0KGgo')) {
      imageType = 'PNG';
    } else if (image.startsWith('R0lGOD')) {
      imageType = 'GIF';
    }

    const description = `已接收一张 ${imageType} 格式的图片（${imageSizeKB}KB）。\n\n⚠️ 完整的图片识别功能开发中。\n\n请手动描述图片内容：`;

    this.eventBus.publish(new DomainEvent(EVENT_TYPES.VISION_ANALYZED, {
      imageType,
      imageSizeKB,
      hasPrompt: Boolean(prompt)
    }));

    return {
      success: true,
      data: {
        description,
        extractedText: null,
        imageInfo: {
          type: imageType,
          sizeKB: imageSizeKB
        }
      }
    };
  }
}

export default VisionUseCases;
