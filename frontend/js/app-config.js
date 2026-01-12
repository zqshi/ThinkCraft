/**
 * ThinkCraft 应用配置文件
 * 包含所有常量、配置项和mock数据
 */

// 系统提示词配置
export const SYSTEM_PROMPT = window.SYSTEM_PROMPTS
    ? window.SYSTEM_PROMPTS[window.DEFAULT_PROMPT]
    : `你是ThinkCraft AI思维助手，专业的创意分析和验证工具。

你的使命：
- 帮助用户系统地分析和验证想法
- 提出建设性的问题和洞察
- 生成结构化的分析报告

交互风格：
- 友好但专业，循序渐进
- 基于用户反馈灵活调整
- 每次只问1-2个问题，避免信息过载

当用户提出创意时，你应该逐步引导他们思考：
1. 核心想法是什么？
2. 目标用户是谁？他们的痛点是什么？
3. 解决方案有什么独特之处？
4. 如何验证这个想法的可行性？
5. 有哪些关键指标可以衡量成功？

始终保持建设性态度，鼓励用户深度思考。`;

// 快速开始提示词
export const QUICK_START_PROMPTS = {
    '创业想法': '我有一个创业想法，想验证一下可行性',
    '产品功能': '我在思考一个产品功能，需要分析一下',
    '解决方案': '我遇到了一个问题，想找到最佳解决方案',
    '职业发展': '我在考虑职业发展方向，需要规划一下'
};

// Demo类型配置
export const DEMO_TYPES = {
    web: '网站应用',
    app: '移动应用',
    miniapp: '小程序',
    admin: '管理后台'
};

// Mock章节数据
export const MOCK_CHAPTERS = {
    business: {
        core: [
            { id: 1, title: '执行摘要', desc: '一页纸概述项目核心亮点、市场机会和融资需求', agent: '综合分析师', emoji: '🤖', time: 30 },
            { id: 2, title: '问题与市场分析', desc: '目标市场规模、用户痛点、市场机会分析', agent: '市场分析师', emoji: '📊', time: 45 },
            { id: 3, title: '解决方案与产品演进', desc: '产品定位、核心功能、技术优势、发展路线图', agent: '技术架构师', emoji: '⚙️', time: 40 },
            { id: 5, title: '商业模式与营收规划', desc: '收入模式、定价策略、营收预测', agent: '财务顾问', emoji: '💰', time: 50 },
            { id: 11, title: '愿景与路线图', desc: '长期愿景、发展路线图、退出策略', agent: '综合分析师', emoji: '🤖', time: 30 }
        ],
        optional: [
            { id: 4, title: '竞争格局与核心壁垒', desc: '竞品分析、差异化优势、竞争壁垒', agent: '市场分析师', emoji: '📊', time: 35 },
            { id: 6, title: '市场与增长策略', desc: '市场进入策略、获客渠道、增长规划', agent: '增长策略师', emoji: '📈', time: 40 },
            { id: 7, title: '团队架构', desc: '核心团队、关键岗位、人才需求', agent: '组织架构顾问', emoji: '👥', time: 30 },
            { id: 8, title: '财务预测', desc: '5年财务模型、收入/成本预测、盈利能力分析', agent: '财务顾问', emoji: '💰', time: 60 },
            { id: 9, title: '融资需求与资金使用', desc: '融资金额、资金用途、里程碑规划', agent: '财务顾问', emoji: '💰', time: 35 },
            { id: 10, title: '风险评估与应对', desc: '关键风险识别、应对措施、风险缓释策略', agent: '风险评估专家', emoji: '⚠️', time: 35 }
        ]
    },
    proposal: {
        core: [
            { id: 1, title: '项目摘要', desc: '项目背景、目标、核心价值', agent: '综合分析师', emoji: '🤖', time: 30 },
            { id: 2, title: '问题洞察', desc: '核心痛点、市场缺口分析', agent: '市场分析师', emoji: '📊', time: 40 },
            { id: 3, title: '解决方案（三层架构）', desc: '协议层、引擎层、网络层设计', agent: '技术架构师', emoji: '⚙️', time: 50 }
        ],
        optional: [
            { id: 4, title: '竞争与壁垒', desc: '竞争分析与技术壁垒', agent: '市场分析师', emoji: '📊', time: 35 },
            { id: 5, title: '商业模式', desc: '收入模式与定价策略', agent: '财务顾问', emoji: '💰', time: 45 },
            { id: 6, title: '市场与增长', desc: '市场策略与增长路径', agent: '增长策略师', emoji: '📈', time: 40 },
            { id: 7, title: '团队要求', desc: '团队构成与能力要求', agent: '组织架构顾问', emoji: '👥', time: 25 },
            { id: 8, title: '财务预测与里程碑', desc: '财务模型与关键里程碑', agent: '财务顾问', emoji: '💰', time: 55 },
            { id: 9, title: '风险与挑战', desc: '风险识别与应对策略', agent: '风险评估专家', emoji: '⚠️', time: 30 },
            { id: 10, title: '结论', desc: '总结与展望', agent: '综合分析师', emoji: '🤖', time: 20 }
        ]
    }
};

