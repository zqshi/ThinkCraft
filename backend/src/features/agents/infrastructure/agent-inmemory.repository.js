import { IAgentRepository } from '../domain/agent.repository.js';

export class InMemoryAgentRepository extends IAgentRepository {
  constructor() {
    super();
    this._agents = new Map();
  }

  async findById(id) {
    return this._agents.get(id) || null;
  }

  async save(agent) {
    this._agents.set(agent.id, agent);
    return agent;
  }

  async findAll() {
    return Array.from(this._agents.values());
  }

  async findByType(type) {
    return (await this.findAll()).filter(agent => agent.type === type);
  }

  async findByStatus(status) {
    return (await this.findAll()).filter(agent => agent.status?.value === status);
  }

  async findByCapabilities(capabilities = []) {
    return (await this.findAll()).filter(agent =>
      capabilities.every(cap => (agent.capabilities || []).includes(cap))
    );
  }

  async delete(id) {
    return this._agents.delete(id);
  }

  async exists(id) {
    return this._agents.has(id);
  }

  async count() {
    return this._agents.size;
  }

  async findAvailable() {
    return (await this.findAll()).filter(agent => agent.status?.canExecuteTask);
  }
}
