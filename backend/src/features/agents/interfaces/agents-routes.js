/**
 * 数字员工（Agent）管理系统 API
 * 支持Agent雇佣、任务分配、工作协同
 */
import express from 'express';
import { callDeepSeekAPI } from '../../../../config/deepseek.js';

const router = express.Router();

// Agent类型定义
const AGENT_TYPES = {
    // 产品类
    'product-manager': {
        id: 'product-manager',
        name: '产品经理',
        emoji: '📱',
        desc: '负责产品规划、需求分析、竞品研究',
        skills: ['需求分析', '产品规划', '竞品分析', '用户研究'],
        salary: 15000, // 月薪（虚拟货币）
        level: 'senior'
    },
    'designer': {
        id: 'designer',
        name: 'UI/UX设计师',
        emoji: '🎨',
        desc: '负责界面设计、用户体验优化',
        skills: ['界面设计', 'UX设计', '原型制作', '设计规范'],
        salary: 12000,
        level: 'mid'
    },

    // 技术类
    'frontend-dev': {
        id: 'frontend-dev',
        name: '前端工程师',
        emoji: '💻',
        desc: '负责前端开发、页面实现',
        skills: ['React', 'Vue', 'HTML/CSS', 'JavaScript'],
        salary: 18000,
        level: 'senior'
    },
    'backend-dev': {
        id: 'backend-dev',
        name: '后端工程师',
        emoji: '⚙️',
        desc: '负责后端开发、API设计、数据库',
        skills: ['Node.js', 'Python', 'SQL', 'API设计'],
        salary: 20000,
        level: 'senior'
    },

    // 运营类
    'marketing': {
        id: 'marketing',
        name: '营销专员',
        emoji: '📈',
        desc: '负责市场营销、用户增长',
        skills: ['内容营销', 'SEO/SEM', '社交媒体', '数据分析'],
        salary: 10000,
        level: 'mid'
    },
    'operations': {
        id: 'operations',
        name: '运营专员',
        emoji: '📊',
        desc: '负责产品运营、用户运营',
        skills: ['用户运营', '活动策划', '数据分析', '内容运营'],
        salary: 9000,
        level: 'mid'
    },

    // 商务类
    'sales': {
        id: 'sales',
        name: '销售经理',
        emoji: '💼',
        desc: '负责销售、商务谈判',
        skills: ['销售技巧', '商务谈判', '客户管理', '合同管理'],
        salary: 12000,
        level: 'mid'
    },
    'customer-service': {
        id: 'customer-service',
        name: '客服专员',
        emoji: '👔',
        desc: '负责客户支持、售后服务',
        skills: ['客户沟通', '问题解决', '服务意识', '情绪管理'],
        salary: 6000,
        level: 'junior'
    },

    // 财务法务类
    'accountant': {
        id: 'accountant',
        name: '财务专员',
        emoji: '💰',
        desc: '负责财务管理、成本控制',
        skills: ['财务分析', '预算管理', '成本控制', '报表制作'],
        salary: 11000,
        level: 'mid'
    },
    'legal': {
        id: 'legal',
        name: '法务顾问',
        emoji: '⚖️',
        desc: '负责合同审核、法律咨询',
        skills: ['合同审核', '法律咨询', '知识产权', '风险控制'],
        salary: 15000,
        level: 'senior'
    },

    // 战略类
    'consultant': {
        id: 'consultant',
        name: '商业顾问',
        emoji: '🎯',
        desc: '负责战略规划、商业分析',
        skills: ['战略规划', '商业分析', '市场洞察', '决策支持'],
        salary: 25000,
        level: 'expert'
    },
    'data-analyst': {
        id: 'data-analyst',
        name: '数据分析师',
        emoji: '📉',
        desc: '负责数据分析、商业智能',
        skills: ['数据分析', 'SQL', 'Python', '可视化'],
        salary: 16000,
        level: 'senior'
    }
};

// 用户雇佣的Agent存储（内存存储，生产环境应使用数据库）
const userAgents = new Map(); // userId -> agents[]

/**
 * Agent任务提示词模板
 */
