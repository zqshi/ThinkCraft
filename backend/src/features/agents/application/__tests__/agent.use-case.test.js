import { AgentUseCase } from '../agent.use-case.js';
import { CreateAgentDTO, UpdateAgentDTO } from '../agent.dto.js';
import { InMemoryAgentRepository } from '../../infrastructure/agent-inmemory.repository.js';

describe('AgentUseCase', () => {
  let useCase;

  beforeEach(() => {
    useCase = new AgentUseCase(new InMemoryAgentRepository());
  });

  it('should create, get, update and list agents', async () => {
    const created = await useCase.createAgent(
      new CreateAgentDTO({
        name: 'Agent A',
        description: 'desc',
        type: 'analyst',
        capabilities: ['analysis'],
        config: {}
      })
    );

    const fetched = await useCase.getAgent(created.id);
    expect(fetched.name).toBe('Agent A');

    const updated = await useCase.updateAgent(
      created.id,
      new UpdateAgentDTO({
        name: 'Agent B'
      })
    );
    expect(updated.name).toBe('Agent B');

    const list = await useCase.getAgentList(1, 10);
    expect(list.totalCount).toBeGreaterThan(0);
  });

  it('should activate, deactivate and delete agents', async () => {
    const created = await useCase.createAgent(
      new CreateAgentDTO({
        name: 'Agent C',
        description: 'desc',
        type: 'analyst',
        capabilities: ['analysis'],
        config: {}
      })
    );

    const activated = await useCase.activateAgent(created.id);
    expect(activated.status).toBe('active');

    const deactivated = await useCase.deactivateAgent(created.id);
    expect(deactivated.status).toBe('inactive');

    const deleted = await useCase.deleteAgent(created.id);
    expect(deleted).toBe(true);
  });
});
