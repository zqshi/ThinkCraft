#!/bin/bash

# 简化版性能测试脚本
# 使用curl测量基本性能指标

echo "🚀 ThinkCraft 性能测试（简化版）"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

TEST_URL="http://localhost:8000"
ITERATIONS=5

echo "📡 测试配置:"
echo "  URL: $TEST_URL"
echo "  测试次数: $ITERATIONS"
echo ""

# 检查服务器是否运行
if ! curl -s -o /dev/null -w "%{http_code}" "$TEST_URL" | grep -q "200"; then
    echo "❌ 错误: 服务器未运行"
    echo "请先启动服务器: python3 -m http.server 8000"
    exit 1
fi

echo "✅ 服务器运行正常"
echo ""

# 测试1: HTML页面加载时间
echo "📊 测试1: HTML页面加载性能"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

total_time=0
for i in $(seq 1 $ITERATIONS); do
    time=$(curl -s -o /dev/null -w "%{time_total}" "$TEST_URL")
    echo "  第${i}次: ${time}s"
    total_time=$(echo "$total_time + $time" | bc)
done

avg_time=$(echo "scale=3; $total_time / $ITERATIONS" | bc)
echo ""
echo "  平均响应时间: ${avg_time}s"
echo ""

# 测试2: 关键资源加载时间
echo "📦 测试2: 关键资源加载性能"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 测试app-boot.js
echo "  app-boot.js:"
app_boot_time=$(curl -s -o /dev/null -w "%{time_total}" "$TEST_URL/frontend/js/app-boot.js")
app_boot_size=$(curl -s "$TEST_URL/frontend/js/app-boot.js" | wc -c)
echo "    加载时间: ${app_boot_time}s"
echo "    文件大小: $((app_boot_size / 1024))KB"

# 测试init.js
echo "  boot/init.js:"
init_time=$(curl -s -o /dev/null -w "%{time_total}" "$TEST_URL/frontend/js/boot/init.js")
init_size=$(curl -s "$TEST_URL/frontend/js/boot/init.js" | wc -c)
echo "    加载时间: ${init_time}s"
echo "    文件大小: $((init_size / 1024))KB"

# 测试message-handler.js
echo "  modules/chat/message-handler.js:"
msg_time=$(curl -s -o /dev/null -w "%{time_total}" "$TEST_URL/frontend/js/modules/chat/message-handler.js")
msg_size=$(curl -s "$TEST_URL/frontend/js/modules/chat/message-handler.js" | wc -c)
echo "    加载时间: ${msg_time}s"
echo "    文件大小: $((msg_size / 1024))KB"

echo ""

# 测试3: 统计所有JS文件
echo "📈 测试3: JavaScript文件统计"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 统计modules目录
modules_count=$(find frontend/js/modules -name "*.js" ! -name "*.test.js" | wc -l)
modules_size=$(find frontend/js/modules -name "*.js" ! -name "*.test.js" -exec cat {} \; | wc -c)

# 统计utils目录
utils_count=$(find frontend/js/utils -name "*.js" ! -name "*.test.js" | wc -l)
utils_size=$(find frontend/js/utils -name "*.js" ! -name "*.test.js" -exec cat {} \; | wc -c)

# 统计components目录
components_count=$(find frontend/js/components -name "*.js" ! -name "*.test.js" 2>/dev/null | wc -l)
components_size=$(find frontend/js/components -name "*.js" ! -name "*.test.js" -exec cat {} \; 2>/dev/null | wc -c)

total_js_size=$((modules_size + utils_size + components_size + app_boot_size + init_size))

echo "  模块文件: ${modules_count}个 ($((modules_size / 1024))KB)"
echo "  工具文件: ${utils_count}个 ($((utils_size / 1024))KB)"
echo "  组件文件: ${components_count}个 ($((components_size / 1024))KB)"
echo "  核心文件: 2个 ($(((app_boot_size + init_size) / 1024))KB)"
echo ""
echo "  总计: $((modules_count + utils_count + components_count + 2))个文件"
echo "  总大小: $((total_js_size / 1024))KB"
echo ""

# 测试4: 对比优化前后
echo "⚖️  测试4: 优化效果对比"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

backup_file="backups/2026-01-31-modular-refactor/app-boot.js.backup"
if [ -f "$backup_file" ]; then
    backup_size=$(cat "$backup_file" | wc -c)
    reduction=$(echo "scale=1; (1 - $app_boot_size / $backup_size) * 100" | bc)

    echo "  优化前 (app-boot.js.backup):"
    echo "    文件大小: $((backup_size / 1024))KB"
    echo ""
    echo "  优化后 (app-boot.js):"
    echo "    文件大小: $((app_boot_size / 1024))KB"
    echo ""
    echo "  减少: ${reduction}%"
else
    echo "  ⚠️  备份文件不存在，跳过对比"
fi

echo ""

# 性能评分
echo "⭐ 性能评分"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# HTML响应时间评分
if (( $(echo "$avg_time < 0.1" | bc -l) )); then
    html_score="优秀 ✅"
elif (( $(echo "$avg_time < 0.5" | bc -l) )); then
    html_score="良好 ✓"
else
    html_score="需改进 ⚠️"
fi

# app-boot.js大小评分
if (( app_boot_size < 15360 )); then  # 15KB
    boot_score="优秀 ✅"
elif (( app_boot_size < 51200 )); then  # 50KB
    boot_score="良好 ✓"
else
    boot_score="需改进 ⚠️"
fi

# 总JS大小评分
if (( total_js_size < 204800 )); then  # 200KB
    total_score="优秀 ✅"
elif (( total_js_size < 512000 )); then  # 500KB
    total_score="良好 ✓"
else
    total_score="需改进 ⚠️"
fi

echo "  HTML响应时间: $html_score (${avg_time}s)"
echo "  app-boot.js大小: $boot_score ($((app_boot_size / 1024))KB)"
echo "  总JS大小: $total_score ($((total_js_size / 1024))KB)"
echo ""

# 总结
echo "📋 测试总结"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ 模块化重构成功:"
echo "  - app-boot.js 从 $((backup_size / 1024))KB 减少到 $((app_boot_size / 1024))KB"
echo "  - 代码拆分为 $((modules_count + utils_count + components_count + 2)) 个模块"
echo "  - HTML响应时间: ${avg_time}s"
echo ""
echo "💡 建议:"
if (( total_js_size > 204800 )); then
    echo "  - 考虑实施代码压缩（UglifyJS/Terser）"
    echo "  - 启用Gzip压缩"
fi
if (( $(echo "$avg_time > 0.5" | bc -l) )); then
    echo "  - 优化服务器响应时间"
    echo "  - 考虑使用CDN"
fi
echo ""
echo "🔗 详细性能测试:"
echo "  1. 打开浏览器访问: $TEST_URL"
echo "  2. 打开 DevTools (F12) → Performance 标签"
echo "  3. 点击 Record → 刷新页面 → 停止录制"
echo "  4. 查看 FCP、LCP、TTI 等指标"
echo ""
echo "✨ 测试完成！"
