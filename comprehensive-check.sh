#!/bin/bash

echo "=========================================="
echo "全面检测旧逻辑与新逻辑的适配问题"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# 检查函数
check_pattern() {
    local pattern=$1
    local description=$2
    local should_exist=$3  # true 或 false

    echo "检查: $description"

    if [ "$should_exist" = "true" ]; then
        # 应该存在
        if grep -rq "$pattern" frontend/js/ --include="*.js"; then
            echo -e "${GREEN}✅ 通过${NC}"
        else
            echo -e "${RED}❌ 错误: 未找到预期的模式${NC}"
            ((ERRORS++))
        fi
    else
        # 不应该存在
        local matches=$(grep -rn "$pattern" frontend/js/ --include="*.js" 2>/dev/null)
        if [ -z "$matches" ]; then
            echo -e "${GREEN}✅ 通过${NC}"
        else
            echo -e "${RED}❌ 错误: 发现不应该存在的模式${NC}"
            echo "$matches"
            ((ERRORS++))
        fi
    fi
    echo ""
}

check_warning() {
    local pattern=$1
    local description=$2

    echo "警告检查: $description"

    local matches=$(grep -rn "$pattern" frontend/js/ --include="*.js" 2>/dev/null)
    if [ -z "$matches" ]; then
        echo -e "${GREEN}✅ 无警告${NC}"
    else
        echo -e "${YELLOW}⚠️  警告: 发现可能的问题${NC}"
        echo "$matches"
        ((WARNINGS++))
    fi
    echo ""
}

echo "=========================================="
echo "1. 检查错误的 StateManager 订阅"
echo "=========================================="
echo ""

check_pattern "stateManager\.subscribe.*updateGenerationButtonState" \
    "不应该有 stateManager.subscribe 调用 updateGenerationButtonState" \
    "false"

check_pattern "stateManager\.subscribe.*newState\.generation" \
    "不应该有 stateManager.subscribe 访问 newState.generation" \
    "false"

echo "=========================================="
echo "2. 检查函数参数匹配"
echo "=========================================="
echo ""

# 检查 updateGenerationButtonState 的定义
echo "检查 updateGenerationButtonState 函数签名..."
if grep -q "updateGenerationButtonState(type, state, chatId)" frontend/js/modules/state/report-button-manager.js; then
    echo -e "${GREEN}✅ 函数签名正确${NC}"
else
    echo -e "${RED}❌ 函数签名不正确${NC}"
    ((ERRORS++))
fi
echo ""

# 检查所有调用是否传递了3个参数
echo "检查所有 updateGenerationButtonState 调用..."
echo "找到的调用："
grep -rn "updateGenerationButtonState(" frontend/js/ --include="*.js" | \
    grep -v "function updateGenerationButtonState" | \
    grep -v "window.updateGenerationButtonState =" | \
    grep -v "updateGenerationButtonStateOld"

echo ""
echo "验证参数数量..."
# 查找可能只传1个或2个参数的调用
if grep -rn "updateGenerationButtonState([^,)]*)" frontend/js/ --include="*.js" | \
    grep -v "function updateGenerationButtonState" | \
    grep -v "window.updateGenerationButtonState =" | \
    grep -v "updateGenerationButtonStateOld" | \
    grep -q .; then
    echo -e "${RED}❌ 发现只传1个参数的调用${NC}"
    ((ERRORS++))
else
    echo -e "${GREEN}✅ 所有调用都传递了多个参数${NC}"
fi
echo ""

echo "=========================================="
echo "3. 检查状态管理一致性"
echo "=========================================="
echo ""

check_pattern "window\.stateManager\.getGenerationState" \
    "应该使用 StateManager.getGenerationState 获取状态" \
    "true"

check_warning "window\.state\.generation\[.*\]\.status" \
    "直接访问 window.state.generation 可能导致状态不一致"

echo "=========================================="
echo "4. 检查按钮状态管理"
echo "=========================================="
echo ""

check_pattern "resetGenerationButtons" \
    "应该有 resetGenerationButtons 函数" \
    "true"

