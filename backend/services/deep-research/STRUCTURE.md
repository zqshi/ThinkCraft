# DeepResearch 微服务目录结构

```
backend/services/deep-research/
├── app.py                    # Flask 主应用
├── requirements.txt          # Python 依赖
├── .env.example             # 环境变量模板
├── .env                     # 环境变量（需创建，不提交到 Git）
├── README.md                # 服务文档
├── QUICKSTART.md            # 快速开始指南
├── CHECKLIST.md             # 验证清单
├── STRUCTURE.md             # 本文件
├── start.sh                 # 启动脚本
├── test_service.sh          # 测试脚本
└── venv/                    # Python 虚拟环境（自动创建）
```

## 文件说明

### app.py

Flask 应用主文件，包含：

- OpenRouter API 客户端配置
- 章节提示词模板
- API 路由定义
- 错误处理逻辑

### requirements.txt

Python 依赖列表：

- flask: Web 框架
- flask-cors: 跨域支持
- openai: OpenAI 兼容客户端（用于调用 OpenRouter）
- python-dotenv: 环境变量加载
- requests: HTTP 请求库

### .env.example

环境变量模板，包含：

- OPENROUTER_API_KEY: OpenRouter API 密钥

### README.md

完整的服务文档，包含：

- 功能特性
- 快速开始
- API 文档
- 成本估算
- 故障排查
- 生产部署

### QUICKSTART.md

5分钟快速开始指南，适合快速上手。

### CHECKLIST.md

集成验证清单，用于验证服务是否正常工作。

### start.sh

自动化启动脚本，包含：

- 虚拟环境创建
- 依赖安装
- 环境检查
- 服务启动

### test_service.sh

服务测试脚本，包含：

- 健康检查
- 章节生成测试
- 结果验证

## 相关文档

- [完整集成指南](../../../docs/DEEPRESEARCH_INTEGRATION.md)
- [设置总结](../../../DEEPRESEARCH_SETUP.md)
- [原始集成计划](../../../docs/loading/deepresearch-integration-plan.md)

## 工作流程

1. **开发阶段**

   ```bash
   ./start.sh              # 启动服务
   ./test_service.sh       # 测试服务
   ```

2. **调试阶段**

   ```bash
   source venv/bin/activate
   python app.py           # 直接运行，查看详细日志
   ```

3. **生产部署**
   ```bash
   gunicorn -w 4 -b 0.0.0.0:5001 --timeout 600 app:app
   ```

## 端口说明

- **5001**: Python 微服务端口
- **3000**: Node.js 后端端口
- **5173**: 前端开发服务器端口（Vite）

## 环境变量

### 必需

- `OPENROUTER_API_KEY`: OpenRouter API 密钥

### 可选

- `PORT`: 服务端口（默认 5001）
- `LOG_LEVEL`: 日志级别（默认 INFO）

## 日志

服务日志输出到标准输出，包含：

- 请求信息
- 生成进度
- 错误信息
- 性能指标

## 安全注意事项

1. **不要提交 .env 文件到 Git**
2. **定期轮换 API Key**
3. **监控 API 使用情况**
4. **设置访问限流**
5. **记录所有 API 调用**

## 维护建议

1. **定期更新依赖**

   ```bash
   pip list --outdated
   pip install --upgrade <package>
   ```

2. **监控服务健康**

   ```bash
   curl http://localhost:5001/health
   ```

3. **查看日志**

   ```bash
   tail -f app.log
   ```

4. **备份配置**
   ```bash
   cp .env .env.backup
   ```
