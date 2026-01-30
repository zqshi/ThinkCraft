#!/bin/bash

# ThinkCraft 深度数据清理脚本
# 用途：彻底清理所有Mock数据，包括代码中的硬编码数据
# 使用：chmod +x deep-cleanup.sh && ./deep-cleanup.sh

echo "========================================"
echo "ThinkCraft 深度数据清理"
echo "========================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}步骤1: 检查代码中的Mock数据${NC}"
echo "----------------------------------------"

# 检查是否还有硬编码的mock数据
echo "检查硬编码的项目名称..."
if grep -r "智能健身\|在线教育\|智能家居\|宠物社交\|创意收集器" frontend/js/ backend/ --include="*.js" 2>/dev/null | grep -v "node_modules" | grep -v ".git"; then
    echo -e "${YELLOW}⚠ 发现硬编码的Mock数据！${NC}"
    echo "请检查上述文件并手动清理"
    read -p "是否继续？(yes/no): " continue_cleanup
    if [ "$continue_cleanup" != "yes" ]; then
        exit 0
    fi
else
    echo -e "${GREEN}✓ 未发现硬编码的Mock数据${NC}"
fi

echo ""
echo -e "${BLUE}步骤2: 清理后端数据（MongoDB）${NC}"
echo "----------------------------------------"

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
echo -e "${BLUE}步骤3: 生成前端清理指引${NC}"
echo "----------------------------------------"

cat << 'EOF'

请按照以下步骤清理前端数据：

方式一：使用诊断工具（推荐）
  1. 在浏览器中打开: diagnose-data.html
  2. 点击"扫描所有数据"查看详细数据
  3. 点击"清空所有数据"执行清理
  4. 导出数据备份（可选）

方式二：使用清理页面
  1. 在浏览器中打开: clear-frontend-data.html
  2. 点击"扫描数据"
  3. 点击"清理所有数据"

方式三：浏览器控制台
  打开浏览器控制台（F12），执行：

  // 清理所有数据
  localStorage.clear();
  sessionStorage.clear();
  indexedDB.deleteDatabase('ThinkCraft');

  // 清理Cookies
  document.cookie.split(';').forEach(c => {
    const name = c.split('=')[0].trim();
    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  });

  console.log('✓ 前端数据已清空');

EOF

read -p "前端数据清理完成后，按回车继续..."

echo ""
echo -e "${BLUE}步骤4: 验证清理结果${NC}"
echo "----------------------------------------"

# 验证MongoDB数据
echo "验证MongoDB数据..."
node -e "
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/thinkcraft').then(async () => {
  const db = mongoose.connection.db;
  const collections = ['projects', 'chats', 'business_plans', 'analysis_reports', 'users'];
  let allEmpty = true;
  let totalCount = 0;

  console.log('');
  for (const collectionName of collections) {
    try {
      const count = await db.collection(collectionName).countDocuments();
      totalCount += count;
      const status = count === 0 ? '✓' : '✗';
      console.log(\`  \${status} \${collectionName}: \${count} 条记录\`);
      if (count > 0) allEmpty = false;
    } catch (error) {
      console.log(\`  - \${collectionName}: 集合不存在\`);
    }
  }

  console.log('');
  if (allEmpty) {
    console.log('✓ MongoDB数据已完全清空');
  } else {
    console.log('⚠ MongoDB中仍有 ' + totalCount + ' 条数据残留');
    console.log('');
    console.log('建议：');
    console.log('  1. 重新运行清理脚本');
    console.log('  2. 手动检查数据来源');
    console.log('  3. 查看 diagnose-data.html 诊断工具');
  }

  process.exit(allEmpty ? 0 : 1);
}).catch(err => {
  console.error('验证失败:', err.message);
  process.exit(1);
});
" 2>/dev/null

MONGO_STATUS=$?

echo ""
echo -e "${BLUE}步骤5: 检查代码修复${NC}"
echo "----------------------------------------"

echo "检查已修复的文件..."
if grep -q "从实际项目数据中获取项目名称" frontend/js/app-boot.js; then
    echo -e "${GREEN}✓ app-boot.js 已修复（移除硬编码项目名称）${NC}"
else
    echo -e "${YELLOW}⚠ app-boot.js 可能需要手动检查${NC}"
fi

echo ""
echo "========================================"
echo "清理完成"
echo "========================================"
echo ""

if [ $MONGO_STATUS -eq 0 ]; then
    echo -e "${GREEN}✓ 数据清理流程已完成${NC}"
else
    echo -e "${YELLOW}⚠ 数据清理完成，但发现残留数据${NC}"
fi

echo ""
echo "后续步骤："
echo "  1. 确认前端数据已清空（使用 diagnose-data.html）"
echo "  2. 重启后端服务"
echo "  3. 刷新浏览器页面（Ctrl+Shift+R 强制刷新）"
echo "  4. 测试新建项目功能"
echo "  5. 测试新建对话功能"
echo "  6. 确认无任何Mock数据显示"
echo ""
echo "诊断工具："
echo "  - diagnose-data.html - 查看所有数据源"
echo "  - clear-frontend-data.html - 清理前端数据"
echo "  - DATA_CLEANUP_GUIDE.md - 详细清理指南"
echo ""
