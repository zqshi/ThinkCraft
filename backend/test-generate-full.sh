#!/bin/bash

# 测试完整文档生成API

curl -X POST http://localhost:3000/api/business-plan/generate-full \
  -H "Content-Type: application/json" \
  -d '{
    "chapterIds": ["executive-summary", "market-analysis"],
    "conversationHistory": [
      {"role": "user", "content": "我想做一个AI驱动的智能健身教练应用"},
      {"role": "assistant", "content": "很好的想法！能详细说说你的目标用户是谁吗？"},
      {"role": "user", "content": "主要面向25-40岁的都市白领，他们工作繁忙，希望在家就能获得专业的健身指导"}
    ],
    "type": "business"
  }' | jq '.'
