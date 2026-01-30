// 章节配置验证脚本

const businessConfig = {
  core: [
    { id: 'executive_summary', title: '执行摘要' },
    { id: 'market_analysis', title: '市场分析' },
    { id: 'solution', title: '解决方案' },
    { id: 'business_model', title: '商业模式' }
  ],
  optional: [
    { id: 'competitive_landscape', title: '竞争格局' },
    { id: 'marketing_strategy', title: '市场策略' },
    { id: 'team_structure', title: '团队架构' },
    { id: 'financial_projection', title: '财务预测' },
    { id: 'risk_assessment', title: '风险评估' },
    { id: 'implementation_plan', title: '实施计划' },
    { id: 'appendix', title: '附录' }
  ]
};

const proposalConfig = {
  core: [
    { id: 'project_summary', title: '项目摘要' },
    { id: 'problem_insight', title: '问题洞察' },
    { id: 'product_solution', title: '产品方案' },
    { id: 'implementation_path', title: '实施路径' }
  ],
  optional: [
    { id: 'competitive_analysis', title: '竞品分析' },
    { id: 'budget_planning', title: '预算规划' },
    { id: 'risk_control', title: '风险控制' }
  ]
};

console.log('=== 商业计划书配置 ===');
console.log('核心章节数:', businessConfig.core.length);
console.log('可选章节数:', businessConfig.optional.length);
console.log('总章节数:', businessConfig.core.length + businessConfig.optional.length);
console.log('核心章节:', businessConfig.core.map(ch => ch.title).join(', '));
console.log('可选章节:', businessConfig.optional.map(ch => ch.title).join(', '));

console.log('\n=== 产品立项材料配置 ===');
console.log('核心章节数:', proposalConfig.core.length);
console.log('可选章节数:', proposalConfig.optional.length);
console.log('总章节数:', proposalConfig.core.length + proposalConfig.optional.length);
console.log('核心章节:', proposalConfig.core.map(ch => ch.title).join(', '));
console.log('可选章节:', proposalConfig.optional.map(ch => ch.title).join(', '));

// 检查是否有重复的章节ID
const businessIds = [...businessConfig.core, ...businessConfig.optional].map(ch => ch.id);
const proposalIds = [...proposalConfig.core, ...proposalConfig.optional].map(ch => ch.id);

const duplicates = businessIds.filter(id => proposalIds.includes(id));

console.log('\n=== 验证结果 ===');
if (duplicates.length > 0) {
  console.log('⚠️  发现重复的章节ID:', duplicates);
} else {
  console.log('✅ 没有重复的章节ID');
}

console.log('商业计划书章节ID:', businessIds);
console.log('产品立项材料章节ID:', proposalIds);

const isSame = JSON.stringify(businessIds.sort()) === JSON.stringify(proposalIds.sort());
if (isSame) {
  console.log('❌ 错误：配置相同！');
} else {
  console.log('✅ 正确：配置不同');
}
