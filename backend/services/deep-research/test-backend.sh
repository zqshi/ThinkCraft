#!/bin/bash

# DeepResearch后端集成测试脚本

echo "🧪 DeepResearch后端集成测试"
echo "============================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试计数
PASSED=0
FAILED=0

# 检查服务状态
echo "检查服务状态..."
echo "----------------"

# 检查Node.js后端
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Node.js后端正在运行${NC}"
else
    echo -e "${RED}✗ Node.js后端未运行${NC}"
    echo "请先启动Node.js后端："
    echo "  cd backend && npm start"
    exit 1
fi

# 检查Python微服务
if curl -s http://localhost:5001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Python微服务正在运行${NC}"
else
    echo -e "${YELLOW}⚠ Python微服务未运行（深度研究模式将不可用）${NC}"
fi

echo ""

# 测试函数
test_api() {
    local name=$1
    local use_deep_research=$2

    echo -n "测试: $name ... "

    # 构建请求体
    local request_body=$(cat <<EOF
{
    "chapterId": "market-analysis",
    "conversationHistory": [
        {"role": "user", "content": "我想做一个AI写作助手，帮助用户快速生成高质量的文章"}
    ],
    "type": "business",
    "useDeepResearch": $use_deep_research
}
EOF
)

    # 发送请求
    response=$(curl -s -o /tmp/api_response.txt -w "%{http_code}" \
        -X POST http://localhost:3000/api/business-plan/generate-chapter \
        -H "Content-Type: application/json" \
        -d "$request_body")

    status_code=$response
    body=$(cat /tmp/api_response.txt)

    # 检查状态码
    if [ "$status_code" = "200" ]; then
        # 检查响应内容
        if echo "$body" | grep -q '"code":0'; then
            echo -e "${GREEN}✓ 通过${NC}"
            PASSED=$((PASSED + 1))

            # 显示生成模式
            if echo "$body" | grep -q '"mode":"deep"'; then
                echo "  模式: 深度研究"
            elif echo "$body" | grep -q '"mode":"fast"'; then
                echo "  模式: 快速生成"
            fi

            # 显示内容长度
            content_length=$(echo "$body" | grep -o '"content":"[^"]*"' | wc -c)
            echo "  内容长度: $content_length 字符"

            return 0
        else
            echo -e "${RED}✗ 失败${NC}"
            echo "  响应格式错误: $body"
            FAILED=$((FAILED + 1))
            return 1
        fi
    elif [ "$status_code" = "401" ]; then
        echo -e "${YELLOW}⚠ 需要认证${NC}"
        echo "  提示: 后端API需要认证，请先登录或配置测试token"
        FAILED=$((FAILED + 1))
        return 1
    else
        echo -e "${RED}✗ 失败${NC}"
        echo "  状态码: $status_code"
        echo "  响应: $body"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# 1. 测试快速生成模式
echo "1️⃣  测试快速生成模式（DeepSeek）"
echo "--------------------------------"
test_api "快速生成模式" false
echo ""

# 2. 测试深度研究模式
echo "2️⃣  测试深度研究模式（DeepResearch）"
echo "------------------------------------"
if curl -s http://localhost:5001/health > /dev/null 2>&1; then
    test_api "深度研究模式" true
else
    echo -e "${YELLOW}⚠ 跳过（Python微服务未运行）${NC}"
fi
echo ""

# 3. 测试降级逻辑（停止Python服务）
echo "3️⃣  测试降级逻辑"
echo "----------------"
echo "提示: 降级逻辑需要在前端手动测试"
echo "  1. 停止Python微服务"
echo "  2. 在前端勾选深度研究模式"
echo "  3. 验证是否弹出降级询问对话框"
echo ""

# 测试总结
echo "============================"
echo "测试总结"
echo "============================"
echo -e "通过: ${GREEN}$PASSED${NC}"
echo -e "失败: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ 后端集成测试通过！${NC}"
    echo ""
    echo "下一步："
    echo "  1. 在浏览器中打开ThinkCraft"
    echo "  2. 创建新对话，输入产品创意"
    echo "  3. 点击'生成商业计划书'"
    echo "  4. 勾选'启用深度研究模式'"
    echo "  5. 验证生成结果"
    exit 0
else
    echo -e "${RED}✗ 有测试失败${NC}"
    echo ""
    echo "常见问题："
    echo "  - 401错误: 后端需要认证，请先登录"
    echo "  - 连接失败: 检查服务是否运行"
    echo "  - Python服务未运行: 深度研究模式不可用"
    exit 1
fi
