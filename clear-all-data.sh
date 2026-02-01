#!/bin/bash

# ThinkCraft 数据清理脚本
# 用于清理所有本地数据和缓存

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "=========================================="
echo "  ThinkCraft 数据清理工具"
echo "=========================================="
echo ""

# 警告信息
echo -e "${RED}⚠️  警告：此操作不可逆！${NC}"
echo -e "${YELLOW}清理后，所有数据将被永久删除，无法恢复。${NC}"
echo ""

# 确认操作
read -p "确定要清理所有数据吗？(输入 YES 继续): " confirm

if [ "$confirm" != "YES" ]; then
    echo ""
    echo -e "${BLUE}已取消清理操作${NC}"
    exit 0
fi

echo ""
echo "=========================================="
echo "开始清理数据..."
echo "=========================================="
echo ""

# 清理计数
CLEARED_COUNT=0

# 1. 清理 IndexedDB（需要在浏览器中执行）
echo -e "${BLUE}[1/5]${NC} 准备清理 IndexedDB..."
echo "  ℹ️  IndexedDB 需要在浏览器中清理"
echo "  → 请打开浏览器开发者工具（F12）"
echo "  → 进入 Application → Storage → IndexedDB"
echo "  → 右键点击 ThinkCraftDB → Delete database"
echo ""

# 2. 清理 localStorage 和 sessionStorage（需要在浏览器中执行）
echo -e "${BLUE}[2/5]${NC} 准备清理 localStorage 和 sessionStorage..."
echo "  ℹ️  本地存储需要在浏览器中清理"
echo "  → 在浏览器控制台执行："
echo "  → localStorage.clear(); sessionStorage.clear();"
echo ""

# 3. 清理浏览器缓存
echo -e "${BLUE}[3/5]${NC} 准备清理浏览器缓存..."
echo "  ℹ️  浏览器缓存需要手动清理"
echo "  → 按 Ctrl+Shift+Delete"
echo "  → 选择 '缓存的图片和文件'"
echo "  → 点击 '清除数据'"
echo ""

# 4. 清理 Service Worker 缓存
echo -e "${BLUE}[4/5]${NC} 准备清理 Service Worker..."
echo "  ℹ️  Service Worker 需要在浏览器中清理"
echo "  → 打开 Application → Service Workers"
echo "  → 点击 'Unregister'"
echo ""

# 5. 提供自动化清理页面
echo -e "${BLUE}[5/5]${NC} 生成自动化清理页面..."
if [ -f "clear-data.html" ]; then
    echo -e "  ${GREEN}✓${NC} 清理页面已存在: clear-data.html"
    ((CLEARED_COUNT++))
else
    echo -e "  ${RED}✗${NC} 清理页面不存在"
fi
echo ""

echo "=========================================="
echo "清理指南"
echo "=========================================="
echo ""
echo "方法1：使用自动化清理页面（推荐）"
echo "--------------------------------------"
echo "1. 在浏览器中打开: file://$(pwd)/clear-data.html"
echo "2. 选择要清理的数据类型"
echo "3. 点击 '开始清理' 按钮"
echo "4. 等待清理完成"
echo ""

echo "方法2：手动清理"
echo "--------------------------------------"
echo "1. 打开浏览器开发者工具（F12）"
echo "2. 进入 Console 标签"
echo "3. 执行以下命令："
echo ""
echo -e "${YELLOW}// 清理 IndexedDB${NC}"
echo "indexedDB.deleteDatabase('ThinkCraftDB');"
echo ""
echo -e "${YELLOW}// 清理 localStorage 和 sessionStorage${NC}"
echo "localStorage.clear();"
echo "sessionStorage.clear();"
echo ""
echo -e "${YELLOW}// 清理 Service Worker 缓存${NC}"
echo "caches.keys().then(names => {"
echo "  names.forEach(name => caches.delete(name));"
echo "});"
echo ""
echo -e "${YELLOW}// 注销 Service Worker${NC}"
echo "navigator.serviceWorker.getRegistrations().then(registrations => {"
echo "  registrations.forEach(registration => registration.unregister());"
echo "});"
echo ""

echo "方法3：浏览器设置清理"
echo "--------------------------------------"
echo "1. 按 Ctrl+Shift+Delete（Windows/Linux）"
echo "   或 Cmd+Shift+Delete（Mac）"
echo "2. 选择时间范围：'全部时间'"
echo "3. 勾选："
echo "   ☑ 浏览历史记录"
echo "   ☑ Cookie 和其他网站数据"
echo "   ☑ 缓存的图片和文件"
echo "4. 点击 '清除数据'"
echo ""

echo "=========================================="
echo "验证清理结果"
echo "=========================================="
echo ""
echo "清理完成后，请验证："
echo "1. 刷新页面（Ctrl+Shift+R）"
echo "2. 检查是否需要重新登录"
echo "3. 检查对话列表是否为空"
echo "4. 检查项目列表是否为空"
echo "5. 检查 IndexedDB 是否已清空："
echo "   F12 → Application → IndexedDB → ThinkCraftDB"
echo ""

echo "=========================================="
echo -e "${GREEN}✓ 清理指南已生成${NC}"
echo "=========================================="
echo ""
echo "下一步："
echo "1. 使用上述任一方法清理数据"
echo "2. 刷新页面验证清理结果"
echo "3. 如有问题，请查看浏览器控制台"
echo ""
