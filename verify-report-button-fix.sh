#!/bin/bash

# 验证报告按钮状态修复
# 检查所有关键文件是否已正确修改

echo "=========================================="
echo "验证报告按钮状态修复"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查计数
PASS=0
FAIL=0

# 检查函数
check_file() {
    local file=$1
    local pattern=$2
    local description=$3

    if [ ! -f "$file" ]; then
        echo -e "${RED}✗${NC} 文件不存在: $file"
        ((FAIL++))
        return 1
    fi

    if grep -q "$pattern" "$file"; then
        echo -e "${GREEN}✓${NC} $description"
        ((PASS++))
        return 0
    else
        echo -e "${RED}✗${NC} $description"
        echo "   文件: $file"
        echo "   缺失: $pattern"
        ((FAIL++))
        return 1
    fi
}

echo "1. 检查 ReportStatusManager 类是否创建"
check_file "frontend/js/modules/report/report-status-manager.js" \
    "class ReportStatusManager" \
    "ReportStatusManager 类已创建"

echo ""
echo "2. 检查 typing-effect.js 是否使用状态验证"
check_file "frontend/js/modules/chat/typing-effect.js" \
    "window.reportStatusManager.shouldShowReportButton" \
    "typing-effect.js 已添加状态验证"

echo ""
echo "3. 检查 message-handler.js 是否使用状态验证"
check_file "frontend/js/modules/chat/message-handler.js" \
    "window.reportStatusManager.shouldShowReportButton" \
    "message-handler.js 已添加状态验证"

echo ""
echo "4. 检查 report-viewer.js 是否使用正确的 API"
check_file "frontend/js/modules/report/report-viewer.js" \
    "getReportByChatIdAndType" \
    "report-viewer.js 使用正确的 API"

echo ""
echo "5. 检查 report-viewer.js 是否处理生成中状态"
check_file "frontend/js/modules/report/report-viewer.js" \
    "reportEntry.status === 'generating'" \
    "report-viewer.js 处理生成中状态"

echo ""
echo "6. 检查 report-generator.js 是否通知状态变化"
check_file "frontend/js/modules/report/report-generator.js" \
    "window.reportStatusManager.onReportStatusChange" \
    "report-generator.js 通知状态变化"

echo ""
echo "7. 检查 export-validator.js 是否使用正确的 API"
check_file "frontend/js/utils/export-validator.js" \
    "getReportByChatIdAndType" \
    "export-validator.js 使用正确的 API"

echo ""
echo "8. 检查 CSS 是否添加按钮状态样式"
check_file "css/main.css" \
    ".view-report-btn.generating" \
    "CSS 添加了按钮状态样式"

echo ""
echo "9. 检查 index.html 是否引入 report-status-manager.js"
check_file "index.html" \
    "report-status-manager.js" \
    "index.html 引入了 report-status-manager.js"

echo ""
echo "10. 检查 app.js 是否初始化 ReportStatusManager"
check_file "frontend/js/app.js" \
    "window.reportStatusManager = new window.ReportStatusManager" \
    "app.js 初始化 ReportStatusManager"

echo ""
echo "=========================================="
echo "验证结果"
echo "=========================================="
echo -e "通过: ${GREEN}$PASS${NC}"
echo -e "失败: ${RED}$FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ 所有检查通过！${NC}"
    echo ""
    echo "下一步："
    echo "1. 清除浏览器缓存（Cmd+Shift+R 或 Ctrl+Shift+R）"
    echo "2. 打开开发者工具（F12）查看控制台"
    echo "3. 测试以下场景："
    echo "   - 新对话，AI 回复包含 [ANALYSIS_COMPLETE] 标记，未生成报告"
    echo "   - 点击生成报告，生成中刷新页面"
    echo "   - 报告生成完成后刷新页面"
    echo "   - 模拟报告生成失败"
    exit 0
else
    echo -e "${RED}✗ 有 $FAIL 项检查失败${NC}"
    echo ""
    echo "请检查上述失败项并修复"
    exit 1
fi
