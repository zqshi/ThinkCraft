/**
 * Demo内存仓库实现
 */
import { IDemoRepository } from '../domain/demo.repository.js';
import { DemoId } from '../domain/value-objects/demo-id.vo.js';

export class DemoInMemoryRepository extends IDemoRepository {
  constructor() {
    super();
    this.demos = new Map();
  }

  async save(demo) {
    this.demos.set(demo.id.value, demo);
    return demo;
  }

  async findById(demoId) {
    const id = demoId instanceof DemoId ? demoId.value : demoId;
    return this.demos.get(id) || null;
  }

  async findByProjectId(projectId) {
    const results = [];
    for (const demo of this.demos.values()) {
      if (demo.projectId === projectId) {
        results.push(demo);
      }
    }
    return results;
  }

  async delete(demoId) {
    const id = demoId instanceof DemoId ? demoId.value : demoId;
    return this.demos.delete(id);
  }

  nextId() {
    return new DemoId(`demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  }

  async clear() {
    this.demos.clear();
  }

  async count() {
    return this.demos.size;
  }
}
