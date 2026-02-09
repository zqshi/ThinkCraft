#!/bin/bash

# DeepResearch 服务启动脚本

echo "🚀 启动 DeepResearch 微服务..."

# 检查 Python 版本
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "Python 版本: $python_version"

# 检查是否存在虚拟环境
if [ ! -d "venv" ]; then
    echo "📦 创建虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
echo "🔧 激活虚拟环境..."
source venv/bin/activate

# 安装依赖
echo "📥 安装依赖..."
pip install -r requirements.txt

# 检查 .env 文件
if [ ! -f ".env" ]; then
    echo "⚠️  警告: .env 文件不存在"
    echo "📝 请复制 .env.example 并填入你的 API Key:"
    echo "   cp .env.example .env"
    echo "   然后编辑 .env 文件"
    exit 1
fi

# 检查 API Key
if ! grep -q "OPENROUTER_API_KEY=sk-" .env; then
    echo "⚠️  警告: OPENROUTER_API_KEY 未配置"
    echo "📝 请在 .env 文件中设置你的 OpenRouter API Key"
    exit 1
fi

# 启动服务
echo "✅ 启动服务..."
python app.py
