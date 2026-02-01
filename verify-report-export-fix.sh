#!/bin/bash

# 报告系统PDF导出修复验证脚本
# 用于快速验证所有修改是否正确应用

echo "=========================================="
echo "报告系统PDF导出修复验证"
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
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} 文件存在: $1"
        ((PASS++))
        return 0
    else
        echo -e "${RED}✗${NC} 文件缺失: $1"
        ((FAIL++))
        return 1
    fi
}

check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} 内容验证: $3"
        ((PASS++))
        return 0
    else
        echo -e "${RED}✗${NC} 内容缺失: $3"
        ((FAIL++))
        return 1
    fi
}

echo "1. 检查新建文件"
echo "----------------------------------------"
check_file "frontend/js/utils/toast.js"
check_file "frontend/js/utils/export-validator.js"
check_file "test-toast-export.html"
check_file "REPORT_EXPORT_FIX_IMPLEMENTATION.md"
echo ""

echo "2. 检查Toast管理器"
echo "----------------------------------------"
check_content "frontend/js/utils/toast.js" "class ToastManager" "ToastManager类定义"
check_content "frontend/js/utils/toast.js" "show(message, type" "show方法"
check_content "frontend/js/utils/toast.js" "success(message" "success方法"
check_content "frontend/js/utils/toast.js" "error(message" "error方法"
check_content "frontend/js/utils/toast.js" "warning(message" "warning方法"
echo ""

echo "3. 检查导出验证器"
echo "----------------------------------------"
check_content "frontend/js/utils/export-validator.js" "class ExportValidator" "ExportValidator类定义"
check_content "frontend/js/utils/export-validator.js" "validateExport" "validateExport方法"
check_content "frontend/js/utils/export-validator.js" "validateReportData" "validateReportData方法"
echo ""

echo "4. 检查CSS样式"
echo "----------------------------------------"
check_content "css/main.css" ".toast-container" "toast-container样式"
check_content "css/main.css" ".toast-success" "toast-success样式"
check_content "css/main.css" "@keyframes toast-slide-in" "toast动画"
echo ""

echo "5. 检查HTML引入"
echo "----------------------------------------"
check_content "index.html" "toast.js" "toast.js引入"
check_content "index.html" "export-validator.js" "export-validator.js引入"
echo ""

echo "6. 检查初始化代码"
echo "----------------------------------------"
check_content "frontend/js/boot/init.js" "window.toast = new ToastManager" "Toast初始化"
check_content "frontend/js/boot/init.js" "window.exportValidator = new ExportValidator" "ExportValidator初始化"
echo ""

echo "7. 检查report-generator.js修改"
echo "----------------------------------------"
check_content "frontend/js/modules/report/report-generator.js" "window.exportValidator.validateExport" "使用exportValidator"
check_content "frontend/js/modules/report/report-generator.js" "window.toast.warning" "使用toast.warning"
check_content "frontend/js/modules/report/report-generator.js" "window.toast.error" "使用toast.error"
check_content "frontend/js/modules/report/report-generator.js" "window.toast.success" "使用toast.success"
echo ""

echo "8. 检查report-viewer.js修改"
echo "----------------------------------------"
check_content "frontend/js/modules/report/report-viewer.js" "window.exportValidator.validateExport" "使用exportValidator"
check_content "frontend/js/modules/report/report-viewer.js" "window.toast.warning" "使用toast.warning"
check_content "frontend/js/modules/report/report-viewer.js" "window.toast.error" "使用toast.error"
check_content "frontend/js/modules/report/report-viewer.js" "window.toast.success" "使用toast.success"
echo ""

echo "9. 检查是否移除了alert调用"
echo "----------------------------------------"
if grep -n "alert('⚠️ 报告正在生成中" frontend/js/modules/report/report-generator.js 2>/dev/null; then
    echo -e "${RED}✗${NC} report-generator.js中仍有旧的alert调用"
    ((FAIL++))
else
    echo -e "${GREEN}✓${NC} report-generator.js已移除旧的alert调用"
    ((PASS++))
fi

if grep -n "alert('❌ 无法获取当前会话ID" frontend/js/modules/report/report-viewer.js 2>/dev/null; then
    echo -e "${RED}✗${NC} report-viewer.js中仍有旧的alert调用"
    ((FAIL++))
else
    echo -e "${GREEN}✓${NC} report-viewer.js已移除旧的alert调用"
    ((PASS++))
fi
echo ""

echo "=========================================="
echo "验证结果汇总"
echo "=========================================="
echo -e "通过: ${GREEN}${PASS}${NC}"
echo -e "失败: ${RED}${FAIL}${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ 所有检查通过！${NC}"
    echo ""
    echo "下一步："
    echo "1. 打开 test-toast-export.html 测试基础功能"
    echo "2. 启动应用测试实际导出流程"
    echo "3. 检查浏览器控制台无错误"
    exit 0
else
    echo -e "${RED}✗ 发现 ${FAIL} 个问题，请检查！${NC}"
    exit 1
fi
