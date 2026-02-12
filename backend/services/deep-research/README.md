# DeepResearch 微服务

基于 OpenRouter API 调用 Alibaba Tongyi-DeepResearch-30B-A3B 模型，为 ThinkCraft 提供深度研究能力。

> 项目级启动与依赖管理以 `/Users/zqs/Downloads/project/ThinkCraft/docs/STARTUP_RUNBOOK.md` 为准。
> 本文档仅描述 DeepResearch 服务本身。

## 功能特性

- 🔬 深度研究模式：多轮迭代、网络搜索、数据验证
- 📊 支持所有商业计划书章节
- ⚙️ 可配置研究深度（shallow/medium/deep）
- 🚀 基于 OpenRouter API，无需本地 GPU
- 🔄 自动重试机制
- 🆓 支持免费模型测试（无需付费即可验证功能）

## 快速开始

### 方式一：使用免费模型测试（推荐新手）

适合开发测试和功能验证，无需付费。

```bash
cd backend/services/deep-research
cp .env.example .env
```

编辑 `.env` 文件：

```env
OPENROUTER_API_KEY=sk-or-v1-你的API密钥
OPENROUTER_MODEL=openrouter/auto  # 使用免费模型
```

启动服务：

```bash
./start.sh
```

详细说明请查看 [FREE_MODEL_TESTING.md](./FREE_MODEL_TESTING.md)

### 方式二：使用付费模型（生产环境）

适合生产环境，提供最佳质量。

### 1. 安装依赖

```bash
cd backend/services/deep-research
pip install -r requirements.txt
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的 OpenRouter API Key：

```env
OPENROUTER_API_KEY=sk-or-v1-xxxxx
```

**获取 API Key**：

1. 访问 https://openrouter.ai/
2. 注册账号并登录
3. 前往 https://openrouter.ai/keys 创建 API Key
4. 充值余额（按使用量付费）

### 3. 启动服务

```bash
python app.py
```

服务将在 `http://localhost:5001` 启动。

### 4. 测试服务

**健康检查**：

```bash
curl http://localhost:5001/health
```

**生成章节**：

```bash
curl -X POST http://localhost:5001/research/business-plan-chapter \
  -H "Content-Type: application/json" \
  -d '{
    "chapterId": "market-analysis",
    "conversationHistory": [
      {"role": "user", "content": "我想做一个AI写作助手"}
    ],
    "type": "business",
    "researchDepth": "medium"
  }'
```

## API 文档

### POST /research/business-plan-chapter

生成商业计划书章节。

**请求体**：

```json
{
  "chapterId": "market-analysis",
  "conversationHistory": [{ "role": "user", "content": "产品创意描述" }],
  "type": "business",
  "researchDepth": "medium"
}
```

**参数说明**：

- `chapterId`: 章节ID（如 market-analysis, competitive-landscape 等）
- `conversationHistory`: 对话历史数组
- `type`: 文档类型（business 或 proposal）
- `researchDepth`: 研究深度
  - `shallow`: 浅层（快速，约2分钟）
  - `medium`: 中等（平衡，约5分钟）
  - `deep`: 深度（详细，约10分钟）

**响应**：

```json
{
  "chapterId": "market-analysis",
  "content": "生成的章节内容...",
  "sources": [],
  "confidence": 0.85,
  "tokens": 3500,
  "mode": "deep",
  "depth": "medium",
  "elapsed_time": 45.2
}
```

## 支持的章节

- `executive-summary`: 执行摘要
- `market-analysis`: 市场与行业分析
- `solution`: 产品与服务
- `business-model`: 商业模式
- `competitive-landscape`: 竞争与战略
- `marketing-strategy`: 营销与销售策略
- `team-structure`: 团队介绍
- `financial-projection`: 财务预测与融资需求
- `risk-assessment`: 风险分析与附录

## 成本估算

使用 OpenRouter API 调用 Tongyi-DeepResearch-30B-A3B 的成本：

- 输入：约 $0.50 / 1M tokens
- 输出：约 $1.50 / 1M tokens

单个章节预估成本：

- 浅层模式：约 $0.01-0.02
- 中等模式：约 $0.03-0.05
- 深度模式：约 $0.08-0.12

完整商业计划书（9个章节，中等模式）：约 $0.27-0.45

## 故障排查

### 1. API Key 错误

```
错误: 未设置 OPENROUTER_API_KEY 环境变量
```

**解决**：检查 `.env` 文件是否存在且包含有效的 API Key。

### 2. 连接超时

```
DeepResearch服务错误: Connection timeout
```

**解决**：检查网络连接，确保可以访问 openrouter.ai。

### 3. 余额不足

```
DeepResearch服务错误: Insufficient credits
```

**解决**：前往 OpenRouter 充值余额。

## 生产部署

### 使用 Gunicorn

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5001 app:app
```

### 使用 Docker

```bash
docker build -t deepresearch-service .
docker run -p 5001:5001 --env-file .env deepresearch-service
```

## 许可证

MIT License
