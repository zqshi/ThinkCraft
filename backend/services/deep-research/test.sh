#!/bin/bash

# DeepResearch集成测试脚本

echo "🧪 DeepResearch集成测试"
echo "========================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试计数
PASSED=0
FAILED=0

# 测试函数
test_endpoint() {
    local name=$1
    local url=$2
    local method=$3
    local data=$4
    local expected_status=$5

    echo -n "测试: $name ... "

    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$url")
    else
        response=$(curl -s -w "\n%{http_code}" -X POST "$url" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi

    status_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | sed '$d')

    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ 通过${NC}"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}✗ 失败${NC}"
        echo "  预期状态码: $expected_status"
        echo "  实际状态码: $status_code"
        echo "  响应内容: $body"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# 1. 测试Python微服务健康检查
echo "1️⃣  测试Python微服务"
echo "-------------------"
test_endpoint \
    "健康检查" \
    "http://localhost:5001/health" \
    "GET" \
    "" \
    "200"

# 2. 测试章节生成（模拟模式）
test_endpoint \
    "章节生成（市场分析）" \
    "http://localhost:5001/research/business-plan-chapter" \
    "POST" \
    '{"chapterId":"market-analysis","conversationHistory":[{"role":"user","content":"测试产品"}],"type":"business","researchDepth":"medium"}' \
    "200"

echo ""
echo "2️⃣  测试Node.js后端集成"
echo "----------------------"

# 3. 测试Node.js后端（快速模式）
test_endpoint \
    "快速生成模式" \
    "http://localhost:3000/api/business-plan/generate-chapter" \
    "POST" \
    '{"chapterId":"market-analysis","conversationHistory":[{"role":"user","content":"测试产品"}],"type":"business","useDeepResearch":false}' \
    "200"

# 4. 测试Node.js后端（深度研究模式）
echo ""
echo -e "${YELLOW}注意: 深度研究模式测试需要Python微服务正常运行${NC}"
test_endpoint \
    "深度研究模式" \
    "http://localhost:3000/api/business-plan/generate-chapter" \
    "POST" \
    '{"chapterId":"market-analysis","conversationHistory":[{"role":"user","content":"测试产品"}],"type":"business","useDeepResearch":true,"researchDepth":"medium"}' \
    "200"

# 测试总结
echo ""
echo "========================"
echo "测试总结"
echo "========================"
echo -e "通过: ${GREEN}$PASSED${NC}"
echo -e "失败: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ 所有测试通过！${NC}"
    exit 0
else
    echo -e "${RED}✗ 有测试失败，请检查日志${NC}"
    exit 1
fi
