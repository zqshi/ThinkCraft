import fs from 'fs';
import { DomainEvent } from '../../../domains/shared/events/DomainEvent.js';
import { EVENT_TYPES } from '../../../domains/shared/events/EventTypes.js';

export class DemoUseCases {
  constructor({ demoGenerationService, eventBus }) {
    this.demoGenerationService = demoGenerationService;
    this.eventBus = eventBus;
  }

  async generateDemo({ demoType, conversationHistory, features }) {
    if (!demoType || !conversationHistory) {
      return {
        success: false,
        error: '缺少必要参数: demoType和conversationHistory'
      };
    }

    const result = await this.demoGenerationService.generateDemoCode(
      demoType,
      conversationHistory,
      features || []
    );

    const demoId = `demo_${Date.now()}`;
    const htmlPath = this.demoGenerationService.saveDemoFile(demoId, result.code);
    const zipPath = await this.demoGenerationService.createZipArchive(demoId, htmlPath);

    this.eventBus.publish(new DomainEvent(EVENT_TYPES.DEMO_GENERATED, {
      demoId,
      demoType: result.demoType,
      tokens: result.tokens
    }));

    return {
      success: true,
      data: {
        demoId,
        demoType: result.demoType,
        htmlPath,
        zipPath,
        tokens: result.tokens,
        downloadUrl: `/api/demo/download/${demoId}`
      }
    };
  }

  getDemoTypes() {
    return this.demoGenerationService.getDemoTypes();
  }

  getDownloadPath({ demoId }) {
    const zipPath = `./temp/${demoId}.zip`;

    if (!fs.existsSync(zipPath)) {
      return {
        success: false,
        error: 'Demo文件不存在'
      };
    }

    return {
      success: true,
      path: zipPath
    };
  }
}

export default DemoUseCases;
