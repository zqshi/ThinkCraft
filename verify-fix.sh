#!/bin/bash

echo "=========================================="
echo "ThinkCraft 修复验证脚本"
echo "=========================================="
echo ""

# 检查export语句
echo "1. 检查关键文件是否还有export语句..."
echo ""

files_to_check=(
    "frontend/js/utils/format.js"
    "frontend/js/utils/dom.js"
    "frontend/js/utils/icons.js"
)

has_error=0

for file in "${files_to_check[@]}"; do
    if grep -q "^export" "$file"; then
        echo "  ✗ $file 仍然有export语句"
        has_error=1
    else
        echo "  ✓ $file 没有export语句"
    fi
done

echo ""

# 检查initChatAutoScroll函数
echo "2. 检查initChatAutoScroll函数..."
if grep -q "function initChatAutoScroll" "frontend/js/app-boot.js"; then
    echo "  ✓ initChatAutoScroll 函数存在"
else
    echo "  ✗ initChatAutoScroll 函数不存在"
    has_error=1
fi

echo ""

# 检查isNearBottom函数
echo "3. 检查isNearBottom辅助函数..."
if grep -q "function isNearBottom" "frontend/js/app-boot.js"; then
    echo "  ✓ isNearBottom 函数存在"
else
    echo "  ✗ isNearBottom 函数不存在"
    has_error=1
fi

echo ""

# 检查HTML版本号
echo "4. 检查HTML中的版本号..."
if grep -q "v=20260131-fix" "index.html"; then
    echo "  ✓ 版本号已更新"
    echo ""
    echo "  更新的文件："
    grep "v=20260131-fix" "index.html" | sed 's/^/    /'
else
    echo "  ✗ 版本号未更新"
    has_error=1
fi

echo ""

# 检查测试
echo "5. 运行Jest测试..."
npm test --silent 2>&1 | tail -5

echo ""
echo "=========================================="
if [ $has_error -eq 0 ]; then
    echo "✓ 所有检查通过！"
    echo ""
    echo "下一步："
    echo "1. 在浏览器中按 Ctrl+Shift+R (或 Cmd+Shift+R) 硬刷新"
    echo "2. 打开开发者工具（F12）检查控制台"
    echo "3. 确认没有语法错误"
else
    echo "✗ 发现问题，请检查上述错误"
fi
echo "=========================================="
