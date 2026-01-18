import { describe, it, expect, beforeEach } from '@jest/globals';
import { SalaryService } from '../../../../domains/agent/services/SalaryService.js';
import { AgentHireService } from '../../../../domains/agent/services/AgentHireService.js';

describe('SalaryService', () => {
  let hireService;
  let salaryService;

  beforeEach(() => {
    hireService = new AgentHireService();
    salaryService = new SalaryService(hireService);
  });

  it('calculates monthly cost for active agents', () => {
    hireService.hire('user_001', 'backend-dev');
    hireService.hire('user_001', 'designer');

    const summary = salaryService.calculateMonthlyCost('user_001');

    expect(summary.totalCost).toBeGreaterThan(0);
    expect(summary.agentCount).toBe(2);
    expect(summary.costByCategory.length).toBeGreaterThan(0);
  });

  it('excludes fired agents from monthly cost', () => {
    const hired = hireService.hire('user_001', 'backend-dev').agent;
    hireService.fire('user_001', hired.id);

    const summary = salaryService.calculateMonthlyCost('user_001');

    expect(summary.totalCost).toBe(0);
    expect(summary.agentCount).toBe(0);
  });

  it('forecasts cost for future months', () => {
    hireService.hire('user_001', 'backend-dev');

    const forecast = salaryService.forecastCost('user_001', 3);

    expect(forecast.projections).toHaveLength(3);
    expect(forecast.totalCostForPeriod).toBeGreaterThan(0);
  });

  it('recommends team within budget', () => {
    const result = salaryService.recommendTeamByBudget(20000, { minAgents: 1 });

    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.totalCost).toBeLessThanOrEqual(20000);
  });

  it('calculates ROI for an agent', () => {
    const agent = hireService.hire('user_001', 'backend-dev').agent;
    agent.tasksCompleted = 5;
    agent.performance = 80;

    const roi = salaryService.calculateAgentROI('user_001', agent.id);

    expect(roi).toBeDefined();
    expect(roi.agentId).toBe(agent.id);
  });
});
