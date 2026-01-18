/**
 * Demo生成服务（领域服务）
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';
import { callDeepSeekAPI } from '../../../config/deepseek.js';
import { DemoType, CODE_GENERATION_PROMPTS } from '../models/valueObjects/DemoType.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEMO_DIR = path.join(__dirname, '../../../../demos');
const TEMP_DIR = path.join(__dirname, '../../../../temp');

// 确保目录存在
[DEMO_DIR, TEMP_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

export class DemoGenerationService {
  formatConversation(conversationHistory) {
    return conversationHistory
      .map(msg => `${msg.role === 'user' ? '用户' : 'AI'}: ${msg.content}`)
      .join('\n\n');
  }

  async generateDemoCode(demoType, conversationHistory, features = []) {
    if (!DemoType.exists(demoType)) {
      throw new Error(`无效的Demo类型: ${demoType}`);
    }

    const promptTemplate = DemoType.getPrompt(demoType);
    const conversation = this.formatConversation(conversationHistory);
    const featureText = features.join(', ');

    const prompt = promptTemplate
      .replace('{CONVERSATION}', conversation)
      .replace('{DEMO_TYPE}', demoType)
      .replace('{FEATURES}', featureText);

    console.log(`[DemoService] 生成${demoType} Demo代码`);

    const result = await callDeepSeekAPI(
      [{ role: 'user', content: prompt }],
      null,
      { max_tokens: 3000, temperature: 0.7 }
    );

    return {
      demoType,
      code: result.content,
      tokens: result.usage.total_tokens,
      timestamp: Date.now()
    };
  }

  saveDemoFile(demoId, code) {
    const filepath = path.join(DEMO_DIR, `${demoId}.html`);
    fs.writeFileSync(filepath, code, 'utf-8');
    return filepath;
  }

  createZipArchive(demoId, htmlPath) {
    return new Promise((resolve, reject) => {
      const zipPath = path.join(TEMP_DIR, `${demoId}.zip`);
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => resolve(zipPath));
      archive.on('error', reject);

      archive.pipe(output);
      archive.file(htmlPath, { name: 'index.html' });
      archive.finalize();
    });
  }

  getDemoTypes() {
    return DemoType.getAll();
  }
}

export const demoGenerationService = new DemoGenerationService();
export default DemoGenerationService;
