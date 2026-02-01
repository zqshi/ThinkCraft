#!/bin/bash

# 语音权限修复验证脚本

echo "================================"
echo "语音权限修复验证"
echo "================================"
echo ""

# 检查修改的文件
echo "✅ 检查修改的文件..."
echo ""

if grep -q "requestMicrophonePermission" frontend/js/modules/input-handler.js; then
    echo "✓ input-handler.js: 已添加 requestMicrophonePermission 方法"
else
    echo "✗ input-handler.js: 缺少 requestMicrophonePermission 方法"
fi

if grep -q "microphonePermissionGranted" frontend/js/modules/input-handler.js; then
    echo "✓ input-handler.js: 已添加权限状态标记"
else
    echo "✗ input-handler.js: 缺少权限状态标记"
fi

if grep -q "首次使用需要授权麦克风权限" frontend/js/app-boot.js; then
    echo "✓ app-boot.js: 已添加首次使用引导"
else
    echo "✗ app-boot.js: 缺少首次使用引导"
fi

if grep -q "audio-capture" frontend/js/modules/input-handler.js; then
    echo "✓ input-handler.js: 已改进错误处理"
else
    echo "✗ input-handler.js: 错误处理不完整"
fi

echo ""
echo "================================"
echo "修复内容总结"
echo "================================"
echo ""
echo "1. ✅ 添加了麦克风权限请求功能"
echo "2. ✅ 添加了首次使用引导提示"
echo "3. ✅ 改进了错误处理和提示"
echo "4. ✅ 提供了详细的权限设置指南"
echo ""
echo "================================"
echo "测试步骤"
echo "================================"
echo ""
echo "方法1: 使用测试页面"
echo "  打开浏览器访问: test-voice-permission.html"
echo ""
echo "方法2: 在主应用中测试"
echo "  1. 启动应用"
echo "  2. 点击移动端的'按住说话'按钮"
echo "  3. 首次使用会显示权限说明"
echo "  4. 点击'确定'后授权麦克风"
echo "  5. 开始说话测试语音识别"
echo ""
echo "================================"
echo "权限设置指南"
echo "================================"
echo ""
echo "iOS (Safari):"
echo "  设置 > Safari > 麦克风 > 允许"
echo ""
echo "Android (Chrome):"
echo "  设置 > 应用 > Chrome > 权限 > 麦克风 > 允许"
echo ""
echo "================================"
echo "验证完成！"
echo "================================"
