#!/bin/bash

# BusinessPlanGenerator 修复快速验证脚本

echo "======================================"
echo "BusinessPlanGenerator 修复快速验证"
echo "======================================"
echo ""

# 检查文件是否存在
echo "📁 检查关键文件..."
echo ""

files=(
    "frontend/js/core/state-manager.js"
    "frontend/js/modules/state/report-button-manager.js"
    "frontend/js/modules/business-plan-generator.js"
    "frontend/js/boot/init.js"
    "index.html"
)

all_exist=true
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file (缺失)"
        all_exist=false
    fi
done

echo ""

if [ "$all_exist" = false ]; then
    echo "❌ 部分文件缺失，请检查！"
    exit 1
fi

# 检查 StateManager 行数
echo "📊 检查 StateManager 文件大小..."
echo ""

state_manager_lines=$(wc -l < frontend/js/core/state-manager.js)
echo "  StateManager 行数: $state_manager_lines"

if [ "$state_manager_lines" -ge 900 ]; then
    echo "  ✅ 文件完整 (>= 900行)"
else
    echo "  ❌ 文件不完整 (< 900行)"
    echo "  预期: 925行"
    exit 1
fi

echo ""

# 检查关键方法是否存在
echo "🔍 检查 StateManager 关键方法..."
echo ""

methods=(
    "startGeneration"
    "getGenerationState"
    "completeGeneration"
    "errorGeneration"
    "resetGeneration"
    "updateProgress"
    "getConversationHistory"
)

all_methods_exist=true
for method in "${methods[@]}"; do
    if grep -q "$method" frontend/js/core/state-manager.js; then
        echo "  ✅ $method"
    else
        echo "  ❌ $method (缺失)"
        all_methods_exist=false
    fi
done

echo ""

if [ "$all_methods_exist" = false ]; then
    echo "❌ 部分方法缺失，请检查！"
    exit 1
fi

# 检查构造函数是否引用 window.state
echo "🔗 检查 StateManager 构造函数..."
echo ""

if grep -q "if (window.state)" frontend/js/core/state-manager.js; then
    echo "  ✅ 构造函数引用 window.state"
else
    echo "  ❌ 构造函数未引用 window.state"
    exit 1
fi

echo ""

# 检查 HTML 脚本加载顺序
echo "📜 检查 HTML 脚本加载顺序..."
echo ""

if grep -q "frontend/js/core/state-manager.js" index.html; then
    echo "  ✅ core/state-manager.js 已加载"
else
    echo "  ❌ core/state-manager.js 未加载"
    exit 1
fi

if grep -q "frontend/js/modules/state/report-button-manager.js" index.html; then
    echo "  ✅ report-button-manager.js 已加载"
else
    echo "  ⚠️  report-button-manager.js 未加载 (可能使用旧名称)"
fi

echo ""

# 检查 ReportButtonManager 类名
echo "🏷️  检查 ReportButtonManager 类名..."
echo ""

if grep -q "class ReportButtonManager" frontend/js/modules/state/report-button-manager.js; then
    echo "  ✅ 类名已更新为 ReportButtonManager"
else
    echo "  ❌ 类名仍为 StateManager"
    exit 1
fi

if grep -q "window.reportButtonManager" frontend/js/modules/state/report-button-manager.js; then
    echo "  ✅ 全局变量已更新为 window.reportButtonManager"
else
    echo "  ❌ 全局变量仍为 window.stateManager"
    exit 1
fi

echo ""

# 检查 BusinessPlanGenerator 中的 this.state 访问
echo "🎯 检查 BusinessPlanGenerator..."
echo ""

if grep -q "this.state.state.currentChat" frontend/js/modules/business-plan-generator.js; then
    echo "  ✅ BusinessPlanGenerator 使用 this.state.state.currentChat"
    echo "  ℹ️  这是正确的访问路径（this.state 是 StateManager 实例）"
else
    echo "  ⚠️  未找到 this.state.state.currentChat"
fi

echo ""

# 检查 init.js 中的初始化
echo "🚀 检查 init.js 初始化..."
echo ""

if grep -q "window.businessPlanGenerator = new BusinessPlanGenerator" frontend/js/boot/init.js; then
    echo "  ✅ BusinessPlanGenerator 初始化代码存在"
else
    echo "  ❌ BusinessPlanGenerator 初始化代码缺失"
    exit 1
fi

if grep -q "window.stateManager" frontend/js/boot/init.js; then
    echo "  ✅ 使用 window.stateManager"
else
    echo "  ⚠️  未找到 window.stateManager 引用"
fi

echo ""

# 最终总结
echo "======================================"
echo "✅ 所有检查通过！"
echo "======================================"
echo ""
echo "下一步："
echo "1. 在浏览器中打开 test-business-plan-fix.html"
echo "2. 运行自动化测试"
echo "3. 在主应用中测试生成商业计划书功能"
echo ""
echo "测试文件："
echo "  - test-state-manager-fix.html"
echo "  - test-business-plan-fix.html"
echo ""
echo "如果测试通过，可以提交代码："
echo "  git add ."
echo "  git commit -m 'fix: 修复 BusinessPlanGenerator 状态管理问题'"
echo ""
