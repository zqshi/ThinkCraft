/**
 * 验证修复脚本
 * 检查所有关键函数是否已定义
 */

console.log('=== ThinkCraft 修复验证 ===\n');

const checks = [
    // P0 修复 - UI Controller 关闭函数
    { name: 'closeChapterSelection', type: 'function', location: 'window' },
    { name: 'closeBusinessReport', type: 'function', location: 'window' },
    { name: 'closeProjectModal', type: 'function', location: 'window' },
    { name: 'closeAgentMarket', type: 'function', location: 'window' },

    // P0 修复 - State Manager 函数
    { name: 'getReportsForChat', type: 'function', location: 'window' },
    { name: 'updateButtonContent', type: 'function', location: 'window' },

    // P0 修复 - Report Viewer 函数
    { name: 'exportBusinessReport', type: 'function', location: 'window' },

    // P0 修复 - App Helpers 函数
    { name: 'handleLogout', type: 'function', location: 'window' },

    // P1 修复 - State 字段
    { name: 'generation', type: 'object', location: 'window.state' },

    // 全局对象
    { name: 'uiController', type: 'object', location: 'window' },
    { name: 'reportViewer', type: 'object', location: 'window' },
    { name: 'stateManager', type: 'object', location: 'window' },
];

let passed = 0;
let failed = 0;

checks.forEach(check => {
    const location = check.location === 'window' ? window : window.state;
    const exists = location && typeof location[check.name] !== 'undefined';
    const typeMatch = exists && typeof location[check.name] === check.type;

    if (exists && typeMatch) {
        console.log(`✅ ${check.location}.${check.name} (${check.type})`);
        passed++;
    } else if (exists) {
        console.log(`⚠️  ${check.location}.${check.name} 存在但类型不匹配 (期望: ${check.type}, 实际: ${typeof location[check.name]})`);
        failed++;
    } else {
        console.log(`❌ ${check.location}.${check.name} 未定义`);
        failed++;
    }
});

console.log(`\n=== 验证结果 ===`);
console.log(`通过: ${passed}/${checks.length}`);
console.log(`失败: ${failed}/${checks.length}`);

if (failed === 0) {
    console.log('\n🎉 所有修复验证通过！');
} else {
    console.log('\n⚠️  部分修复未通过验证，请检查上述失败项。');
}
