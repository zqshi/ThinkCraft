#!/bin/bash

# 修复验证脚本
# 验证所有未定义函数是否已正确修复

echo "=========================================="
echo "HTML 未定义函数修复验证"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 计数器
total=0
passed=0
failed=0

# 检查函数
check_function() {
    local func_name=$1
    local file_path=$2
    local description=$3

    total=$((total + 1))

    echo -n "[$total] 检查 $func_name ... "

    if grep -q "function $func_name\|const $func_name\|window\.$func_name" "$file_path" 2>/dev/null; then
        echo -e "${GREEN}✓ 通过${NC} - $description"
        passed=$((passed + 1))
        return 0
    else
        echo -e "${RED}✗ 失败${NC} - $description"
        failed=$((failed + 1))
        return 1
    fi
}

# 检查文件是否存在
check_file() {
    local file_path=$1
    local description=$2

    total=$((total + 1))

    echo -n "[$total] 检查文件 $file_path ... "

    if [ -f "$file_path" ]; then
        echo -e "${GREEN}✓ 存在${NC} - $description"
        passed=$((passed + 1))
        return 0
    else
        echo -e "${RED}✗ 不存在${NC} - $description"
        failed=$((failed + 1))
        return 1
    fi
}

echo "1. 检查全局桥接文件"
echo "----------------------------------------"
check_file "frontend/js/utils/global-bridges.js" "全局桥接文件"
check_function "startGeneration" "frontend/js/utils/global-bridges.js" "开始生成商业计划书"
check_function "cancelGeneration" "frontend/js/utils/global-bridges.js" "取消生成"
check_function "adjustBusinessReportChapters" "frontend/js/utils/global-bridges.js" "调整章节"
check_function "regenerateBusinessReport" "frontend/js/utils/global-bridges.js" "重新生成报告"
check_function "shareBusinessReport" "frontend/js/utils/global-bridges.js" "分享报告"
check_function "showAddMember" "frontend/js/utils/global-bridges.js" "显示添加成员"
check_function "switchAddMemberTab" "frontend/js/utils/global-bridges.js" "切换添加成员标签"
check_function "switchMarketTab" "frontend/js/utils/global-bridges.js" "切换市场标签"
check_function "switchKnowledgeOrganization" "frontend/js/utils/global-bridges.js" "切换知识库组织方式"
echo ""

echo "2. 检查模块功能实现"
echo "----------------------------------------"
total=$((total + 1))
echo -n "[$total] 检查 shareReport 方法 ... "
if grep -q "shareReport" "frontend/js/modules/business-plan-generator.js"; then
    echo -e "${GREEN}✓ 通过${NC} - 分享报告方法"
    passed=$((passed + 1))
else
    echo -e "${RED}✗ 失败${NC} - 分享报告方法"
    failed=$((failed + 1))
fi

check_function "applySmartInputHint" "frontend/js/utils/app-helpers.js" "智能输入提示"
check_function "restoreChatMenu" "frontend/js/modules/chat/chat-manager.js" "恢复聊天菜单"
echo ""

echo "3. 检查 HTML 引用"
echo "----------------------------------------"
total=$((total + 1))
echo -n "[$total] 检查 index.html 引入 global-bridges.js ... "
if grep -q "global-bridges.js" "index.html"; then
    echo -e "${GREEN}✓ 通过${NC}"
    passed=$((passed + 1))
else
    echo -e "${RED}✗ 失败${NC}"
    failed=$((failed + 1))
fi

total=$((total + 1))
echo -n "[$total] 检查 HTML 中的函数调用 ... "
html_calls=$(grep -c "startGeneration\|cancelGeneration\|shareBusinessReport\|regenerateBusinessReport\|adjustBusinessReportChapters\|showAddMember\|switchAddMemberTab\|switchMarketTab\|switchKnowledgeOrganization" index.html)
if [ "$html_calls" -ge 9 ]; then
    echo -e "${GREEN}✓ 通过${NC} - 找到 $html_calls 个函数调用"
    passed=$((passed + 1))
else
    echo -e "${RED}✗ 失败${NC} - 只找到 $html_calls 个函数调用"
    failed=$((failed + 1))
fi
echo ""

echo "4. 检查脚本加载顺序"
echo "----------------------------------------"
total=$((total + 1))
echo -n "[$total] 检查 global-bridges.js 在 app-helpers.js 之后 ... "
app_helpers_line=$(grep -n "app-helpers.js" index.html | head -1 | cut -d: -f1)
global_bridges_line=$(grep -n "global-bridges.js" index.html | head -1 | cut -d: -f1)

if [ -n "$app_helpers_line" ] && [ -n "$global_bridges_line" ] && [ "$global_bridges_line" -gt "$app_helpers_line" ]; then
    echo -e "${GREEN}✓ 通过${NC} - app-helpers.js:$app_helpers_line, global-bridges.js:$global_bridges_line"
    passed=$((passed + 1))
else
    echo -e "${RED}✗ 失败${NC} - 加载顺序不正确"
    failed=$((failed + 1))
fi

total=$((total + 1))
echo -n "[$total] 检查 global-bridges.js 在 app-boot.js 之前 ... "
app_boot_line=$(grep -n "app-boot.js" index.html | head -1 | cut -d: -f1)

if [ -n "$global_bridges_line" ] && [ -n "$app_boot_line" ] && [ "$global_bridges_line" -lt "$app_boot_line" ]; then
    echo -e "${GREEN}✓ 通过${NC} - global-bridges.js:$global_bridges_line, app-boot.js:$app_boot_line"
    passed=$((passed + 1))
else
    echo -e "${RED}✗ 失败${NC} - 加载顺序不正确"
    failed=$((failed + 1))
fi
echo ""

echo "=========================================="
echo "验证结果汇总"
echo "=========================================="
echo "总计: $total 项"
echo -e "${GREEN}通过: $passed 项${NC}"
if [ $failed -gt 0 ]; then
    echo -e "${RED}失败: $failed 项${NC}"
else
    echo -e "${GREEN}失败: $failed 项${NC}"
fi
echo ""

if [ $failed -eq 0 ]; then
    echo -e "${GREEN}✓ 所有检查通过！修复成功！${NC}"
    exit 0
else
    echo -e "${RED}✗ 部分检查失败，请检查上述错误${NC}"
    exit 1
fi
