#!/bin/bash

echo "=========================================="
echo "验证按钮状态修复"
echo "=========================================="
echo ""

echo "1. 检查是否还有错误的 updateGenerationButtonState 调用（只传1个参数）..."
echo ""

# 检查 init.js
echo "检查 init.js..."
if grep -n "stateManager\.subscribe" frontend/js/boot/init.js; then
    echo "❌ 错误：init.js 中仍有 stateManager.subscribe 调用"
    exit 1
else
    echo "✅ init.js 已清理"
fi

# 检查 app.js
echo ""
echo "检查 app.js..."
if grep -n "stateManager\.subscribe" frontend/js/app.js; then
    echo "❌ 错误：app.js 中仍有 stateManager.subscribe 调用"
    exit 1
else
    echo "✅ app.js 已清理"
fi

echo ""
echo "2. 检查所有 updateGenerationButtonState 调用是否传递了正确的参数..."
echo ""

# 查找所有调用
echo "所有 updateGenerationButtonState 调用："
grep -rn "updateGenerationButtonState(" frontend/js/ --include="*.js" | grep -v "function updateGenerationButtonState" | grep -v "window.updateGenerationButtonState ="

echo ""
echo "3. 验证关键文件..."
echo ""

# 验证 report-button-manager.js
echo "检查 report-button-manager.js..."
if grep -q "updateGenerationButtonState(type, state, chatId)" frontend/js/modules/state/report-button-manager.js; then
    echo "✅ report-button-manager.js 函数签名正确"
else
    echo "❌ 错误：report-button-manager.js 函数签名不正确"
    exit 1
fi

# 验证 report-generator.js
echo ""
echo "检查 report-generator.js..."
if grep -q "updateGenerationButtonState(type," frontend/js/modules/report/report-generator.js; then
    echo "✅ report-generator.js 调用正确"
else
    echo "❌ 错误：report-generator.js 调用不正确"
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ 所有检查通过！"
echo "=========================================="
echo ""
echo "下一步："
echo "1. 清除浏览器缓存（Ctrl+Shift+Delete）"
echo "2. 硬刷新页面（Ctrl+Shift+R）"
echo "3. 打开控制台，检查是否还有错误"
echo "4. 测试按钮功能："
echo "   - 点击'生成商业计划书'按钮"
echo "   - 点击'生成产品立项材料'按钮"
echo "   - 刷新页面，检查按钮状态是否正确恢复"
echo ""
