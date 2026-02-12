import { ReportUseCase } from '../report.use-case.js';
import { ReportInMemoryRepository } from '../../infrastructure/report-inmemory.repository.js';
import {
  CreateReportRequestDto,
  AddReportSectionRequestDto,
  GenerateReportRequestDto
} from '../report.dto.js';

class FakeReportGenerationService {
  async generateReport() {
    return [
      {
        title: 'Section 1',
        content: 'content',
        type: 'text',
        order: 1,
        metadata: {}
      }
    ];
  }

  extractKeyMetrics() {
    return { metric: 1 };
  }

  generateSummary() {
    return 'summary';
  }
}

describe('ReportUseCase', () => {
  let repository;
  let useCase;

  beforeEach(() => {
    repository = new ReportInMemoryRepository();
    useCase = new ReportUseCase(repository, new FakeReportGenerationService());
  });

  it('should create report and add/update/remove sections', async () => {
    const report = await useCase.createReport(
      new CreateReportRequestDto({
        projectId: 'project-1',
        type: 'business_plan',
        title: '报告',
        description: 'desc',
        metadata: {}
      })
    );

    const added = await useCase.addSection(
      report.id,
      new AddReportSectionRequestDto({
        title: 'S1',
        content: 'C1',
        type: 'text',
        order: 1,
        metadata: {}
      })
    );
    expect(added.report.sections.length).toBe(1);

    const updated = await useCase.updateSection(report.id, added.sectionId, { title: 'S1-1' });
    expect(updated.sections[0].title).toBe('S1-1');

    const removed = await useCase.removeSection(report.id, added.sectionId);
    expect(removed.sections.length).toBe(0);
  });

  it('should generate report and update metadata', async () => {
    const report = await useCase.createReport(
      new CreateReportRequestDto({
        projectId: 'project-2',
        type: 'business_plan',
        title: '生成报告',
        description: 'desc',
        metadata: {}
      })
    );

    const generated = await useCase.generateReport(
      new GenerateReportRequestDto({
        reportId: report.id,
        dataSource: { type: 'conversation', messages: [] },
        options: {}
      })
    );

    expect(generated.sections.length).toBe(1);
    expect(generated.metadata.summary).toBe('summary');
  });

  it('should archive and delete report', async () => {
    const report = await useCase.createReport(
      new CreateReportRequestDto({
        projectId: 'project-3',
        type: 'progress_report',
        title: '归档',
        description: '',
        metadata: {}
      })
    );

    await useCase.generateReport(
      new GenerateReportRequestDto({
        reportId: report.id,
        dataSource: { type: 'conversation', messages: [] },
        options: {}
      })
    );

    const archived = await useCase.archiveReport(report.id);
    expect(archived.status).toBe('archived');

    const deleted = await useCase.deleteReport(report.id);
    expect(deleted).toBe(true);
  });

  it('should return report formats and templates', async () => {
    const report = await useCase.createReport(
      new CreateReportRequestDto({
        projectId: 'project-4',
        type: 'analysis_report',
        title: 'formats',
        description: '',
        metadata: {}
      })
    );

    const formats = await useCase.getReportExportFormats(report.id);
    expect(formats.length).toBeGreaterThan(0);

    const templates = await useCase.getReportTemplates('analysis_report');
    expect(templates.length).toBeGreaterThan(0);
  });
});
