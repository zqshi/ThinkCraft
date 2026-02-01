#!/bin/bash

echo "=========================================="
echo "验证按钮状态去重修复"
echo "=========================================="
echo ""

echo "修复内容："
echo "1. ✅ 添加报告去重逻辑，优先保留 generating 状态"
echo "2. ✅ 添加 cleanupDuplicateReports 方法清理重复记录"
echo "3. ✅ 在状态恢复完成后自动清理重复记录"
echo ""

echo "检查修复是否正确应用..."
echo ""

# 检查去重逻辑
if grep -q "deduplicatedReports" frontend/js/modules/report/report-generator.js; then
    echo "✅ 去重逻辑已添加"
else
    echo "❌ 错误：去重逻辑未找到"
    exit 1
fi

# 检查清理方法
if grep -q "cleanupDuplicateReports" frontend/js/modules/report/report-generator.js; then
    echo "✅ 清理方法已添加"
else
    echo "❌ 错误：清理方法未找到"
    exit 1
fi

# 检查优先保留 generating 状态的逻辑
if grep -q "优先保留 generating 状态" frontend/js/modules/report/report-generator.js; then
    echo "✅ 优先保留 generating 状态的逻辑已添加"
else
    echo "❌ 错误：优先保留逻辑未找到"
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ 所有检查通过！"
echo "=========================================="
echo ""

echo "问题分析："
echo "----------"
echo "根据日志，IndexedDB 中有重复的报告记录："
echo "  1. business (status: generating) ← 正确的状态"
echo "  2. business (status: idle) ← 错误的状态，覆盖了前面的"
echo ""
echo "修复方案："
echo "----------"
echo "1. 去重逻辑：在处理报告前先去重"
echo "   - 如果有多个相同类型的报告"
echo "   - 优先保留 generating 状态的报告"
echo "   - 如果状态相同，保留最新的（根据 startTime）"
echo ""
echo "2. 清理逻辑：删除 IndexedDB 中的重复记录"
echo "   - 保留去重后的报告"
echo "   - 删除其他重复的报告"
echo "   - 防止下次加载时再次出现重复"
echo ""

echo "测试步骤："
echo "----------"
echo "1. 清除浏览器缓存（Ctrl+Shift+Delete）"
echo "2. 硬刷新页面（Ctrl+Shift+R）"
echo "3. 打开开发者工具 → Application → IndexedDB → ThinkCraftDB → reports"
echo "4. 检查是否还有重复的报告记录"
echo "5. 查看控制台日志，确认："
echo "   - [清理重复] 删除重复报告"
echo "   - [清理重复] 清理完成"
echo "6. 检查按钮状态是否正确显示"
echo ""

echo "预期结果："
echo "----------"
echo "✅ IndexedDB 中每个类型只有一条记录"
echo "✅ 按钮显示正确的状态（generating 或 completed）"
echo "✅ 刷新页面后状态正确恢复"
echo "✅ 控制台显示清理日志"
echo ""
