import { describe, it, expect } from '@jest/globals';
import { CollaborationPlan, CollaborationStatus } from '../../../../domains/collaboration/models/CollaborationPlan.js';
import { CapabilityAnalysis } from '../../../../domains/collaboration/models/valueObjects/CapabilityAnalysis.js';

describe('CollaborationPlan', () => {
  it('creates plan with valid goal', () => {
    const plan = CollaborationPlan.create('user_001', 'Launch a new SaaS product');

    expect(plan).toBeDefined();
    expect(plan.userId).toBe('user_001');
    expect(plan.status).toBe(CollaborationStatus.DRAFT);
  });

  it('rejects short goals', () => {
    expect(() => CollaborationPlan.create('user_001', 'Too short')).toThrow('协同目标至少需要10个字符');
  });

  it('sets capability analysis and updates status', () => {
    const plan = CollaborationPlan.create('user_001', 'Launch a new SaaS product');
    const analysis = new CapabilityAnalysis({
      requiredSkills: ['需求分析'],
      requiredRoles: [{ typeId: 'product-manager', reason: '需要需求分析', priority: 'high' }],
      currentAgents: [],
      skillGaps: [],
      roleGaps: [],
      isSufficient: true,
      confidenceScore: 80,
      warnings: []
    });

    plan.setCapabilityAnalysis(analysis);

    expect(plan.status).toBe(CollaborationStatus.READY);
    expect(plan.capabilityAnalysis).toBe(analysis);
  });
});