const AGENT_TASK_PROMPTS = {
    'product-manager': `你是一名资深产品经理。{TASK}

请从产品角度给出专业建议：
- 需求分析：深入理解用户需求和业务目标
- 产品设计：功能规划、优先级排序
- 竞品分析：行业竞品研究
- 数据驱动：基于数据做产品决策

输出要求：
- 结构化、清晰
- 数据支撑
- 可执行性强`,

    'designer': `你是一名资深UI/UX设计师。{TASK}

请从设计角度给出专业建议：
- 用户体验：交互流程、易用性
- 视觉设计：配色、布局、风格
- 设计规范：组件库、设计系统
- 可访问性：无障碍设计

输出要求：
- 具体、可落地
- 符合设计趋势
- 考虑用户心理`,

    'frontend-dev': `你是一名资深前端工程师。{TASK}

请从前端技术角度给出专业建议：
- 技术选型：框架、工具选择
- 架构设计：组件设计、状态管理
- 性能优化：加载速度、渲染优化
- 代码规范：最佳实践、可维护性

输出要求：
- 技术准确
- 代码示例
- 性能考虑`,

    'marketing': `你是一名资深营销专员。{TASK}

请从市场营销角度给出专业建议：
- 营销策略：渠道选择、预算分配
- 内容营销：文案撰写、内容规划
- 用户增长：获客、转化、留存
- 数据分析：ROI分析、效果评估

输出要求：
- 策略明确
- 可执行性强
- 数据驱动`,

    'sales': `你是一名资深销售经理。{TASK}

请从销售角度给出专业建议：
- 销售策略：目标客户、销售流程
- 商务谈判：谈判技巧、合作模式
- 客户管理：客户关系、售后服务
- 业绩管理：目标设定、激励机制

输出要求：
- 策略实用
- 案例丰富
- 易于执行`,

    'consultant': `你是一名资深商业顾问。{TASK}

请从战略角度给出专业建议：
- 战略规划：长期目标、发展路径
- 商业模式：盈利模式、商业闭环
- 市场洞察：行业趋势、机会识别
- 风险评估：潜在风险、应对策略

输出要求：
- 战略高度
- 深度洞察
- 可落地性`
};

/**
 * GET /api/agents/types
 * 获取所有Agent类型
 */
router.get('/types', (req, res) => {
    const types = Object.values(AGENT_TYPES).map(agent => ({
        ...agent,
        available: true
    }));

    res.json({
        code: 0,
        data: {
            types,
            total: types.length
        }
    });
});

/**
 * POST /api/agents/hire
 * 雇佣Agent
 */
