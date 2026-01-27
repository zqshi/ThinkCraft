#!/bin/bash

# 测试章节级别生成API（向后兼容）

curl -X POST http://localhost:3000/api/business-plan/generate-batch \
  -H "Content-Type: application/json" \
  -d '{
    "chapterIds": ["executive_summary"],
    "conversationHistory": [
      {"role": "user", "content": "我想做一个AI驱动的智能健身教练应用"},
      {"role": "assistant", "content": "很好的想法！能详细说说你的目标用户是谁吗？"},
      {"role": "user", "content": "主要面向25-40岁的都市白领"}
    ],
    "type": "business"
  }' | jq '.'
