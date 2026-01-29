import { jest } from '@jest/globals';

jest.unstable_mockModule('../../../../config/deepseek.js', () => ({
  callDeepSeekAPI: jest.fn(async () => ({
    content: 'Generated content',
    usage: { total_tokens: 1000 }
  })),
  getCostStats: jest.fn(() => ({ totalTokens: 1000, totalCost: 0.01 }))
}));

const { BusinessPlanUseCase } = await import('../business-plan.use-case.js');
const { BusinessPlanInMemoryRepository } = await import(
  '../../infrastructure/business-plan-inmemory.repository.js'
);
const {
  CreateBusinessPlanDto,
  GenerateChapterDto,
  GenerateBatchChaptersDto
} = await import('../business-plan.dto.js');

describe('BusinessPlanUseCase', () => {
  let repository;
  let useCase;

  beforeEach(() => {
    repository = new BusinessPlanInMemoryRepository();
    useCase = new BusinessPlanUseCase(repository);
  });

  it('should create and get business plan', async () => {
    const created = await useCase.createBusinessPlan(
      new CreateBusinessPlanDto({
        title: 'BP',
        projectId: 'project-1',
        generatedBy: 'user-1'
      })
    );

    const fetched = await useCase.getBusinessPlan(created.id);
    expect(fetched.title).toBe('BP');
  });

  it('should generate single chapter', async () => {
    const created = await useCase.createBusinessPlan(
      new CreateBusinessPlanDto({
        title: 'BP2',
        projectId: 'project-2',
        generatedBy: 'user-2'
      })
    );

    const result = await useCase.generateChapter(
      created.id,
      new GenerateChapterDto({
        chapterId: 'executive_summary',
        conversationHistory: [{ role: 'user', content: 'idea' }]
      })
    );

    expect(result.chapter.content).toBe('Generated content');
    expect(result.businessPlan.chapters.length).toBe(1);
  });

  it('should generate batch chapters and complete plan', async () => {
    const created = await useCase.createBusinessPlan(
      new CreateBusinessPlanDto({
        title: 'BP3',
        projectId: 'project-3',
        generatedBy: 'user-3'
      })
    );

    const result = await useCase.generateBatchChapters(
      created.id,
      new GenerateBatchChaptersDto({
        chapterIds: ['executive_summary', 'market_analysis'],
        conversationHistory: [{ role: 'user', content: 'idea' }]
      })
    );

    expect(result.chapters.length).toBe(2);

    const completed = await useCase.completeBusinessPlan(created.id);
    expect(completed.status).toBe('completed');
  });
});
