#!/bin/bash

# 免费模型快速测试脚本

SERVICE_URL="http://localhost:5001"

echo "🆓 测试 DeepResearch 微服务（免费模型）"
echo "========================================"

# 检查服务是否运行
echo ""
echo "📡 检查服务状态..."
if ! curl -s "${SERVICE_URL}/health" > /dev/null 2>&1; then
    echo "❌ 服务未运行！"
    echo "请先启动服务: ./start.sh"
    exit 1
fi

# 1. 健康检查
echo ""
echo "1️⃣ 健康检查..."
health_response=$(curl -s "${SERVICE_URL}/health")
echo "响应: $health_response"

model_name=$(echo "$health_response" | grep -o '"model":"[^"]*"' | cut -d'"' -f4)
echo "当前模型: $model_name"

if echo "$health_response" | grep -q '"status":"ok"'; then
    echo "✅ 健康检查通过"
else
    echo "❌ 健康检查失败"
    exit 1
fi

# 2. 测试执行摘要生成（浅层模式，快速）
echo ""
echo "2️⃣ 测试执行摘要生成（浅层模式）..."
echo "⏱️  预计耗时: 30-60秒"
echo ""

start_time=$(date +%s)

response=$(curl -s -X POST "${SERVICE_URL}/research/business-plan-chapter" \
  -H "Content-Type: application/json" \
  -d '{
    "chapterId": "executive-summary",
    "conversationHistory": [
      {"role": "user", "content": "我想做一个AI写作助手，帮助用户快速生成高质量的文章。目标用户是内容创作者、学生和职场人士。"}
    ],
    "type": "business",
    "researchDepth": "shallow"
  }')

end_time=$(date +%s)
elapsed=$((end_time - start_time))

if echo "$response" | grep -q '"chapterId"'; then
    echo "✅ 生成成功！"
    echo ""
    echo "📊 生成统计:"
    echo "  - 耗时: ${elapsed}秒"
    echo "  - 内容长度: $(echo "$response" | grep -o '"content":"[^"]*"' | wc -c) 字符"
    echo "  - Tokens: $(echo "$response" | grep -o '"tokens":[0-9]*' | cut -d':' -f2)"
    echo "  - 模式: $(echo "$response" | grep -o '"mode":"[^"]*"' | cut -d'"' -f4)"
    echo ""
    echo "📝 生成内容预览:"
    content=$(echo "$response" | grep -o '"content":"[^"]*"' | cut -d'"' -f4 | head -c 200)
    echo "$content..."
    echo ""
else
    echo "❌ 生成失败"
    echo "错误响应: $response"
    exit 1
fi

# 3. 提示信息
echo ""
echo "========================================"
echo "✅ 免费模型测试完成！"
echo ""
echo "💡 提示:"
echo "  - 免费模型适合开发测试和功能验证"
echo "  - 生产环境建议使用付费的 DeepResearch 模型"
echo "  - 切换模型: 编辑 .env 文件中的 OPENROUTER_MODEL"
echo ""
echo "📚 更多信息:"
echo "  - 免费模型指南: FREE_MODEL_TESTING.md"
echo "  - 完整文档: README.md"
echo ""
