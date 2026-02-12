import fs from 'fs/promises';
import path from 'path';

export const pdfGenerationInfrastructureMethods = {
  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create temp directory:', error);
    }
  },

  async cleanup(exportId) {
    try {
      const exportDir = path.join(this.tempDir, exportId);
      await fs.rm(exportDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to cleanup export directory:', error);
    }
  }
};
