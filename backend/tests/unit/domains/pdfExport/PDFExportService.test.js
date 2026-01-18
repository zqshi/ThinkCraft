import { describe, it, expect, beforeEach } from '@jest/globals';
import fs from 'fs';
import { PDFExportService } from '../../../../domains/pdfExport/services/PDFExportService.js';

describe('PDFExportService', () => {
  let service;

  beforeEach(() => {
    service = new PDFExportService();
  });

  it('exports PDF with chapters', async () => {
    const result = await service.exportToPDF('Test Report', [
      { chapterId: 'chapter_1', title: 'Chapter 1', content: '# Title\nContent' }
    ]);

    expect(result.filepath).toContain('.pdf');
    expect(fs.existsSync(result.filepath)).toBe(true);
  });
});
