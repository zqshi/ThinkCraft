import { jest } from '@jest/globals';

const mockProvider = {
  name: 'mock-ocr',
  extractText: jest.fn(async () => ({
    toJSON: () => ({ text: 'hello', confidence: 0.9 })
  }))
};

jest.unstable_mockModule('../../infrastructure/vision-provider-factory.js', () => ({
  VisionProviderFactory: {
    createOCRProvider: () => mockProvider
  }
}));

const { VisionService } = await import('../vision-service.js');

const tinyPngBase64 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2P4//8/AwAI/AL+JQ3p3wAAAABJRU5ErkJggg==';

describe('VisionService', () => {
  it('should analyze image with OCR', async () => {
    const service = new VisionService();
    const result = await service.analyzeImage(tinyPngBase64, { enableOCR: true });
    expect(result.success).toBe(true);
    expect(result.data.ocrResult.text).toBe('hello');
  });

  it('should extract text from image', async () => {
    const service = new VisionService();
    const result = await service.extractText(tinyPngBase64, {});
    expect(result.success).toBe(true);
    expect(result.data.text).toBe('hello');
  });
});
