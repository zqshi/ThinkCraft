#!/bin/bash

# ThinkCraft 未定义函数检查脚本

echo "=== 检查未定义的函数引用 ==="
echo ""

# 检查所有 window.xxx = xxx 的暴露语句
echo "1. 检查 app-helpers.js 中的函数暴露..."
grep -n "window\." frontend/js/utils/app-helpers.js | grep "=" | while read line; do
    func_name=$(echo "$line" | sed -E 's/.*window\.([a-zA-Z0-9_]+).*/\1/')
    if ! grep -q "function $func_name\|const $func_name\|$func_name\s*=" frontend/js/utils/app-helpers.js; then
        echo "❌ 未定义: $func_name (行: $line)"
    else
        echo "✅ 已定义: $func_name"
    fi
done

echo ""
echo "2. 检查 ui-controller.js 中的函数暴露..."
grep -n "^function\|^window\." frontend/js/modules/ui-controller.js | tail -20

echo ""
echo "3. 检查 state-manager.js 中的函数暴露..."
grep -n "^function\|^window\." frontend/js/modules/state/state-manager.js | tail -20

echo ""
echo "4. 检查 report-viewer.js 中的函数暴露..."
grep -n "^function\|^window\." frontend/js/modules/report/report-viewer.js | tail -20

echo ""
echo "=== 检查完成 ==="
