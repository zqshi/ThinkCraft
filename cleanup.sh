#!/bin/bash

# ThinkCraft 投产前数据清理脚本
# 用途：一键清理所有Mock数据
# 使用：chmod +x cleanup.sh && ./cleanup.sh

echo "========================================"
echo "ThinkCraft 投产前数据清理"
echo "========================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 确认清理
echo -e "${YELLOW}警告：此操作将清理所有Mock数据！${NC}"
echo ""
echo "将清理以下数据："
echo "  - MongoDB数据库中的所有数据"
echo "  - 前端IndexedDB数据（需手动清理）"
echo "  - localStorage数据（需手动清理）"
echo ""
read -p "确定要继续吗？(yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${RED}已取消清理操作${NC}"
    exit 0
fi

echo ""
echo "========================================"
echo "步骤1: 清理后端数据（MongoDB）"
echo "========================================"
echo ""

# 执行后端清理
node backend/scripts/clear-project-space.js

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ 后端数据清理完成${NC}"
else
    echo ""
    echo -e "${RED}✗ 后端数据清理失败${NC}"
    exit 1
fi

echo ""
echo "========================================"
echo "步骤2: 清理前端数据（浏览器）"
echo "========================================"
echo ""
echo "请按照以下步骤清理前端数据："
echo ""
echo "方式一：使用清理页面（推荐）"
echo "  1. 在浏览器中打开: clear-frontend-data.html"
echo "  2. 点击'扫描数据'查看当前数据"
echo "  3. 点击'清理所有数据'执行清理"
echo ""
echo "方式二：使用浏览器开发者工具"
echo "  1. 打开浏览器开发者工具（F12）"
echo "  2. 进入 Application 标签"
echo "  3. 删除 IndexedDB → ThinkCraft"
echo "  4. 清空 Local Storage"
echo ""
echo "方式三：使用浏览器控制台"
echo "  1. 打开浏览器控制台（F12）"
echo "  2. 执行: indexedDB.deleteDatabase('ThinkCraft')"
echo "  3. 执行: localStorage.clear()"
echo ""

read -p "前端数据清理完成后，按回车继续..."

echo ""
echo "========================================"
echo "步骤3: 验证清理结果"
echo "========================================"
echo ""

# 验证MongoDB数据
echo "验证MongoDB数据..."
node -e "
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/thinkcraft').then(async () => {
  const db = mongoose.connection.db;
  const collections = ['projects', 'chats', 'business_plans', 'analysis_reports', 'users'];
  let allEmpty = true;

  for (const collectionName of collections) {
    try {
      const count = await db.collection(collectionName).countDocuments();
      console.log(\`  - \${collectionName}: \${count} 条记录\`);
      if (count > 0) allEmpty = false;
    } catch (error) {
      console.log(\`  - \${collectionName}: 集合不存在\`);
    }
  }

  if (allEmpty) {
    console.log('');
    console.log('✓ MongoDB数据已完全清空');
  } else {
    console.log('');
    console.log('⚠ MongoDB中仍有数据残留');
  }

  process.exit(0);
}).catch(err => {
  console.error('验证失败:', err.message);
  process.exit(1);
});
" 2>/dev/null

echo ""
echo "========================================"
echo "清理完成"
echo "========================================"
echo ""
echo -e "${GREEN}✓ 数据清理流程已完成${NC}"
echo ""
echo "后续步骤："
echo "  1. 重启后端服务"
echo "  2. 刷新浏览器页面"
echo "  3. 测试新建项目功能"
echo "  4. 确认无残留Mock数据"
echo ""
echo "详细说明请查看: DATA_CLEANUP_GUIDE.md"
echo ""
