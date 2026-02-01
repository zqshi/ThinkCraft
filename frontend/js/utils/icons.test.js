/**
 * icons.js 单元测试
 * 测试图标系统功能
 */

// 加载icons.js到全局环境
beforeAll(async () => {
  await import('./icons.js');
});

describe('icons.js - 图标系统', () => {
  describe('getDefaultIconSvg', () => {
    test('应该生成默认图标SVG', () => {
      const svg = getDefaultIconSvg();
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg).toContain('empty-icon');
      expect(svg).toContain('width="48"');
      expect(svg).toContain('height="48"');
    });

    test('应该支持自定义大小', () => {
      const svg = getDefaultIconSvg(64);
      expect(svg).toContain('width="64"');
      expect(svg).toContain('height="64"');
    });

    test('应该支持自定义类名', () => {
      const svg = getDefaultIconSvg(48, 'custom-icon');
      expect(svg).toContain('custom-icon');
      expect(svg).not.toContain('empty-icon');
    });

    test('应该包含路径元素', () => {
      const svg = getDefaultIconSvg();
      expect(svg).toContain('<path');
      expect(svg).toContain('stroke-linecap="round"');
      expect(svg).toContain('stroke-linejoin="round"');
    });
  });

  describe('buildIconSvg', () => {
    test('应该构建SVG图标', () => {
      const paths = ['M10 10 L20 20', 'M20 10 L10 20'];
      const svg = buildIconSvg(paths, 32, 'test-icon');

      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg).toContain('test-icon');
      expect(svg).toContain('width="32"');
      expect(svg).toContain('height="32"');
    });

    test('应该包含所有路径', () => {
      const paths = ['M10 10 L20 20', 'M20 10 L10 20'];
      const svg = buildIconSvg(paths, 32, 'test-icon');

      expect(svg).toContain('M10 10 L20 20');
      expect(svg).toContain('M20 10 L10 20');
    });

    test('应该处理单个路径', () => {
      const paths = ['M10 10 L20 20'];
      const svg = buildIconSvg(paths, 32, 'test-icon');

      expect(svg).toContain('M10 10 L20 20');
      expect(svg.match(/<path/g).length).toBe(1);
    });

    test('应该处理多个路径', () => {
      const paths = ['path1', 'path2', 'path3'];
      const svg = buildIconSvg(paths, 32, 'test-icon');

      expect(svg.match(/<path/g).length).toBe(3);
    });

    test('应该处理空路径数组', () => {
      const paths = [];
      const svg = buildIconSvg(paths, 32, 'test-icon');

      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    });
  });

  describe('resolveAgentIconKey', () => {
    test('应该识别市场相关关键词', () => {
      expect(resolveAgentIconKey('市场分析')).toBe('chart');
      expect(resolveAgentIconKey('📊数据')).toBe('chart');
    });

    test('应该识别技术相关关键词', () => {
      expect(resolveAgentIconKey('技术架构')).toBe('cog');
      expect(resolveAgentIconKey('工程师')).toBe('cog');
      expect(resolveAgentIconKey('⚙️系统')).toBe('cog');
      expect(resolveAgentIconKey('👨‍💻开发')).toBe('cog');
    });

    test('应该识别增长相关关键词', () => {
      expect(resolveAgentIconKey('增长策略')).toBe('trend');
      expect(resolveAgentIconKey('营销推广')).toBe('trend');
      expect(resolveAgentIconKey('📈业绩')).toBe('trend');
    });

    test('应该识别组织相关关键词', () => {
      expect(resolveAgentIconKey('团队管理')).toBe('users');
      expect(resolveAgentIconKey('👥人员')).toBe('users');
      // 注意: "组织架构"包含"架构"会匹配到技术类
      expect(resolveAgentIconKey('组织')).toBe('users');
    });

    test('应该识别财务相关关键词', () => {
      expect(resolveAgentIconKey('财务分析')).toBe('dollar');
      expect(resolveAgentIconKey('资金管理')).toBe('dollar');
      expect(resolveAgentIconKey('💰预算')).toBe('dollar');
    });

    test('应该识别风险相关关键词', () => {
      expect(resolveAgentIconKey('风险评估')).toBe('shield');
      expect(resolveAgentIconKey('⚠️警告')).toBe('shield');
    });

    test('应该识别产品相关关键词', () => {
      expect(resolveAgentIconKey('产品设计')).toBe('lightbulb');
      expect(resolveAgentIconKey('创意策划')).toBe('lightbulb');
      expect(resolveAgentIconKey('💡想法')).toBe('lightbulb');
    });

    test('应该识别项目相关关键词', () => {
      expect(resolveAgentIconKey('项目管理')).toBe('clipboard');
      expect(resolveAgentIconKey('📋计划')).toBe('clipboard');
    });

    test('应该识别文档相关关键词', () => {
      expect(resolveAgentIconKey('文档编写')).toBe('document');
      expect(resolveAgentIconKey('📎附件')).toBe('document');
    });

    test('应该识别综合相关关键词', () => {
      expect(resolveAgentIconKey('综合分析')).toBe('default');
      expect(resolveAgentIconKey('🤖AI')).toBe('default');
    });

    test('应该处理未知关键词', () => {
      expect(resolveAgentIconKey('未知类型')).toBe('default');
      expect(resolveAgentIconKey('')).toBe('default');
      expect(resolveAgentIconKey(null)).toBe('default');
      expect(resolveAgentIconKey(undefined)).toBe('default');
    });

    test('应该处理数字输入', () => {
      expect(resolveAgentIconKey(123)).toBe('default');
    });

    test('应该处理对象输入', () => {
      expect(resolveAgentIconKey({})).toBe('default');
    });
  });

  describe('getAgentIconSvg', () => {
    test('应该生成Agent图标SVG', () => {
      const svg = getAgentIconSvg('市场');
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg).toContain('agent-avatar-icon');
    });

    test('应该使用默认大小28', () => {
      const svg = getAgentIconSvg('市场');
      expect(svg).toContain('width="28"');
      expect(svg).toContain('height="28"');
    });

    test('应该支持自定义大小', () => {
      const svg = getAgentIconSvg('市场', 48);
      expect(svg).toContain('width="48"');
      expect(svg).toContain('height="48"');
    });

    test('应该支持自定义类名', () => {
      const svg = getAgentIconSvg('市场', 28, 'custom-avatar');
      expect(svg).toContain('custom-avatar');
      expect(svg).not.toContain('agent-avatar-icon');
    });

    test('应该为不同类型生成不同图标', () => {
      const marketSvg = getAgentIconSvg('市场');
      const techSvg = getAgentIconSvg('技术');

      expect(marketSvg).not.toBe(techSvg);
    });

    test('应该处理未知类型', () => {
      const svg = getAgentIconSvg('未知类型');
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    });

    test('应该处理空输入', () => {
      const svg = getAgentIconSvg('');
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    });

    test('应该处理null输入', () => {
      const svg = getAgentIconSvg(null);
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    });

    test('应该生成有效的SVG结构', () => {
      const svg = getAgentIconSvg('技术');

      // 检查SVG基本结构
      expect(svg).toContain('viewBox="0 0 24 24"');
      expect(svg).toContain('fill="none"');
      expect(svg).toContain('stroke="currentColor"');

      // 检查路径元素
      expect(svg).toContain('<path');
      expect(svg).toContain('stroke-linecap="round"');
      expect(svg).toContain('stroke-linejoin="round"');
      expect(svg).toContain('stroke-width="2"');
    });

    test('应该为所有图标类型生成有效SVG', () => {
      const types = [
        '市场', '技术', '增长', '组织', '财务',
        '风险', '产品', '项目', '文档', '综合'
      ];

      types.forEach(type => {
        const svg = getAgentIconSvg(type);
        expect(svg).toContain('<svg');
        expect(svg).toContain('</svg>');
        expect(svg).toContain('<path');
      });
    });
  });

  describe('图标系统集成测试', () => {
    test('应该能够生成完整的图标系统', () => {
      // 测试默认图标
      const defaultIcon = getDefaultIconSvg();
      expect(defaultIcon).toBeTruthy();

      // 测试Agent图标
      const agentIcon = getAgentIconSvg('技术');
      expect(agentIcon).toBeTruthy();

      // 测试自定义构建
      const customIcon = buildIconSvg(['M10 10 L20 20'], 32, 'custom');
      expect(customIcon).toBeTruthy();
    });

    test('应该保持一致的SVG格式', () => {
      const icons = [
        getDefaultIconSvg(),
        getAgentIconSvg('市场'),
        getAgentIconSvg('技术'),
        buildIconSvg(['M10 10'], 32, 'test')
      ];

      icons.forEach(icon => {
        expect(icon).toContain('<svg');
        expect(icon).toContain('</svg>');
        expect(icon).toContain('viewBox="0 0 24 24"');
      });
    });
  });
});
