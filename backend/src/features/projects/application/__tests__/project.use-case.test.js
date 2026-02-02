import { ProjectUseCase } from '../project.use-case.js';
import {
  CreateProjectRequestDTO,
  UpdateProjectRequestDTO,
  CustomizeWorkflowRequestDTO,
  SearchProjectsRequestDTO
} from '../project.dto.js';
import { projectRepository } from '../../infrastructure/project-inmemory.repository.js';

describe('ProjectUseCase', () => {
  let useCase;

  beforeEach(() => {
    projectRepository.projects.clear();
    useCase = new ProjectUseCase();
  });

  it('should create and get project', async () => {
    const created = await useCase.createProject(
      new CreateProjectRequestDTO('idea-x', '新项目', 'development', 'user-1')
    );

    const fetched = await useCase.getProject(created.project.id, 'user-1');
    expect(fetched.name).toBe('新项目');
  });

  it('should update and list projects', async () => {
    const created = await useCase.createProject(
      new CreateProjectRequestDTO('idea-y', '项目Y', 'development', 'user-1')
    );

    const updated = await useCase.updateProject(
      created.project.id,
      new UpdateProjectRequestDTO({ name: '项目Y-更新' }),
      'user-1'
    );
    expect(updated.name).toBe('项目Y-更新');

    const list = await useCase.getAllProjects({}, 'user-1');
    expect(list.total).toBeGreaterThan(0);
  });

  it('should customize workflow', async () => {
    const created = await useCase.createProject(
      new CreateProjectRequestDTO('idea-z', '项目Z', 'development', 'user-1')
    );

    const workflow = await useCase.customizeWorkflow(
      created.project.id,
      new CustomizeWorkflowRequestDTO([{ id: 'design', name: '设计' }]),
      'user-1'
    );
    expect(workflow.workflow.stages.length).toBeGreaterThan(0);
  });

  it('should search projects', async () => {
    const created = await useCase.createProject(
      new CreateProjectRequestDTO('idea-up', '升级项目', 'development', 'user-1')
    );

    const results = await useCase.searchProjects(new SearchProjectsRequestDTO('升级项目'), 'user-1');
    expect(results.projects.length).toBeGreaterThan(0);
  });
});
