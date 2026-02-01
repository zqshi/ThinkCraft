/**
 * 直接在浏览器控制台运行此代码来测试清理功能
 */

console.log('🧪 开始测试清理功能...\n');

// 1. 检查模块是否加载
if (!window.onboardingManager) {
  console.error('❌ onboardingManager 未加载');
  throw new Error('请等待页面完全加载后再测试');
}

console.log('✅ onboardingManager 已加载');

// 2. 创建测试元素
console.log('📝 创建测试元素...');

// 创建面板
const testPanel = document.createElement('div');
testPanel.id = 'projectPanel';
testPanel.style.display = 'block';
testPanel.style.position = 'fixed';
testPanel.style.top = '50px';
testPanel.style.right = '50px';
testPanel.style.background = 'white';
testPanel.style.border = '2px solid red';
testPanel.style.padding = '20px';
testPanel.style.zIndex = '9999';

const testTitle = document.createElement('div');
testTitle.id = 'projectPanelTitle';
testTitle.textContent = '示例项目详情';
testTitle.style.fontWeight = 'bold';
testTitle.style.marginBottom = '10px';

const testBody = document.createElement('div');
testBody.id = 'projectPanelBody';
testBody.innerHTML = '<div>示例：用户洞察平台<br>需求澄清<br>方案设计</div>';

testPanel.appendChild(testTitle);
testPanel.appendChild(testBody);
document.body.appendChild(testPanel);

// 创建卡片
const testCard = document.createElement('div');
testCard.className = 'project-card onboarding-mock';
testCard.dataset.projectId = 'onboarding-mock-project';
testCard.textContent = '测试示例卡片';
testCard.style.position = 'fixed';
testCard.style.top = '50px';
testCard.style.left = '50px';
testCard.style.background = 'yellow';
testCard.style.border = '2px solid red';
testCard.style.padding = '20px';
testCard.style.zIndex = '9999';
document.body.appendChild(testCard);

console.log('✅ 测试元素已创建（红框标记）');
console.log('   - 面板位置: 右上角');
console.log('   - 卡片位置: 左上角');

// 3. 等待 2 秒让用户看到测试元素
console.log('\n⏳ 等待 2 秒后执行清理...');

setTimeout(() => {
  console.log('\n🧹 执行清理...');
  window.onboardingManager.cleanupMockContent();

  // 4. 检查清理结果
  setTimeout(() => {
    console.log('\n🔍 检查清理结果...');

    const panelAfter = document.getElementById('projectPanel');
    const titleAfter = document.getElementById('projectPanelTitle');
    const bodyAfter = document.getElementById('projectPanelBody');
    const cardAfter = document.querySelector('.project-card.onboarding-mock');

    let allPassed = true;

    // 检查面板
    if (panelAfter) {
      const isHidden = panelAfter.style.display === 'none';
      const titleCleared = titleAfter && titleAfter.textContent === '';
      const bodyCleared = bodyAfter && bodyAfter.innerHTML === '';

      if (isHidden || titleCleared || bodyCleared) {
        console.log('✅ 面板已清理');
        console.log(`   - 隐藏: ${isHidden ? '是' : '否'}`);
        console.log(`   - 标题清空: ${titleCleared ? '是' : '否'}`);
        console.log(`   - 内容清空: ${bodyCleared ? '是' : '否'}`);
      } else {
        console.error('❌ 面板未清理');
        console.log(`   - display: ${panelAfter.style.display}`);
        console.log(`   - 标题: ${titleAfter?.textContent}`);
        console.log(`   - 内容: ${bodyAfter?.innerHTML.substring(0, 50)}...`);
        allPassed = false;
      }
    } else {
      console.log('✅ 面板已删除');
    }

    // 检查卡片
    if (cardAfter) {
      console.error('❌ 卡片未删除');
      console.log('   卡片仍然存在:', cardAfter);
      allPassed = false;
    } else {
      console.log('✅ 卡片已删除');
    }

    // 清理残留的测试元素
    if (panelAfter) panelAfter.remove();
    if (cardAfter) cardAfter.remove();

    // 最终结果
    console.log('\n' + '='.repeat(50));
    if (allPassed) {
      console.log('🎉 测试通过！清理功能正常工作。');
    } else {
      console.error('❌ 测试失败！清理功能有问题。');
    }
    console.log('='.repeat(50));
  }, 100);
}, 2000);

console.log('\n💡 提示: 你应该能在页面上看到红框标记的测试元素');
console.log('   它们会在 2 秒后自动清理');
