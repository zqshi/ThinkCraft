#!/bin/bash

# DeepResearch 服务测试脚本

SERVICE_URL="http://localhost:5001"

echo "🧪 测试 DeepResearch 微服务"
echo "================================"

# 1. 健康检查
echo ""
echo "1️⃣ 健康检查..."
health_response=$(curl -s "${SERVICE_URL}/health")
echo "响应: $health_response"

if echo "$health_response" | grep -q '"status":"ok"'; then
    echo "✅ 健康检查通过"
else
    echo "❌ 健康检查失败"
    exit 1
fi

# 2. 测试章节生成（浅层模式）
echo ""
echo "2️⃣ 测试章节生成（浅层模式）..."
shallow_response=$(curl -s -X POST "${SERVICE_URL}/research/business-plan-chapter" \
  -H "Content-Type: application/json" \
  -d '{
    "chapterId": "executive-summary",
    "conversationHistory": [
      {"role": "user", "content": "我想做一个AI写作助手，帮助用户快速生成高质量的文章"}
    ],
    "type": "business",
    "researchDepth": "shallow"
  }')

if echo "$shallow_response" | grep -q '"chapterId"'; then
    echo "✅ 浅层模式测试通过"
    echo "生成内容长度: $(echo "$shallow_response" | jq -r '.content' | wc -c)"
    echo "使用 tokens: $(echo "$shallow_response" | jq -r '.tokens')"
else
    echo "❌ 浅层模式测试失败"
    echo "响应: $shallow_response"
fi

echo ""
echo "================================"
echo "✅ 所有测试完成"
