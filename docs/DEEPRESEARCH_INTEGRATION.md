# DeepResearch 集成指南

> 项目启动方式已统一，请优先遵循 `docs/STARTUP_RUNBOOK.md`。
> 本文档仅保留 DeepResearch 功能集成细节。

本文档说明如何在 ThinkCraft 中集成和使用 Alibaba Tongyi-DeepResearch-30B-A3B 模型进行深度研究。

## 架构概述

```
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐      ┌──────────────┐
│   前端 UI   │─────▶│ Node.js 后端 │─────▶│ Python 微服务   │─────▶│ OpenRouter   │
│  (React)    │      │  (Express)   │      │   (Flask)       │      │     API      │
└─────────────┘      └──────────────┘      └─────────────────┘      └──────────────┘
                                                                             │
                                                                             ▼
                                                                    ┌──────────────┐
                                                                    │ DeepResearch │
                                                                    │    Model     │
                                                                    └──────────────┘
```

## 快速开始

### 1. 获取 OpenRouter API Key

1. 访问 [OpenRouter](https://openrouter.ai/)
2. 注册账号并登录
3. 前往 [API Keys](https://openrouter.ai/keys) 页面
4. 创建新的 API Key
5. 充值余额（建议至少 $5）

### 2. 配置 Python 微服务

```bash
# 进入服务目录
cd backend/services/deep-research

# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入你的 API Key
# OPENROUTER_API_KEY=sk-or-v1-xxxxx
nano .env
```

**可选：开启真实检索/迭代（推荐）**

在 `backend/services/deep-research/.env` 中配置：

```env
# 真实检索/迭代提供商
DEEPRESEARCH_PROVIDER=tavily
DEEPRESEARCH_API_KEY=your_provider_api_key_here
DEEPRESEARCH_API_URL=
```

支持的提供商：

- `tavily`（推荐，检索能力强）
- `perplexity`
- `openai`
- `openrouter`（仅单次生成）

### 2.1 深度研究提示词维护（可热更新）

深度研究提示词已沉淀在：

- `prompts/scene-1-dialogue/deep-research/search-summary.md`
- `prompts/scene-1-dialogue/deep-research/synthesis.md`
- `prompts/scene-1-dialogue/deep-research/chapters/*.md`

修改上述 `.md` 文件后**无需重启服务**，下一次请求会自动加载最新内容（日志会输出“Prompt热更新加载”）。

### 3. 启动 Python 微服务

**方式一：使用启动脚本（推荐）**

```bash
./start.sh
```

**方式二：手动启动**

```bash
# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 启动服务
python app.py
```

服务将在 `http://localhost:5001` 启动。

### 4. 测试服务

```bash
# 运行测试脚本
./test_service.sh
```

或手动测试：

```bash
# 健康检查
curl http://localhost:5001/health

# 生成章节
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

### 5. 启动 Node.js 后端

确保后端 `.env` 文件中配置了 DeepResearch 服务 URL：

```env
DEEPRESEARCH_SERVICE_URL=http://localhost:5001
```

然后按统一启动手册启动项目（会自动拉起后端）：

```bash
./start-all.sh
```

### 6. 使用前端界面

1. 启动前端应用
2. 创建新对话
3. 点击"生成商业计划书"
4. 在章节选择弹窗中，勾选"启用深度研究模式"
5. 选择研究深度（浅层/中等/深度）
6. 选择要生成的章节
7. 点击"开始生成"

## 功能特性

### 研究深度级别

| 深度级别       | 生成时间 | Token 消耗 | 适用场景                 |
| -------------- | -------- | ---------- | ------------------------ |
| 浅层 (shallow) | ~2分钟   | ~2000      | 快速原型，初步分析       |
| 中等 (medium)  | ~5分钟   | ~4000      | 标准报告，平衡质量和速度 |
| 深度 (deep)    | ~10分钟  | ~6000      | 详细研究，高质量报告     |

### 支持的章节（九章结构）

- ✅ 执行摘要 (executive-summary)
- ✅ 市场与行业分析 (market-analysis)
- ✅ 产品与服务 (solution)
- ✅ 商业模式 (business-model)
- ✅ 竞争与战略 (competitive-landscape)
- ✅ 营销与销售策略 (marketing-strategy)
- ✅ 团队介绍 (team-structure)
- ✅ 财务预测与融资需求 (financial-projection)
- ✅ 风险分析与附录 (risk-assessment)

### 九章输出顺序（固定）

1. 执行摘要
2. 市场与行业分析
3. 产品与服务
4. 商业模式
5. 竞争与战略
6. 营销与销售策略
7. 团队介绍
8. 财务预测与融资需求
9. 风险分析与附录

> 说明：前端展示与导出均按上述顺序排列。

### 历史数据兼容

旧版本可能包含以下章节ID：

- `implementation-plan`
- `appendix`
- `risk-analysis`

系统会自动进行映射/清理并补齐九章核心结构，确保历史报告仍可正常恢复与展示。

### 降级策略

当 DeepResearch 服务不可用时，系统会：

1. 自动重试 5 次（指数退避）
2. 如果仍然失败，询问用户是否降级到 DeepSeek 快速模式
3. 用户可以选择：
   - 降级到 DeepSeek（快速生成，质量略低）
   - 停止生成（稍后重试）

## 成本估算

### OpenRouter 定价

- **输入 tokens**: ~$0.50 / 1M tokens
- **输出 tokens**: ~$1.50 / 1M tokens

### 单章节成本

| 研究深度 | 预估成本   |
| -------- | ---------- |
| 浅层     | $0.01-0.02 |
| 中等     | $0.03-0.05 |
| 深度     | $0.08-0.12 |

### 完整报告成本

- **10个章节（中等模式）**: $0.30-0.50
- **10个章节（深度模式）**: $0.80-1.20

## 故障排查

### 问题 1: 服务启动失败

**错误信息**:

```
错误: 未设置 OPENROUTER_API_KEY 环境变量
```

**解决方案**:

1. 检查 `backend/services/deep-research/.env` 文件是否存在
2. 确认文件中包含有效的 API Key
3. 重启服务

### 问题 2: 连接超时

**错误信息**:

```
DeepResearch服务错误: Connection timeout
```

**解决方案**:

1. 检查 Python 微服务是否正在运行
2. 确认端口 5001 未被占用
3. 检查防火墙设置
4. 验证网络连接

### 问题 3: API Key 无效

**错误信息**:

```
DeepResearch服务错误: Invalid API key
```

**解决方案**:

1. 前往 OpenRouter 检查 API Key 是否有效
2. 确认 API Key 格式正确（以 `sk-or-v1-` 开头）
3. 检查账户余额是否充足

### 问题 4: 生成超时

**错误信息**:

```
DeepResearch生成超时（10分钟）
```

**解决方案**:

1. 降低研究深度（从 deep 改为 medium 或 shallow）
2. 检查网络连接稳定性
3. 查看 Python 服务日志，确认是否有其他错误

### 问题 5: 余额不足

**错误信息**:

```
DeepResearch服务错误: Insufficient credits
```

**解决方案**:

1. 前往 OpenRouter 充值余额
2. 检查账户余额和使用情况

## 生产部署

### 使用 Gunicorn

```bash
cd backend/services/deep-research

# 安装 Gunicorn
pip install gunicorn

# 启动服务（4个工作进程）
gunicorn -w 4 -b 0.0.0.0:5001 --timeout 600 app:app
```

### 使用 Docker

创建 `Dockerfile`:

```dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5001

CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5001", "--timeout", "600", "app:app"]
```

构建和运行：

```bash
# 构建镜像
docker build -t deepresearch-service .

# 运行容器
docker run -d \
  -p 5001:5001 \
  --env-file .env \
  --name deepresearch \
  deepresearch-service
```

### 使用 Systemd

创建 `/etc/systemd/system/deepresearch.service`:

```ini
[Unit]
Description=DeepResearch Microservice
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/backend/services/deep-research
Environment="PATH=/path/to/venv/bin"
ExecStart=/path/to/venv/bin/gunicorn -w 4 -b 0.0.0.0:5001 --timeout 600 app:app
Restart=always

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable deepresearch
sudo systemctl start deepresearch
sudo systemctl status deepresearch
```

## 监控和日志

### 查看服务日志

```bash
# Python 服务日志
tail -f backend/services/deep-research/app.log

# Node.js 后端日志
tail -f backend/logs/app.log
```

### 监控指标

建议监控以下指标：

- **请求成功率**: 应 > 95%
- **平均响应时间**:
  - 浅层模式: < 3分钟
  - 中等模式: < 6分钟
  - 深度模式: < 12分钟
- **错误率**: 应 < 5%
- **API 成本**: 每日/每月消耗

## 安全建议

1. **保护 API Key**:
   - 不要将 `.env` 文件提交到 Git
   - 使用环境变量或密钥管理服务
   - 定期轮换 API Key

2. **限流保护**:
   - 设置每用户请求频率限制
   - 防止恶意消耗 API 额度

3. **访问控制**:
   - 仅允许授权用户使用深度研究功能
   - 记录所有 API 调用日志

4. **成本控制**:
   - 设置每日/每月预算上限
   - 监控异常消耗
   - 为用户设置使用配额

## 常见问题

### Q: 可以使用本地部署的 DeepResearch 模型吗？

A: 可以。如果你有 GPU 资源，可以参考 DeepResearch 官方文档部署本地模型，然后修改 `app.py` 中的 API 调用逻辑。

### Q: 为什么选择 OpenRouter 而不是直接调用模型？

A: OpenRouter 提供了：

- 无需 GPU 硬件
- 按使用量付费
- 高可用性和负载均衡
- 简单的 API 接口

### Q: 可以切换到其他模型吗？

A: 可以。修改 `app.py` 中的 `MODEL_NAME` 变量，OpenRouter 支持多种模型。

### Q: 如何优化成本？

A: 建议：

- 默认使用中等模式
- 仅对重要章节使用深度模式
- 缓存常见查询结果
- 设置用户配额限制

## 参考资源

- [DeepResearch GitHub](https://github.com/Alibaba-NLP/DeepResearch)
- [OpenRouter 文档](https://openrouter.ai/docs)
- [DeepResearch 技术报告](https://arxiv.org/pdf/2510.24701)
- [集成计划文档](./loading/deepresearch-integration-plan.md)

## 支持

如有问题，请：

1. 查看本文档的故障排查部分
2. 检查服务日志
3. 提交 Issue 到项目仓库
