/**
 * 新手引导清理功能测试脚本
 * 在浏览器控制台中运行此脚本来测试清理功能
 *
 * 使用方法：
 * 1. 打开 index.html 或 OS.html
 * 2. 打开浏览器控制台（F12）
 * 3. 复制此文件内容并粘贴到控制台
 * 4. 按回车运行
 */

(function() {
  console.log('🧪 开始测试新手引导清理功能...\n');

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  function test(name, fn) {
    try {
      const result = fn();
      if (result.passed) {
        console.log(`✅ ${name}: ${result.message}`);
        results.passed++;
      } else {
        console.error(`❌ ${name}: ${result.message}`);
        results.failed++;
      }
      results.tests.push({ name, ...result });
    } catch (error) {
      console.error(`❌ ${name}: 测试执行失败 - ${error.message}`);
      results.failed++;
      results.tests.push({ name, passed: false, message: error.message });
    }
  }

  // 测试 1: 检查 onboardingManager 是否加载
  test('onboardingManager 模块加载', () => {
    if (window.onboardingManager) {
      return { passed: true, message: 'onboardingManager 已正确加载' };
    }
    return { passed: false, message: 'onboardingManager 未加载' };
  });

  // 测试 2: 检查 cleanupMockContent 方法是否存在
  test('cleanupMockContent 方法存在', () => {
    if (window.onboardingManager && typeof window.onboardingManager.cleanupMockContent === 'function') {
      return { passed: true, message: 'cleanupMockContent 方法存在' };
    }
    return { passed: false, message: 'cleanupMockContent 方法不存在' };
  });

  // 测试 3: 检查示例项目面板是否存在
  test('检查示例项目面板', () => {
    const panel = document.getElementById('projectPanel');
    const title = document.getElementById('projectPanelTitle');
    const body = document.getElementById('projectPanelBody');

    if (!panel) {
      return { passed: true, message: '项目面板元素不存在（正常）' };
    }

    const hasMockTitle = title && title.textContent === '示例项目详情';
    const hasMockBody = body && body.innerHTML.includes('用户洞察平台');

    if (hasMockTitle || hasMockBody) {
      return { passed: false, message: '发现残留的示例面板内容！' };
    }

    return { passed: true, message: '项目面板没有示例内容' };
  });

  // 测试 4: 检查示例项目卡片是否存在
  test('检查示例项目卡片', () => {
    const mockCards = document.querySelectorAll('.project-card.onboarding-mock, .project-card[data-project-id="onboarding-mock-project"]');

    if (mockCards.length > 0) {
      return { passed: false, message: `发现 ${mockCards.length} 个残留的示例卡片！` };
    }

    return { passed: true, message: '没有发现示例卡片' };
  });

  // 测试 5: 检查临时容器是否存在
  test('检查临时容器', () => {
    const tempElements = document.querySelectorAll('[data-onboarding-temp="true"]');

    if (tempElements.length > 0) {
      return { passed: false, message: `发现 ${tempElements.length} 个临时容器未清理` };
    }

    return { passed: true, message: '没有发现临时容器' };
  });

  // 测试 6: 模拟创建示例内容并测试清理
  test('清理功能测试', () => {
    if (!window.onboardingManager || typeof window.onboardingManager.cleanupMockContent !== 'function') {
      return { passed: false, message: 'cleanupMockContent 方法不可用' };
    }

    // 创建测试用的示例面板
    let testPanel = document.getElementById('projectPanel');
    let createdPanel = false;

    if (!testPanel) {
      testPanel = document.createElement('div');
      testPanel.id = 'projectPanel';
      testPanel.style.display = 'block';

      const testTitle = document.createElement('div');
      testTitle.id = 'projectPanelTitle';
      testTitle.textContent = '示例项目详情';

      const testBody = document.createElement('div');
      testBody.id = 'projectPanelBody';
      testBody.innerHTML = '<div>示例：用户洞察平台</div>';

      testPanel.appendChild(testTitle);
      testPanel.appendChild(testBody);
      document.body.appendChild(testPanel);
      createdPanel = true;
    }

    // 创建测试用的示例卡片
    const testCard = document.createElement('div');
    testCard.className = 'project-card onboarding-mock test-card';
    testCard.dataset.projectId = 'onboarding-mock-project';
    testCard.textContent = '测试卡片';
    document.body.appendChild(testCard);

    // 执行清理
    window.onboardingManager.cleanupMockContent();

    // 检查清理结果
    const panelAfter = document.getElementById('projectPanel');
    const titleAfter = document.getElementById('projectPanelTitle');
    const bodyAfter = document.getElementById('projectPanelBody');
    const cardAfter = document.querySelector('.project-card.test-card');

    // 面板应该被隐藏或内容被清空
    const panelCleaned = !panelAfter ||
                         panelAfter.style.display === 'none' ||
                         (titleAfter && titleAfter.textContent === '') ||
                         (bodyAfter && bodyAfter.innerHTML === '');

    // 卡片应该被删除
    const cardCleaned = !cardAfter;

    // 清理测试元素
    if (createdPanel && panelAfter) {
      panelAfter.remove();
    }
    if (cardAfter) {
      cardAfter.remove();
    }

    if (panelCleaned && cardCleaned) {
      return { passed: true, message: '清理功能正常工作' };
    }

    const details = [];
    if (!panelCleaned) details.push('面板未清理');
    if (!cardCleaned) details.push('卡片未清理');
    return { passed: false, message: `清理不完整 - ${details.join(', ')}` };
  });

  // 输出测试结果摘要
  console.log('\n' + '='.repeat(50));
  console.log(`📊 测试结果: ${results.passed} 通过, ${results.failed} 失败`);
  console.log('='.repeat(50));

  if (results.failed === 0) {
    console.log('🎉 所有测试通过！清理功能正常工作。');
  } else {
    console.log('⚠️ 部分测试失败，请检查上述错误信息。');
  }

  // 返回结果供进一步分析
  return results;
})();
