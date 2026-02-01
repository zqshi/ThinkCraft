/**
 * 按钮状态生命周期修复验证脚本
 *
 * 使用方法：
 * 1. 在浏览器控制台中运行此脚本
 * 2. 按照提示进行测试
 */

(function() {
    console.log('='.repeat(60));
    console.log('按钮状态生命周期修复验证脚本');
    console.log('='.repeat(60));

    // 验证函数1: 检查按钮当前状态
    function checkButtonState(btnId, expectedStatus) {
        const btn = document.getElementById(btnId);
        if (!btn) {
            console.error(`❌ 找不到按钮: ${btnId}`);
            return false;
        }

        const actualStatus = btn.dataset.status;
        const classList = Array.from(btn.classList);
        const iconText = btn.querySelector('.btn-icon')?.textContent;
        const buttonText = btn.querySelector('.btn-text')?.textContent;

        console.log(`\n📊 按钮状态检查: ${btnId}`);
        console.log(`  期望状态: ${expectedStatus || '(未指定)'}`);
        console.log(`  实际状态: ${actualStatus}`);
        console.log(`  CSS类: ${classList.join(', ')}`);
        console.log(`  图标: ${iconText}`);
        console.log(`  文本: ${buttonText}`);
        console.log(`  chatId: ${btn.dataset.chatId}`);
        console.log(`  禁用: ${btn.disabled}`);

        if (expectedStatus && actualStatus !== expectedStatus) {
            console.error(`  ❌ 状态不匹配！期望 ${expectedStatus}，实际 ${actualStatus}`);
            return false;
        }

        if (!classList.includes(`btn-${actualStatus}`)) {
            console.error(`  ❌ CSS类不匹配！缺少 btn-${actualStatus}`);
            return false;
        }

        console.log(`  ✅ 状态正常`);
        return true;
    }

    // 验证函数2: 检查IndexedDB中的状态
    async function checkIndexedDBState(chatId, type) {
        if (!window.storageManager) {
            console.error('❌ StorageManager未初始化');
            return null;
        }

        const reports = await window.storageManager.getReportsByChatId(chatId);
        const report = reports?.find(r => r.type === type);

        console.log(`\n💾 IndexedDB状态检查: ${type}`);
        if (report) {
            console.log(`  状态: ${report.status}`);
            console.log(`  进度: ${JSON.stringify(report.progress)}`);
            console.log(`  chatId: ${report.chatId}`);
            console.log(`  有数据: ${!!report.data}`);
        } else {
            console.log(`  ❌ 未找到报告`);
        }

        return report;
    }

    // 验证函数3: 检查StateManager中的状态
    function checkStateManagerState(chatId, type) {
        if (!window.stateManager) {
            console.error('❌ StateManager未初始化');
            return null;
        }

        const genState = window.stateManager.getGenerationState(chatId);
        const state = genState?.[type];

        console.log(`\n🧠 StateManager状态检查: ${type}`);
        if (state) {
            console.log(`  状态: ${state.status}`);
            console.log(`  进度: ${JSON.stringify(state.progress)}`);
        } else {
            console.log(`  ❌ 未找到状态`);
        }

        return state;
    }

    // 测试场景1: 页面刷新恢复
    async function testScenario1() {
        console.log('\n' + '='.repeat(60));
        console.log('测试场景1: 页面刷新恢复');
        console.log('='.repeat(60));
        console.log('请按照以下步骤操作：');
        console.log('1. 开始生成商业计划书');
        console.log('2. 等待生成到50%');
        console.log('3. 硬刷新页面（Ctrl+Shift+R 或 Cmd+Shift+R）');
        console.log('4. 在控制台运行: testScenario1Verify()');
    }

    async function testScenario1Verify() {
        console.log('\n验证场景1结果...');

        const chatId = window.state?.currentChat;
        if (!chatId) {
            console.error('❌ 没有当前对话');
            return;
        }

        // 检查按钮状态
        const btnOk = checkButtonState('businessPlanBtn', 'generating');

        // 检查IndexedDB
        const dbReport = await checkIndexedDBState(chatId, 'business');

        // 检查StateManager
        const memState = checkStateManagerState(chatId, 'business');

        // 综合判断
        console.log('\n' + '='.repeat(60));
        if (btnOk && dbReport?.status === 'generating') {
            console.log('✅ 测试通过！按钮状态正确恢复');
        } else {
            console.log('❌ 测试失败！按钮状态未正确恢复');
            console.log('\n问题诊断：');
            if (!btnOk) {
                console.log('  - 按钮UI状态不正确');
            }
            if (dbReport?.status !== 'generating') {
                console.log('  - IndexedDB状态不正确');
            }
        }
        console.log('='.repeat(60));
    }

    // 测试场景2: 对话切换
    async function testScenario2() {
        console.log('\n' + '='.repeat(60));
        console.log('测试场景2: 对话切换');
        console.log('='.repeat(60));
        console.log('请按照以下步骤操作：');
        console.log('1. 在对话A中开始生成');
        console.log('2. 切换到对话B');
        console.log('3. 切换回对话A');
        console.log('4. 在控制台运行: testScenario2Verify()');
    }

    async function testScenario2Verify() {
        console.log('\n验证场景2结果...');
        await testScenario1Verify(); // 使用相同的验证逻辑
    }

    // 测试场景3: 生成完成后刷新
    async function testScenario3() {
        console.log('\n' + '='.repeat(60));
        console.log('测试场景3: 生成完成后刷新');
        console.log('='.repeat(60));
        console.log('请按照以下步骤操作：');
        console.log('1. 完成一个报告生成');
        console.log('2. 刷新页面');
        console.log('3. 在控制台运行: testScenario3Verify()');
    }

    async function testScenario3Verify() {
        console.log('\n验证场景3结果...');

        const chatId = window.state?.currentChat;
        if (!chatId) {
            console.error('❌ 没有当前对话');
            return;
        }

        // 检查按钮状态
        const btnOk = checkButtonState('businessPlanBtn', 'completed');

        // 检查IndexedDB
        const dbReport = await checkIndexedDBState(chatId, 'business');

        // 综合判断
        console.log('\n' + '='.repeat(60));
        if (btnOk && dbReport?.status === 'completed') {
            console.log('✅ 测试通过！按钮状态正确显示为已完成');
        } else {
            console.log('❌ 测试失败！按钮状态不正确');
        }
        console.log('='.repeat(60));
    }

    // 快速检查当前状态
    async function quickCheck() {
        console.log('\n' + '='.repeat(60));
        console.log('快速状态检查');
        console.log('='.repeat(60));

        const chatId = window.state?.currentChat;
        console.log(`\n当前对话ID: ${chatId || '(无)'}`);

        if (!chatId) {
            console.log('❌ 没有当前对话，无法检查');
            return;
        }

        // 检查两个按钮
        checkButtonState('businessPlanBtn');
        checkButtonState('proposalBtn');

        // 检查IndexedDB
        await checkIndexedDBState(chatId, 'business');
        await checkIndexedDBState(chatId, 'proposal');

        // 检查StateManager
        checkStateManagerState(chatId, 'business');
        checkStateManagerState(chatId, 'proposal');

        console.log('\n' + '='.repeat(60));
    }

    // 暴露到全局
    window.buttonStateTest = {
        checkButtonState,
        checkIndexedDBState,
        checkStateManagerState,
        testScenario1,
        testScenario1Verify,
        testScenario2,
        testScenario2Verify,
        testScenario3,
        testScenario3Verify,
        quickCheck
    };

    console.log('\n✅ 验证脚本已加载！');
    console.log('\n可用命令：');
    console.log('  buttonStateTest.quickCheck()           - 快速检查当前状态');
    console.log('  buttonStateTest.testScenario1()        - 测试场景1说明');
    console.log('  buttonStateTest.testScenario1Verify()  - 验证场景1');
    console.log('  buttonStateTest.testScenario2()        - 测试场景2说明');
    console.log('  buttonStateTest.testScenario2Verify()  - 验证场景2');
    console.log('  buttonStateTest.testScenario3()        - 测试场景3说明');
    console.log('  buttonStateTest.testScenario3Verify()  - 验证场景3');
    console.log('\n建议先运行: buttonStateTest.quickCheck()');
    console.log('='.repeat(60));
})();
