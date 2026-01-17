/**
 * AgentHireService单元测试
 * TDD测试驱动开发
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AgentHireService } from '../../../../domains/agent/services/AgentHireService.js';

describe('AgentHireService', () => {
  let hireService;
  let mockRepository;

  beforeEach(() => {
    // Mock Repository
    mockRepository = {
      saveAgent: jest.fn(),
      getUserAgents: jest.fn(() => []),
      saveUserAgents: jest.fn(),
      getStats: jest.fn(() => ({ totalAgents: 0, totalUsers: 0 }))
    };

    hireService = new AgentHireService(mockRepository);
  });

  describe('hire', () => {
    it('should hire an agent successfully', () => {
      const result = hireService.hire('user_001', 'backend-dev', 'My Dev Agent');

      expect(result.success).toBe(true);
      expect(result.agent).toBeDefined();
      expect(result.agent.userId).toBe('user_001');
      expect(result.agent.nickname).toBe('My Dev Agent');
      expect(mockRepository.saveAgent).toHaveBeenCalled();
    });

    it('should reject invalid agent type', () => {
      const result = hireService.hire('user_001', 'invalid_type');

      expect(result.success).toBe(false);
      expect(result.error).toContain('无效的Agent类型');
    });

    it('should reject empty userId', () => {
      const result = hireService.hire('', 'backend-dev');

      expect(result.success).toBe(false);
      expect(result.error).toContain('用户ID不能为空');
    });

    it('should reject empty agentTypeId', () => {
      const result = hireService.hire('user_001', '');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Agent类型ID不能为空');
    });

    it('should reject hire when team is full', () => {
      // Mock 50个已雇佣的agents（达到上限）
      mockRepository.getUserAgents = jest.fn(() =>
        Array(50).fill().map((_, i) => ({
          id: `agent_${i}`,
          status: 'active'
        }))
      );

      const result = hireService.hire('user_001', 'backend-dev');

      expect(result.success).toBe(false);
      expect(result.error).toContain('团队人数已达上限');
    });

    it('should use default nickname if not provided', () => {
      const result = hireService.hire('user_001', 'backend-dev');

      expect(result.success).toBe(true);
      expect(result.agent.nickname).toBeDefined();
      // 默认昵称应该包含Agent类型名称
      expect(result.agent.nickname).toContain('后端工程师');
    });

    it('should generate unique agent ID', () => {
      const result1 = hireService.hire('user_001', 'backend-dev');
      const result2 = hireService.hire('user_001', 'backend-dev');

      expect(result1.agent.id).not.toBe(result2.agent.id);
    });

    it('should set agent status to IDLE initially', () => {
      const result = hireService.hire('user_001', 'backend-dev');

      expect(result.success).toBe(true);
      expect(result.agent.status).toBe('idle');
    });
  });

  describe('getUserAgents', () => {
    it('should return empty array for new user', () => {
      const agents = hireService.getUserAgents('user_001');
      expect(agents).toEqual([]);
    });

    it('should return user agents from repository', () => {
      const mockAgents = [
        { id: 'agent_001', userId: 'user_001', name: 'Agent 1', status: 'idle' }
      ];
      mockRepository.getUserAgents = jest.fn(() => mockAgents);

      const agents = hireService.getUserAgents('user_001');
      expect(agents).toHaveLength(1);
      expect(agents[0].id).toBe('agent_001');
    });

    it('should cache agents in memory', () => {
      const mockAgents = [{ id: 'agent_001' }];
      mockRepository.getUserAgents = jest.fn(() => mockAgents);

      // 第一次调用
      hireService.getUserAgents('user_001');
      // 第二次调用
      hireService.getUserAgents('user_001');

      // Repository只应该被调用一次（第一次），后续使用缓存
      expect(mockRepository.getUserAgents).toHaveBeenCalledTimes(1);
    });
  });

  describe('fire', () => {
    it('should fire an agent successfully', () => {
      // 先雇佣一个agent
      const hireResult = hireService.hire('user_001', 'backend-dev');
      const agentId = hireResult.agent.id;

      // 解雇agent
      const fireResult = hireService.fire('user_001', agentId);

      expect(fireResult.success).toBe(true);
      expect(fireResult.agent.firedAt).toBeDefined();
    });

    it('should reject firing non-existent agent', () => {
      const result = hireService.fire('user_001', 'non_existent_agent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Agent不存在');
    });

    it('should reject firing already fired agent', () => {
      // 雇佣并解雇
      const hireResult = hireService.hire('user_001', 'backend-dev');
      const agentId = hireResult.agent.id;
      hireService.fire('user_001', agentId);

      // 尝试再次解雇
      const secondFireResult = hireService.fire('user_001', agentId);

      expect(secondFireResult.success).toBe(false);
      expect(secondFireResult.error).toContain('已经被解雇');
    });
  });

  describe('getTeamStats', () => {
    it('should return correct team statistics', () => {
      // 雇佣多个agents
      hireService.hire('user_001', 'backend-dev');
      hireService.hire('user_001', 'designer');
      hireService.hire('user_001', 'backend-dev');

      const stats = hireService.getTeamStats('user_001');

      expect(stats.total).toBe(3);
      expect(stats.active).toBe(3);
      expect(stats.fired).toBe(0);
      expect(stats.byCategory).toBeDefined();
    });

    it('should calculate monthly cost correctly', () => {
      hireService.hire('user_001', 'backend-dev');
      hireService.hire('user_001', 'designer');

      const stats = hireService.getTeamStats('user_001');

      expect(stats.monthlyCost).toBeGreaterThan(0);
      expect(typeof stats.monthlyCost).toBe('number');
    });

    it('should not count fired agents in active stats', () => {
      const hire1 = hireService.hire('user_001', 'backend-dev');
      hireService.hire('user_001', 'designer');

      // 解雇一个
      hireService.fire('user_001', hire1.agent.id);

      const stats = hireService.getTeamStats('user_001');

      expect(stats.total).toBe(2);
      expect(stats.active).toBe(1);
      expect(stats.fired).toBe(1);
    });
  });

  describe('batchHire', () => {
    it('should hire multiple agents successfully', () => {
      const hireRequests = [
        { agentTypeId: 'backend-dev', nickname: 'Dev 1' },
        { agentTypeId: 'designer', nickname: 'Designer 1' },
        { agentTypeId: 'product-manager', nickname: 'PM 1' }
      ];

      const result = hireService.batchHire('user_001', hireRequests);

      expect(result.success).toBe(true);
      expect(result.agents).toHaveLength(3);
      expect(result.errors).toHaveLength(0);
    });

    it('should continue hiring even if one fails', () => {
      const hireRequests = [
        { agentTypeId: 'backend-dev', nickname: 'Dev 1' },
        { agentTypeId: 'invalid_type', nickname: 'Invalid' }, // 这个会失败
        { agentTypeId: 'designer', nickname: 'Designer 1' }
      ];

      const result = hireService.batchHire('user_001', hireRequests);

      expect(result.success).toBe(false); // 有失败所以整体success=false
      expect(result.agents).toHaveLength(2); // 但成功雇佣了2个
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].agentTypeId).toBe('invalid_type');
    });
  });

  describe('getAvailableAgentTypes', () => {
    it('should return all available agent types', () => {
      const types = hireService.getAvailableAgentTypes();

      expect(types).toBeDefined();
      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThan(0);
      expect(types[0]).toHaveProperty('id');
      expect(types[0]).toHaveProperty('name');
      expect(types[0]).toHaveProperty('salary');
    });
  });

  describe('recommendAgentsByBudget', () => {
    it('should recommend agents within budget', () => {
      const budget = 20000;
      const recommended = hireService.recommendAgentsByBudget(budget);

      expect(Array.isArray(recommended)).toBe(true);
      recommended.forEach(agent => {
        expect(agent.salary).toBeLessThanOrEqual(budget);
      });
    });

    it('should return empty array if budget is too low', () => {
      const budget = 1000;
      const recommended = hireService.recommendAgentsByBudget(budget);

      expect(recommended).toEqual([]);
    });

    it('should sort recommendations by value (cost-effectiveness)', () => {
      const budget = 50000;
      const recommended = hireService.recommendAgentsByBudget(budget);

      if (recommended.length > 1) {
        // 验证排序：第一个的score应该 >= 第二个的score
        expect(recommended[0].score).toBeGreaterThanOrEqual(recommended[1].score);
      }
    });
  });

  describe('searchAgentsBySkill', () => {
    it('should find agents by skill keyword', () => {
      const results = hireService.searchAgentsBySkill('JavaScript');

      expect(Array.isArray(results)).toBe(true);
      if (results.length > 0) {
        const hasJavaScriptSkill = results.some(agent =>
          agent.skills && agent.skills.includes('JavaScript')
        );
        expect(hasJavaScriptSkill).toBe(true);
      }
    });

    it('should return empty array for non-existent skill', () => {
      const results = hireService.searchAgentsBySkill('NonExistentSkill12345');

      expect(results).toEqual([]);
    });
  });
});
