/**
 * Demo类型定义（值对象）
 * 包含4种Demo类型及其生成提示词
 */

export const DEMO_TYPES = {
  web: {
    id: 'web',
    name: 'Web应用',
    description: '完整的Web应用Demo，使用HTML/CSS/JS',
    emoji: '🌐',
    estimatedTime: 90
  },
  app: {
    id: 'app',
    name: '移动App',
    description: '移动App原型，模拟iOS/Android界面',
    emoji: '📱',
    estimatedTime: 80
  },
  miniapp: {
    id: 'miniapp',
    name: '小程序',
    description: '微信小程序风格的Demo',
    emoji: '🔷',
    estimatedTime: 75
  },
  admin: {
    id: 'admin',
    name: '管理后台',
    description: '后台管理系统界面',
    emoji: '⚙️',
    estimatedTime: 95
  }
};

export const CODE_GENERATION_PROMPTS = {
  web: `你是一个专业的前端开发工程师。基于用户的创意对话，生成一个完整的、可运行的Web应用Demo。

要求：
1. 使用纯HTML + CSS + JavaScript（不需要构建工具）
2. 代码要完整、可直接在浏览器中打开运行
3. UI要美观、现代化
4. 响应式设计
5. 包含基本的交互功能和数据展示
6. 代码要有注释

创意对话内容：
{CONVERSATION}

产品类型：{DEMO_TYPE}
核心功能：{FEATURES}

请生成完整的HTML代码（单文件）。直接输出代码，不要有任何解释文字。`,

  app: `你是一个移动应用UI工程师。基于用户的创意，生成一个移动App的HTML原型Demo。

要求：
1. 使用HTML + CSS模拟移动App界面
2. 采用移动优先设计，屏幕宽度375px
3. 包含底部导航栏、页面切换
4. UI风格现代、简洁
5. 代码可直接在浏览器运行

创意对话内容：
{CONVERSATION}

核心功能：{FEATURES}

请生成完整的HTML代码。直接输出代码，不要有任何解释文字。`,

  miniapp: `你是一个小程序开发工程师。基于用户的创意，生成一个微信小程序风格的HTML Demo。

要求：
1. 使用HTML + CSS模拟小程序界面
2. 采用微信小程序的UI组件风格（WeUI）
3. 宽度固定为375px
4. 代码可直接在浏览器运行

创意对话内容：
{CONVERSATION}

核心功能：{FEATURES}

请生成完整的HTML代码。直接输出代码，不要有任何解释文字。`,

  admin: `你是一个后台管理系统开发工程师。基于用户的创意，生成一个管理后台的HTML Demo。

要求：
1. 使用HTML + CSS + JavaScript构建管理后台界面
2. 包含侧边栏导航、顶部导航栏、数据面板
3. 使用表格、图表展示数据
4. 现代化的设计风格
5. 响应式设计
6. 可以使用Chart.js等CDN库

创意对话内容：
{CONVERSATION}

核心功能：{FEATURES}

请生成完整的HTML代码。直接输出代码，不要有任何解释文字。`
};

export class DemoType {
  static getAll() {
    return Object.values(DEMO_TYPES);
  }

  static getById(id) {
    return DEMO_TYPES[id] || null;
  }

  static exists(id) {
    return !!DEMO_TYPES[id];
  }

  static getPrompt(demoType) {
    return CODE_GENERATION_PROMPTS[demoType] || null;
  }
}

export default DemoType;