// Demo功能配置
export const DEMO_FEATURES = {
    web: {
        core: [
            { title: '首页展示', desc: '产品介绍、核心价值展示' },
            { title: '功能介绍页', desc: '详细功能说明和使用场景' },
            { title: '响应式布局', desc: '适配桌面端和移动端' }
        ],
        optional: [
            { title: '用户注册/登录', desc: '账号体系和权限管理' },
            { title: '数据可视化', desc: '图表展示和数据分析' },
            { title: '支付功能', desc: '在线支付和订单管理' },
            { title: '评论互动', desc: '用户评论和社交互动' }
        ]
    },
    app: {
        core: [
            { title: '启动页面', desc: '品牌展示和引导页' },
            { title: '主界面框架', desc: '底部导航和核心模块' },
            { title: '用户中心', desc: '个人信息和设置' }
        ],
        optional: [
            { title: '推送通知', desc: '消息推送和提醒' },
            { title: '离线功能', desc: '离线使用和数据同步' },
            { title: '分享功能', desc: '内容分享到社交平台' },
            { title: '地图定位', desc: '位置服务和地图展示' }
        ]
    },
    miniapp: {
        core: [
            { title: '首页', desc: '核心功能入口' },
            { title: '列表页', desc: '内容列表和筛选' },
            { title: '详情页', desc: '详细信息展示' }
        ],
        optional: [
            { title: '微信登录', desc: '一键授权登录' },
            { title: '微信支付', desc: '小程序内支付' },
            { title: '分享卡片', desc: '分享到微信好友' },
            { title: '订阅消息', desc: '订阅通知提醒' }
        ]
    },
    admin: {
        core: [
            { title: '登录页', desc: '管理员登录验证' },
            { title: '数据面板', desc: '核心数据统计展示' },
            { title: '侧边栏导航', desc: '功能模块导航' }
        ],
        optional: [
            { title: '用户管理', desc: '用户列表和权限管理' },
            { title: '内容管理', desc: '内容发布和审核' },
            { title: '数据分析', desc: '业务数据分析报表' },
            { title: '系统设置', desc: '系统配置和参数设置' }
        ]
    }
};

// Demo生成步骤
export const DEMO_GENERATION_STEPS = [
    { id: 'requirements', icon: '📋', title: '需求分析', desc: '分析创意需求并规划功能模块' },
    { id: 'architecture', icon: '🏗️', title: '架构设计', desc: '设计技术架构和数据结构' },
    { id: 'frontend', icon: '🎨', title: '前端开发', desc: '生成UI界面和交互逻辑' },
    { id: 'integration', icon: '🔧', title: '功能集成', desc: '集成各个模块和组件' },
    { id: 'testing', icon: '✅', title: '测试优化', desc: '测试功能并优化性能' }
];
