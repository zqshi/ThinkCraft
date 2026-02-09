#!/bin/bash

# DeepResearch Python微服务测试脚本（简化版）

echo "🧪 DeepResearch Python微服务测试"
echo "=================================="
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
        response=$(curl -s -o /tmp/response_body.txt -w "%{http_code}" "$url")
        status_code=$response
        body=$(cat /tmp/response_body.txt)
    else
        response=$(curl -s -o /tmp/response_body.txt -w "%{http_code}" -X POST "$url" \
            -H "Content-Type: application/json" \
            -d "$data")
        status_code=$response
        body=$(cat /tmp/response_body.txt)
    fi

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

# 检查服务是否运行
echo "检查Python微服务状态..."
if ! curl -s http://localhost:5001/health > /dev/null 2>&1; then
    echo -e "${RED}✗ Python微服务未运行${NC}"
    echo ""
    echo "请先启动Python微服务："
    echo "  cd backend/services/deep-research"
    echo "  ./start.sh"
    echo ""
    echo "或手动启动："
    echo "  python3 app.py"
    exit 1
fi

echo -e "${GREEN}✓ Python微服务正在运行${NC}"
echo ""

# 1. 测试健康检查
echo "1️⃣  测试健康检查"
echo "----------------"
test_endpoint \
    "健康检查" \
    "http://localhost:5001/health" \
    "GET" \
    "" \
    "200"

echo ""

# 2. 测试章节生成（市场分析）
echo "2️⃣  测试章节生成"
echo "----------------"
test_endpoint \
    "市场分析章节" \
    "http://localhost:5001/research/business-plan-chapter" \
    "POST" \
    '{"chapterId":"market-analysis","conversationHistory":[{"role":"user","content":"我想做一个AI写作助手"}],"type":"business","researchDepth":"medium"}' \
    "200"

echo ""

# 3. 测试不同深度级别
echo "3️⃣  测试深度级别"
echo "----------------"
test_endpoint \
    "浅层研究" \
    "http://localhost:5001/research/business-plan-chapter" \
    "POST" \
    '{"chapterId":"market-analysis","conversationHistory":[{"role":"user","content":"测试"}],"type":"business","researchDepth":"shallow"}' \
    "200"

test_endpoint \
    "深度研究" \
    "http://localhost:5001/research/business-plan-chapter" \
    "POST" \
    '{"chapterId":"market-analysis","conversationHistory":[{"role":"user","content":"测试"}],"type":"business","researchDepth":"deep"}' \
    "200"

echo ""

# 4. 测试不同章节
echo "4️⃣  测试不同章节"
echo "----------------"
test_endpoint \
    "竞争格局章节" \
    "http://localhost:5001/research/business-plan-chapter" \
    "POST" \
    '{"chapterId":"competitive-landscape","conversationHistory":[{"role":"user","content":"测试"}],"type":"business"}' \
    "200"

test_endpoint \
    "财务预测章节" \
    "http://localhost:5001/research/business-plan-chapter" \
    "POST" \
    '{"chapterId":"financial-projection","conversationHistory":[{"role":"user","content":"测试"}],"type":"business"}' \
    "200"

echo ""

# 5. 测试错误处理
echo "5️⃣  测试错误处理"
echo "----------------"
test_endpoint \
    "缺少参数" \
    "http://localhost:5001/research/business-plan-chapter" \
    "POST" \
    '{}' \
    "400"

echo ""

# 测试总结
echo "=================================="
echo "测试总结"
echo "=================================="
echo -e "通过: ${GREEN}$PASSED${NC}"
echo -e "失败: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ 所有测试通过！${NC}"
    echo ""
    echo "Python微服务工作正常，可以继续测试前端集成。"
    exit 0
else
    echo -e "${RED}✗ 有测试失败，请检查日志${NC}"
    exit 1
fi
