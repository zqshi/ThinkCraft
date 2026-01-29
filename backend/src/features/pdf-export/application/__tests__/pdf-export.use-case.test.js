import { PdfExportUseCase } from '../pdf-export.use-case.js';
import { ExportInMemoryRepository } from '../../infrastructure/export-inmemory.repository.js';
import { CreateExportRequestDto } from '../pdf-export.dto.js';

class FakePdfGenerationService {
  async generatePdf() {
    return { filePath: '/tmp/report.pdf', fileSize: 1234 };
  }
}

describe('PdfExportUseCase', () => {
  let repository;
  let useCase;

  beforeEach(() => {
    repository = new ExportInMemoryRepository();
    useCase = new PdfExportUseCase(repository, new FakePdfGenerationService());
  });

  it('should create export and process pdf', async () => {
    const exportTask = await useCase.createExport(
      new CreateExportRequestDto({
        projectId: 'project-1',
        format: 'pdf',
        title: 'Report',
        content: JSON.stringify([{ title: 'S1', content: 'C1' }]),
        options: {}
      })
    );

    const processed = await useCase.processExport(exportTask.id);
    expect(processed.status).toBe('completed');
    expect(processed.filePath).toBe('/tmp/report.pdf');
  });

  it('should process html/markdown exports and download', async () => {
    const htmlExport = await useCase.createExport(
      new CreateExportRequestDto({
        projectId: 'project-2',
        format: 'html',
        title: 'HTML',
        content: JSON.stringify([{ title: 'S1', content: 'C1' }]),
        options: {}
      })
    );
    const htmlProcessed = await useCase.processExport(htmlExport.id);
    expect(htmlProcessed.filePath.endsWith('.html')).toBe(true);

    const mdExport = await useCase.createExport(
      new CreateExportRequestDto({
        projectId: 'project-3',
        format: 'markdown',
        title: 'MD',
        content: JSON.stringify([{ title: 'S1', content: 'C1' }]),
        options: {}
      })
    );
    const mdProcessed = await useCase.processExport(mdExport.id);
    expect(mdProcessed.filePath.endsWith('.md')).toBe(true);

    const download = await useCase.downloadExport(mdProcessed.id);
    expect(download.fileName).toContain('.markdown');
  });

  it('should delete export', async () => {
    const exportTask = await useCase.createExport(
      new CreateExportRequestDto({
        projectId: 'project-4',
        format: 'pdf',
        title: 'Del',
        content: JSON.stringify([{ title: 'S1', content: 'C1' }]),
        options: {}
      })
    );

    const deleted = await useCase.deleteExport(exportTask.id);
    expect(deleted).toBe(true);
  });
});
