/**
 * 快速测试脚本 - 在浏览器控制台运行
 *
 * 使用方法：
 * 1. 打开应用页面（index.html）
 * 2. 按 F12 打开控制台
 * 3. 复制粘贴下面的代码并回车
 */

// 快速检查
console.log('🔍 检查新手引导清理状态...\n');

// 1. 检查模块是否加载
if (!window.onboardingManager) {
  console.error('❌ onboardingManager 未加载！');
  console.log('💡 解决方案：刷新页面或等待模块加载完成');
} else {
  console.log('✅ onboardingManager 已加载');

  // 2. 检查清理方法
  if (typeof window.onboardingManager.cleanupMockContent === 'function') {
    console.log('✅ cleanupMockContent 方法存在');
  } else {
    console.error('❌ cleanupMockContent 方法不存在');
  }
}

// 3. 检查示例内容
const panel = document.getElementById('projectPanel');
const title = document.getElementById('projectPanelTitle');
const body = document.getElementById('projectPanelBody');

if (title && title.textContent === '示例项目详情') {
  console.error('❌ 发现示例面板标题！');
  console.log('📍 位置: #projectPanelTitle');
} else {
  console.log('✅ 面板标题正常');
}

if (body && body.innerHTML.includes('用户洞察平台')) {
  console.error('❌ 发现示例面板内容！');
  console.log('📍 位置: #projectPanelBody');
} else {
  console.log('✅ 面板内容正常');
}

// 4. 检查示例卡片
const mockCards = document.querySelectorAll('.project-card.onboarding-mock, .project-card[data-project-id="onboarding-mock-project"]');
if (mockCards.length > 0) {
  console.error(`❌ 发现 ${mockCards.length} 个示例卡片！`);
  console.log('📍 卡片:', mockCards);
} else {
  console.log('✅ 没有示例卡片');
}

// 5. 提供手动清理命令
console.log('\n💡 如果发现问题，运行以下命令手动清理：');
console.log('window.onboardingManager.cleanupMockContent()');
