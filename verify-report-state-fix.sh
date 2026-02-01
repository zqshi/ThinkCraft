#!/bin/bash

# 报告生成状态持久化修复验证脚本
# 用于快速验证关键修改点

echo "=========================================="
echo "报告生成状态持久化修复验证"
echo "=========================================="
echo ""

# 检查关键文件是否存在
echo "1. 检查关键文件..."
files=(
    "frontend/js/modules/business-plan-generator.js"
    "frontend/js/modules/report/report-generator.js"
    "frontend/js/modules/chat/chat-manager.js"
    "frontend/js/modules/state/report-button-manager.js"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ❌ $file (文件不存在)"
    fi
done
echo ""

# 检查关键修改点
echo "2. 检查关键修改点..."

# 检查1：开始生成时立即持久化（包含 data.chapters 初始化）
if grep -q "data: {" frontend/js/modules/business-plan-generator.js && \
   grep -q "chapters: \[\]," frontend/js/modules/business-plan-generator.js; then
    echo "   ✅ 开始生成时立即持久化（包含 data.chapters 初始化）"
else
    echo "   ❌ 开始生成时立即持久化（缺少 data.chapters 初始化）"
fi

# 检查2：每完成一个章节实时持久化
if grep -q "每完成一个章节立即持久化" frontend/js/modules/business-plan-generator.js; then
    echo "   ✅ 每完成一个章节实时持久化"
else
    echo "   ❌ 每完成一个章节实时持久化"
fi

# 检查3：等待 currentChat 初始化
if grep -q "等待 currentChat 初始化" frontend/js/modules/report/report-generator.js; then
    echo "   ✅ 等待 currentChat 初始化"
else
    echo "   ❌ 等待 currentChat 初始化"
fi

# 检查4：超时时间增加到30分钟
if grep -q "30 \* 60 \* 1000" frontend/js/modules/report/report-generator.js; then
    echo "   ✅ 超时时间增加到30分钟"
else
    echo "   ❌ 超时时间增加到30分钟"
fi

# 检查5：处理所有章节完成但状态还是 generating
if grep -q "所有章节已完成，自动更新状态为 completed" frontend/js/modules/report/report-generator.js; then
    echo "   ✅ 处理所有章节完成但状态还是 generating"
else
    echo "   ❌ 处理所有章节完成但状态还是 generating"
fi

# 检查6：优先从 IndexedDB 加载
if grep -q "优先从IndexedDB加载" frontend/js/modules/business-plan-generator.js; then
    echo "   ✅ 优先从 IndexedDB 加载"
else
    echo "   ❌ 优先从 IndexedDB 加载"
fi

# 检查7：恢复进度弹窗时显示已完成章节
if grep -q "根据实际完成情况" frontend/js/modules/business-plan-generator.js; then
    echo "   ✅ 恢复进度弹窗时显示已完成章节"
else
    echo "   ❌ 恢复进度弹窗时显示已完成章节"
fi

# 检查8：会话切换时保存状态
if grep -q "保存当前会话的报告生成状态" frontend/js/modules/chat/chat-manager.js; then
    echo "   ✅ 会话切换时保存状态"
else
    echo "   ❌ 会话切换时保存状态"
fi

# 检查9：会话切换后加载状态
if grep -q "加载新会话的报告生成状态" frontend/js/modules/chat/chat-manager.js; then
    echo "   ✅ 会话切换后加载状态"
else
    echo "   ❌ 会话切换后加载状态"
fi

echo ""
echo "=========================================="
echo "验证完成"
echo "=========================================="
echo ""
echo "下一步："
echo "1. 启动后端服务: cd backend && npm start"
echo "2. 启动前端服务: python3 -m http.server 8000"
echo "3. 打开浏览器: http://localhost:8000"
echo "4. 执行测试用例（参考 REPORT_STATE_FIX_VERIFICATION.md）"
echo ""