router.post('/hire', async (req, res, next) => {
    try {
        const { userId, agentType, nickname } = req.body;

        if (!userId || !agentType) {
            return res.status(400).json({
                code: -1,
                error: '缺少必要参数: userId 和 agentType'
            });
        }

        const agentConfig = AGENT_TYPES[agentType];
        if (!agentConfig) {
            return res.status(400).json({
                code: -1,
                error: '无效的Agent类型'
            });
        }

        // 创建Agent实例
        const agent = {
            id: `${userId}_${agentType}_${Date.now()}`,
            userId,
            type: agentType,
            nickname: nickname || agentConfig.name,
            ...agentConfig,
            hiredAt: new Date().toISOString(),
            status: 'idle', // idle, working, offline
            tasksCompleted: 0,
            performance: 100 // 绩效分数
        };

        // 保存到用户的Agent列表
        if (!userAgents.has(userId)) {
            userAgents.set(userId, []);
        }
        userAgents.get(userId).push(agent);

        res.json({
            code: 0,
            data: agent
        });

    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/agents/my/:userId
 * 获取用户的Agent团队
 */
router.get('/my/:userId', (req, res) => {
    const { userId } = req.params;

    const agents = userAgents.get(userId) || [];

    res.json({
        code: 0,
        data: {
            agents,
            total: agents.length,
            monthlyCost: agents.reduce((sum, a) => sum + a.salary, 0)
        }
    });
});

/**
 * POST /api/agents/assign-task
 * 分配任务给Agent
 */
router.post('/assign-task', async (req, res, next) => {
    try {
        const { userId, agentId, task, context } = req.body;

        if (!userId || !agentId || !task) {
            return res.status(400).json({
                code: -1,
                error: '缺少必要参数'
            });
        }

        // 查找Agent
        const agents = userAgents.get(userId) || [];
        const agent = agents.find(a => a.id === agentId);

        if (!agent) {
            return res.status(404).json({
                code: -1,
                error: 'Agent不存在'
            });
        }

        // 更新Agent状态
        agent.status = 'working';

        // 使用AI生成Agent的工作结果
        const promptTemplate = AGENT_TASK_PROMPTS[agent.type] || AGENT_TASK_PROMPTS['consultant'];
        const prompt = promptTemplate.replace('{TASK}', task);

        const fullPrompt = context
            ? `${prompt}\n\n背景信息：\n${context}`
            : prompt;

        const result = await callDeepSeekAPI(
            [{ role: 'user', content: fullPrompt }],
            null,
            {
                max_tokens: 2000,
                temperature: 0.7
            }
        );

        // 更新Agent数据
        agent.status = 'idle';
        agent.tasksCompleted++;

        const taskResult = {
            agentId: agent.id,
            agentName: agent.nickname,
            agentType: agent.type,
            task,
            result: result.content,
            tokens: result.usage.total_tokens,
            completedAt: new Date().toISOString()
        };

        res.json({
            code: 0,
            data: taskResult
        });

    } catch (error) {
        // 恢复Agent状态
        const agents = userAgents.get(req.body.userId) || [];
        const agent = agents.find(a => a.id === req.body.agentId);
        if (agent) {
            agent.status = 'idle';
        }

        next(error);
    }
});

/**
 * DELETE /api/agents/:userId/:agentId
 * 解雇Agent
 */
router.delete('/:userId/:agentId', (req, res) => {
    const { userId, agentId } = req.params;

    if (!userAgents.has(userId)) {
        return res.status(404).json({
            code: -1,
            error: '用户不存在'
        });
    }

    const agents = userAgents.get(userId);
    const index = agents.findIndex(a => a.id === agentId);

    if (index === -1) {
        return res.status(404).json({
            code: -1,
            error: 'Agent不存在'
        });
    }

    const agent = agents[index];
    agents.splice(index, 1);

    res.json({
        code: 0,
        message: `已解雇 ${agent.nickname}`
    });
});

/**
 * PUT /api/agents/:userId/:agentId
 * 更新Agent信息（如nickname）
 */
router.put('/:userId/:agentId', (req, res) => {
    const { userId, agentId } = req.params;
    const { nickname } = req.body;

    if (!userAgents.has(userId)) {
        return res.status(404).json({
            code: -1,
            error: '用户不存在'
        });
    }

    const agents = userAgents.get(userId);
    const agent = agents.find(a => a.id === agentId);

    if (!agent) {
        return res.status(404).json({
            code: -1,
            error: 'Agent不存在'
        });
    }

    if (nickname) {
        agent.nickname = nickname;
    }

    res.json({
        code: 0,
        data: agent
    });
});

/**
 * POST /api/agents/team-collaboration
 * 团队协同工作（多个Agent共同完成任务）
 */
router.post('/team-collaboration', async (req, res, next) => {
    try {
        const { userId, agentIds, task, context } = req.body;

        if (!userId || !agentIds || !Array.isArray(agentIds) || !task) {
            return res.status(400).json({
                code: -1,
                error: '缺少必要参数'
            });
        }

        const agents = userAgents.get(userId) || [];
        const selectedAgents = agents.filter(a => agentIds.includes(a.id));

        if (selectedAgents.length === 0) {
            return res.status(404).json({
                code: -1,
                error: '未找到指定的Agent'
            });
        }

        // 更新所有Agent状态
        selectedAgents.forEach(a => a.status = 'working');

        // 生成协同任务提示词
        const agentRoles = selectedAgents.map(a => `${a.emoji} ${a.nickname}（${a.name}）`).join('、');
        const prompt = `你现在是一个由多个专业人员组成的团队：${agentRoles}。

请团队协作完成以下任务：
${task}

${context ? `背景信息：\n${context}` : ''}

要求：
- 每个角色从自己的专业角度贡献意见
- 团队成员之间要有协作和讨论
- 输出综合性的解决方案

请用以下格式输出：
1. 【团队讨论】各角色的初步想法
2. 【方案整合】综合各方意见的最终方案
3. 【分工协作】明确每个角色的具体任务`;

        const result = await callDeepSeekAPI(
            [{ role: 'user', content: prompt }],
            null,
            {
                max_tokens: 3000,
                temperature: 0.8
            }
        );

        // 恢复Agent状态并更新任务数
        selectedAgents.forEach(a => {
            a.status = 'idle';
            a.tasksCompleted++;
        });

        const collaborationResult = {
            teamMembers: selectedAgents.map(a => ({
                id: a.id,
                name: a.nickname,
                type: a.type
            })),
            task,
            result: result.content,
            tokens: result.usage.total_tokens,
            completedAt: new Date().toISOString()
        };

        res.json({
            code: 0,
            data: collaborationResult
        });

    } catch (error) {
        // 恢复所有Agent状态
        const agents = userAgents.get(req.body.userId) || [];
        req.body.agentIds.forEach(id => {
            const agent = agents.find(a => a.id === id);
            if (agent) agent.status = 'idle';
        });

        next(error);
    }
});

export default router;