check_pattern "window\.resetGenerationButtons = resetGenerationButtons" \
    "resetGenerationButtons 应该暴露到全局" \
    "true"

echo "=========================================="
echo "5. 检查报告生成器"
echo "=========================================="
echo ""

check_pattern "loadGenerationStatesForChat" \
    "应该有 loadGenerationStatesForChat 函数" \
    "true"

check_pattern "persistGenerationState" \
    "应该有 persistGenerationState 函数" \
    "true"

echo "=========================================="
echo "6. 检查可能的空值引用"
echo "=========================================="
echo ""

check_warning "\.status\b" \
    "访问 .status 属性（检查是否有空值检查）"

echo "=========================================="
echo "7. 检查模块依赖"
echo "=========================================="
echo ""

echo "检查关键模块是否正确初始化..."

# 检查 StateManager
if grep -q "window.stateManager = new StateManager()" frontend/js/core/state-manager.js; then
    echo -e "${GREEN}✅ StateManager 正确初始化${NC}"
else
    echo -e "${RED}❌ StateManager 初始化可能有问题${NC}"
    ((ERRORS++))
fi

# 检查 ReportButtonManager
if grep -q "window.reportButtonManager = new ReportButtonManager()" frontend/js/modules/state/report-button-manager.js; then
    echo -e "${GREEN}✅ ReportButtonManager 正确初始化${NC}"
else
    echo -e "${RED}❌ ReportButtonManager 初始化可能有问题${NC}"
    ((ERRORS++))
fi

echo ""

echo "=========================================="
echo "8. 检查全局函数桥接"
echo "=========================================="
echo ""

echo "检查全局函数是否正确暴露..."

# 检查关键全局函数
GLOBAL_FUNCTIONS=(
    "updateGenerationButtonState"
    "resetGenerationButtons"
    "loadGenerationStates"
    "loadGenerationStatesForChat"
)

for func in "${GLOBAL_FUNCTIONS[@]}"; do
    if grep -q "window\.$func = " frontend/js/ -r --include="*.js"; then
        echo -e "${GREEN}✅ $func 已暴露到全局${NC}"
    else
        echo -e "${YELLOW}⚠️  $func 可能未暴露到全局${NC}"
        ((WARNINGS++))
    fi
done

echo ""

echo "=========================================="
echo "检查结果汇总"
echo "=========================================="
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ 所有检查通过！没有发现错误或警告。${NC}"
    echo ""
    echo "系统状态良好，可以进行测试。"
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  发现 $WARNINGS 个警告，但没有严重错误。${NC}"
    echo ""
    echo "建议检查警告项，但系统应该可以正常运行。"
else
    echo -e "${RED}❌ 发现 $ERRORS 个错误和 $WARNINGS 个警告。${NC}"
    echo ""
    echo "请修复错误后再进行测试。"
    exit 1
fi

echo ""
echo "=========================================="
echo "下一步测试建议"
echo "=========================================="
echo ""
echo "1. 清除浏览器缓存和硬刷新"
echo "   - Ctrl+Shift+Delete 清除缓存"
echo "   - Ctrl+Shift+R 硬刷新页面"
echo ""
echo "2. 检查控制台错误"
echo "   - F12 打开开发者工具"
echo "   - 查看 Console 标签"
echo "   - 确认没有 TypeError 或其他错误"
echo ""
echo "3. 测试按钮功能"
echo "   - 点击'生成商业计划书'按钮"
echo "   - 点击'生成产品立项材料'按钮"
echo "   - 开始生成并观察按钮状态变化"
echo ""
echo "4. 测试状态恢复"
echo "   - 生成到50%时刷新页面"
echo "   - 确认按钮状态正确恢复"
echo "   - 点击按钮能看到进度弹窗"
echo ""
echo "5. 测试对话切换"
echo "   - 在对话A中开始生成"
echo "   - 切换到对话B"
echo "   - 切换回对话A"
echo "   - 确认按钮状态正确"
echo ""

exit 0
