#!/bin/bash

# 登出功能修复验证脚本
# 用于验证登出功能的所有修复点

echo "=========================================="
echo "登出功能修复验证"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 验证计数
PASS=0
FAIL=0

# 验证函数
verify() {
    local description=$1
    local file=$2
    local pattern=$3

    if grep -q "$pattern" "$file"; then
        echo -e "${GREEN}✅ PASS${NC}: $description"
        ((PASS++))
    else
        echo -e "${RED}❌ FAIL${NC}: $description"
        echo "   文件: $file"
        echo "   缺失: $pattern"
        ((FAIL++))
    fi
}

echo "1. 验证 app-helpers.js 修复"
echo "-------------------------------------------"

# 验证后端登出失败处理
verify "后端登出失败处理 - 检查响应状态" \
    "frontend/js/utils/app-helpers.js" \
    "if (!response.ok)"

verify "后端登出失败处理 - 用户确认弹窗" \
    "frontend/js/utils/app-helpers.js" \
    "后端登出失败，是否强制退出"

verify "后端登出失败处理 - 网络错误处理" \
    "frontend/js/utils/app-helpers.js" \
    "后端登出失败（网络错误）"

# 验证 window.state 清除
verify "清除 window.state - 调用 clearUserData" \
    "frontend/js/utils/app-helpers.js" \
    "window.stateManager.clearUserData()"

verify "清除 window.state - 降级方案" \
    "frontend/js/utils/app-helpers.js" \
    "window.state.currentChat = null"

verify "清除 window.state - 清除 generation" \
    "frontend/js/utils/app-helpers.js" \
    "window.state.generation = {}"

# 验证用户ID清除
verify "清除用户ID缓存" \
    "frontend/js/utils/app-helpers.js" \
    "localStorage.removeItem('thinkcraft_user_id')"

# 验证设置弹窗关闭
verify "关闭桌面端设置弹窗" \
    "frontend/js/utils/app-helpers.js" \
    "settingsModal.classList.remove('active')"

verify "关闭移动端设置面板" \
    "frontend/js/utils/app-helpers.js" \
    "bottomSheet.classList.remove('active')"

verify "恢复body滚动" \
    "frontend/js/utils/app-helpers.js" \
    "document.body.style.overflow = ''"

echo ""
echo "2. 验证 state-manager.js 修复"
echo "-------------------------------------------"

# 验证 clearUserData 方法
verify "clearUserData 方法存在" \
    "frontend/js/core/state-manager.js" \
    "clearUserData()"

verify "clearUserData - 清除对话状态" \
    "frontend/js/core/state-manager.js" \
    "this.state.currentChat = null"

verify "clearUserData - 清除生成状态" \
    "frontend/js/core/state-manager.js" \
    "this.state.generation = {}"

verify "clearUserData - 清除灵感收件箱" \
    "frontend/js/core/state-manager.js" \
    "this.state.inspiration.items = \[\]"

verify "clearUserData - 清除知识库" \
    "frontend/js/core/state-manager.js" \
    "this.state.knowledge.items = \[\]"

verify "clearUserData - 通知监听器" \
    "frontend/js/core/state-manager.js" \
    "this.notify()"

echo ""
echo "3. 验证 settings-manager.js 修复"
echo "-------------------------------------------"

# 验证 forceCloseAllSettings 方法
verify "forceCloseAllSettings 方法存在" \
    "frontend/js/modules/settings/settings-manager.js" \
    "forceCloseAllSettings()"

verify "forceCloseAllSettings - 关闭桌面端弹窗" \
    "frontend/js/modules/settings/settings-manager.js" \
    "settingsModal.classList.remove('active')"

verify "forceCloseAllSettings - 关闭移动端面板" \
    "frontend/js/modules/settings/settings-manager.js" \
    "bottomSheet.classList.remove('active')"

verify "forceCloseAllSettings - 全局函数导出" \
    "frontend/js/modules/settings/settings-manager.js" \
    "window.forceCloseAllSettings"

echo ""
echo "=========================================="
echo "验证结果汇总"
echo "=========================================="
echo -e "${GREEN}通过: $PASS${NC}"
echo -e "${RED}失败: $FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}🎉 所有验证通过！登出功能修复完成。${NC}"
    echo ""
    echo "下一步："
    echo "1. 启动应用并测试登出功能"
    echo "2. 按照计划中的测试场景进行验证"
    echo "3. 特别关注：第二次登录后再次退出是否正常"
    exit 0
else
    echo -e "${RED}⚠️  有 $FAIL 项验证失败，请检查修复。${NC}"
    exit 1
fi
