# ThinkCraft 生产级重构实施计划

> **文档版本**: v1.0
> **创建日期**: 2026-01-16
> **预计周期**: 8-10周
> **目标**: 按照真实生产投产标准完成全量开发

---

## 执行原则

**用户确认的关键决策**：
- ✅ **多模态方案**：混合方案（前端OCR+语音转文本，后端语义理解）
- ✅ **时间规划**：8-10周完整实施
- ✅ **部署环境**：先做好容器化，保持部署灵活性
- ✅ **测试策略**：严格TDD（测试先行，覆盖率70%+）

**核心原则**：
1. **测试先行**：每个功能先写测试再写实现
2. **真实环境**：使用真实PostgreSQL、Redis、DeepSeek API（不用mock）
3. **渐进式**：分5个Phase推进，每个Phase可独立验收
4. **生产标准**：所有决策以生产环境稳定性为第一优先级

---

## Phase 0: 基础设施准备（Week 1-2）

**目标**：建立完整的开发、测试、生产环境

### 任务清单

#### 0.1 Docker容器化（3天）

**新建文件**：
```
backend/Dockerfile
backend/.dockerignore
docker-compose.yml
docker-compose.prod.yml
```

**实施步骤**：
1. 编写 `backend/Dockerfile`
   - 使用 Node.js 18 Alpine镜像
   - 多阶段构建（构建阶段 + 运行阶段）
   - 仅安装生产依赖

2. 编写 `docker-compose.yml`（开发环境）
   - 服务：backend、postgres、redis
   - 数据卷持久化
   - 热重载支持（nodemon）

3. 编写 `docker-compose.prod.yml`（生产环境）
   - 添加nginx反向代理
   - 健康检查配置
   - 资源限制配置

**验收标准**：
- `docker-compose up` 能完整启动所有服务
- 访问 http://localhost:3000/api/health 返回200
- 数据库自动迁移运行成功

#### 0.2 中间件安装（2天）

**新增依赖**：
```json
{
  "dependencies": {
    "ioredis": "^5.3.2",
    "bull": "^4.12.0",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.2"
  }
}
```

**新建文件**：
```
backend/infrastructure/cache/CacheManager.js
backend/infrastructure/cache/RedisClient.js
backend/infrastructure/queue/QueueManager.js
backend/infrastructure/queue/jobs/ReportGenerationJob.js
backend/infrastructure/queue/jobs/CollaborationJob.js
```

**实施步骤**：
1. 配置Redis客户端（ioredis）
2. 实现CacheManager（统一缓存接口）
3. 配置Bull队列
4. 创建异步任务Job类

**验收标准**：
- Redis连接成功，能读写数据
- Bull队列能正常入队/出队
- 健康检查端点包含Redis和Queue状态

#### 0.3 监控告警搭建（2天）

**新增依赖**：
```json
{
  "dependencies": {
    "@sentry/node": "^7.100.0"
  }
}
```

**修改文件**：
```
backend/server.js
backend/.env.example
```

**实施步骤**：
1. 注册Sentry项目，获取DSN
2. 在 `server.js` 中集成Sentry
3. 优化Winston日志配置（JSON格式）
4. 添加自定义错误类和错误分类

**验收标准**：
- Sentry能捕获测试错误并分类
- Winston日志输出JSON格式
- 日志包含requestId/traceId

#### 0.4 CI/CD流水线（2天）

**新建文件**：
```
.github/workflows/backend-test.yml
.github/workflows/frontend-test.yml
.github/workflows/docker-build.yml
```

**实施步骤**：
1. 创建后端测试workflow
   - 运行 `npm test`
   - 检查覆盖率 ≥30%（Phase 0目标）
   - 上传覆盖率报告到Codecov

2. 创建前端测试workflow
   - 运行 `flutter test`

3. 创建Docker构建workflow
   - 构建镜像
   - 推送到Docker Hub

**验收标准**：
- 所有GitHub Actions流水线绿灯
- PR合并前自动运行测试
- 覆盖率报告自动生成

---

## Phase 1: TDD测试补全（Week 3-5）

**目标**：测试覆盖率从<5%提升到70%+

### 1.1 测试基础设施（2天）

**修改文件**：
```
backend/tests/setup.js
backend/tests/helpers/testDatabase.js
backend/jest.config.js
```

**新建文件**：
```
backend/tests/helpers/RedisHelper.js
backend/tests/helpers/DeepSeekMockServer.js
```

**实施步骤**：
1. 增强 `tests/setup.js`
   - 添加Redis测试环境初始化
   - 添加数据库清理钩子
   - 配置测试隔离

2. 创建DeepSeek Mock Server（真实HTTP服务，非简单mock）
   - 模拟API行为
   - 支持不同响应场景
   - 记录调用历史

3. 更新 `jest.config.js`
   - 覆盖率阈值改为70%
   - 添加测试分组（unit/integration）

**验收标准**：
- 测试环境完全隔离
- 每个测试后自动清理数据
- Mock Server能模拟DeepSeek所有响应

### 1.2 后端单元测试（2周）

**测试优先级和文件清单**：

**P0 - Week 3（核心Domain）**：
```
backend/tests/unit/domains/agent/
├── AgentHireService.test.js ✅ 已有
├── TaskAssignmentService.test.js ⚠️ 新增
├── SalaryService.test.js ⚠️ 新增
├── AgentPostgresRepository.test.js ⚠️ 新增
└── Agent.test.js ⚠️ 新增（实体验证逻辑）

backend/tests/unit/domains/collaboration/
├── CollaborationPlanningService.test.js ⚠️ 新增
├── CollaborationExecutionService.test.js ⚠️ 新增
├── CollaborationPlan.test.js ⚠️ 新增
└── CollaborationRepository.test.js ⚠️ 新增

backend/tests/unit/domains/conversation/
├── ConversationService.test.js ⚠️ 新增
└── ConversationRepository.test.js ⚠️ 新增
```

**P1 - Week 4（业务Domain）**：
```
backend/tests/unit/domains/businessPlan/
├── BusinessPlanGenerationService.test.js ⚠️ 新增
└── BusinessPlanRepository.test.js ⚠️ 新增

backend/tests/unit/domains/report/
├── ReportGenerationService.test.js ⚠️ 新增
└── ReportRepository.test.js ⚠️ 新增

backend/tests/unit/domains/demo/
├── DemoGenerationService.test.js ⚠️ 新增
└── DemoRepository.test.js ⚠️ 新增
```

**P2 - Week 5（支撑Domain）**：
```
backend/tests/unit/domains/pdfExport/
└── PdfExportService.test.js ⚠️ 新增

backend/tests/unit/domains/share/
└── ShareService.test.js ⚠️ 新增
```

**测试编写原则**：
1. **测试先行**：先写测试用例，描述期望行为
2. **AAA模式**：Arrange（准备）→ Act（执行）→ Assert（断言）
3. **覆盖场景**：正常流程 + 边界条件 + 错误场景
4. **真实数据**：使用真实PostgreSQL，不用内存数据库

**测试模板示例**：
```javascript
// TaskAssignmentService.test.js
describe('TaskAssignmentService', () => {
  let service;
  let mockRepository;

  beforeEach(() => {
    // Arrange: 准备测试环境
    mockRepository = new AgentPostgresRepository();
    service = new TaskAssignmentService(mockRepository);
  });

  describe('assignTask', () => {
    it('应该成功分配任务给可用Agent', async () => {
      // Arrange
      const agent = await createTestAgent({ status: 'idle' });
      const task = { description: '设计数据库schema' };

      // Act
      const result = await service.assignTask(agent.id, task);

      // Assert
      expect(result.success).toBe(true);
      expect(result.agent.status).toBe('busy');
    });

    it('应该拒绝给忙碌Agent分配任务', async () => {
      // Arrange
      const agent = await createTestAgent({ status: 'busy' });
      const task = { description: '设计数据库schema' };

      // Act & Assert
      await expect(
        service.assignTask(agent.id, task)
      ).rejects.toThrow('Agent当前忙碌');
    });
  });
});
```

**验收标准**：
- 所有Domain Service测试覆盖率 ≥ 85%
- 所有Repository测试覆盖率 ≥ 75%
- 总体覆盖率 ≥ 70%

### 1.3 后端集成测试（0.5周）

**新建文件**：
```
backend/tests/integration/api/
├── agents.api.test.js ⚠️ 新增
├── collaboration.api.test.js ⚠️ 新增
├── conversation.api.test.js ⚠️ 新增
├── report.api.test.js ⚠️ 新增
└── auth.api.test.js ⚠️ 新增
```

**实施步骤**：
1. 使用supertest测试所有API端点
2. 测试完整的请求-响应流程
3. 测试认证和授权逻辑
4. 测试错误处理

**集成测试示例**：
```javascript
// agents.api.test.js
import request from 'supertest';
import app from '../../server.js';

describe('POST /api/agents/hire', () => {
  it('应该成功雇佣Agent', async () => {
    const response = await request(app)
      .post('/api/agents/hire')
      .set('Authorization', 'Bearer test-token')
      .send({
        userId: 'test-user',
        agentTypeId: 'developer',
        nickname: 'Dev Agent'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.agent.nickname).toBe('Dev Agent');
  });

  it('应该返回401如果未认证', async () => {
    const response = await request(app)
      .post('/api/agents/hire')
      .send({ userId: 'test-user' });

    expect(response.status).toBe(401);
  });
});
```

**验收标准**：
- 所有API端点有集成测试
- 测试覆盖认证、授权、错误处理
- 集成测试通过率100%

### 1.4 前端测试（0.5周）

**新建文件**：
```
frontend/test/unit/domain/agent/
├── agent_test.dart ⚠️ 新增
└── agent_type_test.dart ⚠️ 新增

frontend/test/unit/application/usecases/
└── hire_agent_usecase_test.dart ⚠️ 新增

frontend/test/unit/infrastructure/repositories/
└── agent_repository_impl_test.dart ⚠️ 新增

frontend/test/widget/
└── pages/
    └── home_page_test.dart ⚠️ 新增
```

**验收标准**：
- 前端测试覆盖率 ≥ 60%
- Domain层测试覆盖率 ≥ 70%
- 所有测试通过

---

## Phase 2: 后端生产化（Week 6-7）

**目标**：达到生产投产标准

### 2.1 性能优化（3天）

**新建文件**：
```
backend/infrastructure/cache/strategies/AgentCacheStrategy.js
backend/infrastructure/cache/strategies/ConversationCacheStrategy.js
backend/config/cache.js
```

**修改文件**：
```
backend/domains/agent/services/AgentHireService.js
backend/domains/conversation/services/ConversationService.js
```

**实施步骤**：

**1. 实现缓存层**：
```javascript
// CacheManager.js
class CacheManager {
  constructor(redisClient) {
    this.redis = redisClient;
    this.TTL = {
      AGENT_LIST: 300,      // 5分钟
      CONVERSATION: 3600,   // 1小时
      REPORT: 86400         // 24小时
    };
  }

  async getAgentList(userId) {
    const key = `agents:${userId}`;
    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached);

    // 查询数据库...
    const agents = await this.repository.findByUserId(userId);
    await this.redis.setex(key, this.TTL.AGENT_LIST, JSON.stringify(agents));
    return agents;
  }
}
```

**2. 实现异步任务队列**：
```javascript
// jobs/ReportGenerationJob.js
import { Queue, Worker } from 'bull';

export const reportQueue = new Queue('report-generation', {
  redis: { host: 'redis', port: 6379 }
});

export const reportWorker = new Worker('report-generation', async (job) => {
  const { conversationId, userId } = job.data;
  const report = await reportService.generateReport(conversationId, userId);
  return report;
}, {
  connection: { host: 'redis', port: 6379 }
});
```

**3. 数据库优化**：
- 添加索引（userId、status、createdAt字段）
- 配置连接池（max: 20, idle: 10000）
- 实现查询超时（5s）

**测试要求**：
- 缓存命中率测试
- 队列性能测试
- 数据库查询性能基准测试

**验收标准**：
- Redis缓存命中率 > 50%
- API平均响应时间 < 200ms
- 数据库连接池利用率 < 80%

### 2.2 安全加固（2天）

**新建文件**：
```
backend/middleware/auth.js
backend/middleware/helmet-config.js
backend/middleware/inputValidation.js
backend/config/security.js
```

**修改文件**：
```
backend/server.js
backend/.env.example
```

**实施步骤**：

**1. JWT认证**：
```javascript
// middleware/auth.js
import jwt from 'jsonwebtoken';

export function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Missing token' }
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Invalid token' }
    });
  }
}
```

**2. Helmet安全头**：
```javascript
// server.js
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

**3. 输入验证**（使用joi）：
```javascript
// middleware/inputValidation.js
import Joi from 'joi';

export const validateAgentHire = (req, res, next) => {
  const schema = Joi.object({
    userId: Joi.string().required(),
    agentTypeId: Joi.string().required(),
    nickname: Joi.string().min(1).max(50).required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: error.details[0].message }
    });
  }
  next();
};
```

**测试要求**：
- 认证绕过测试
- 输入验证测试（恶意输入、边界值）
- 安全头检查

**验收标准**：
- 所有API端点受认证保护
- Helmet安全头配置正确
- 输入验证覆盖所有端点

### 2.3 监控与告警（2天）

**新建文件**：
```
backend/infrastructure/monitoring/MetricsCollector.js
backend/infrastructure/monitoring/HealthCheck.js
backend/routes/health.js
```

**实施步骤**：

**1. 自定义监控指标**：
```javascript
// MetricsCollector.js
class MetricsCollector {
  recordAPICall(endpoint, duration, statusCode) {
    logger.info('api_call', {
      endpoint,
      duration,
      statusCode,
      timestamp: new Date().toISOString()
    });
  }

  recordCacheHit(key, hit) {
    logger.info('cache_metric', { key, hit });
  }
}
```

**2. 健康检查增强**：
```javascript
// routes/health.js
export async function healthCheck(req, res) {
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      queue: await checkQueue()
    },
    resources: {
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    }
  };

  const healthy = Object.values(checks.services)
    .every(s => s.status === 'ok');

  res.status(healthy ? 200 : 503).json(checks);
}
```

**验收标准**：
- Sentry能捕获并分类错误
- 健康检查端点返回详细状态
- 关键指标记录到日志

---

## Phase 3: 前端完整实现（Week 8-11）

**目标**：Flutter UI完成度从40% → 100%，实现MVP所有功能

### 3.1 依赖安装（1天）

**修改文件**：
```
frontend/pubspec.yaml
```

**新增依赖**：
```yaml
dependencies:
  # 多模态输入
  speech_to_text: ^6.6.2
  flutter_sound: ^9.4.12
  image_picker: ^1.0.7
  google_mlkit_text_recognition: ^0.13.0

  # UI增强
  flutter_keyboard_visibility: ^5.4.0
  cached_network_image: ^3.3.0
  flutter_svg: ^2.0.9

  # 本地存储
  hive: ^2.2.3
  hive_flutter: ^1.1.0

  # 工具
  intl: ^0.19.0
  path_provider: ^2.1.2

  # 错误追踪
  sentry_flutter: ^7.15.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  build_runner: ^2.4.8
  json_serializable: ^6.7.1
  mocktail: ^1.0.3
```

### 3.2 核心业务流程UI（2周）

#### Week 8: 对话 + 报告生成

**新建文件**：
```
frontend/lib/presentation/pages/conversations/
├── conversation_list_page.dart ⚠️ 新增
├── conversation_detail_page.dart ⚠️ 新增（替换现有）
├── socratic_dialogue_page.dart ⚠️ 新增
└── widgets/
    ├── message_bubble.dart ⚠️ 新增
    ├── input_field.dart ⚠️ 新增
    ├── dialogue_progress_indicator.dart ⚠️ 新增
    └── voice_input_button.dart ⚠️ 新增
```

**实施步骤**：

**1. 对话列表页面**：
- 显示所有对话（对话卡片流）
- 支持按状态筛选（待分析、已分析）
- 支持搜索和排序

**2. 苏格拉底式对话页面**：
```dart
// socratic_dialogue_page.dart
class SocraticDialoguePage extends ConsumerStatefulWidget {
  final String conversationId;

  @override
  _SocraticDialoguePageState createState() => _SocraticDialoguePageState();
}

class _SocraticDialoguePageState extends ConsumerState<SocraticDialoguePage> {
  int currentStep = 0;
  final List<String> questions = [
    '你在为谁解决问题？（目标用户）',
    '你解决的核心痛点是什么？',
    '你的解决方案是什么，为何独特？',
    '如何知道这个想法成功了？'
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('深度分析')),
      body: Column(
        children: [
          DialogueProgressIndicator(
            currentStep: currentStep,
            totalSteps: questions.length,
          ),
          Expanded(
            child: MessageList(conversationId: widget.conversationId),
          ),
          InputField(
            hint: questions[currentStep],
            onSubmit: _handleAnswer,
            onVoiceInput: _handleVoiceInput,
          ),
        ],
      ),
    );
  }
}
```

**3. 报告预览页面**：
- Markdown渲染
- 精益画布可视化
- 分享功能集成

**测试要求**：
- Widget测试（每个组件）
- 集成测试（完整对话流程）

**验收标准**：
- 对话流程流畅，无卡顿
- 所有4个引导问题正确展示
- 报告生成后能正确展示

#### Week 9: Agent管理 + 协同编排

**新建文件**：
```
frontend/lib/presentation/pages/agents/
├── agent_list_page.dart ⚠️ 新增
├── agent_hire_page.dart ⚠️ 新增
├── agent_detail_page.dart ⚠️ 新增
└── widgets/
    ├── agent_card.dart ⚠️ 新增
    ├── skill_chip.dart ⚠️ 新增
    └── hire_form.dart ⚠️ 新增

frontend/lib/presentation/pages/collaboration/
├── collaboration_planning_page.dart ⚠️ 新增
├── collaboration_execution_page.dart ⚠️ 新增
└── widgets/
    ├── workflow_step_card.dart ⚠️ 新增
    ├── agent_selector.dart ⚠️ 新增
    └── execution_progress.dart ⚠️ 新增
```

**验收标准**：
- 能成功雇佣Agent
- 能创建协同计划并执行
- UI适配iOS/Android

### 3.3 多模态输入（1周）⚠️ **MVP核心功能**

#### Week 10: 语音输入 + 图片OCR

**新建文件**：
```
frontend/lib/core/multimodal/
├── speech_service.dart ⚠️ 新增
├── image_processor.dart ⚠️ 新增
└── multimodal_input_manager.dart ⚠️ 新增

frontend/lib/presentation/widgets/input/
├── voice_recorder_widget.dart ⚠️ 新增
├── image_picker_widget.dart ⚠️ 新增
└── multimodal_input_field.dart ⚠️ 新增
```

**实施步骤**：

**1. 语音输入（前端处理）**：
```dart
// speech_service.dart
class SpeechService {
  final SpeechToText _speech = SpeechToText();

  Future<String> startListening() async {
    bool available = await _speech.initialize();
    if (!available) throw Exception('语音识别不可用');

    String result = '';
    await _speech.listen(
      onResult: (val) => result = val.recognizedWords,
    );

    return result;
  }

  Future<void> stopListening() async {
    await _speech.stop();
  }
}
```

**2. 图片OCR（前端处理）**：
```dart
// image_processor.dart
class ImageProcessor {
  final TextRecognizer _recognizer = TextRecognizer();

  Future<String> extractTextFromImage(String imagePath) async {
    final inputImage = InputImage.fromFilePath(imagePath);
    final RecognizedText recognizedText = await _recognizer.processImage(inputImage);

    return recognizedText.text;
  }
}
```

**3. 后端语义理解（新增API）**：

**新建文件**：
```
backend/routes/multimodal.js ⚠️ 新增
backend/domains/multimodal/ ⚠️ 新增整个Domain
```

```javascript
// routes/multimodal.js
router.post('/analyze-text', async (req, res) => {
  const { rawText, context } = req.body;

  // 调用DeepSeek理解语义、补充信息
  const analysis = await multimodalService.analyzeText(rawText, context);

  res.json({ success: true, analysis });
});
```

**测试要求**：
- 真机测试语音识别准确率
- 真机测试OCR准确率
- 测试前后端集成流程

**验收标准**：
- 语音识别准确率 > 90%（普通话）
- OCR识别准确率 > 85%（印刷体）
- 混合输入（语音+图片+文字）能正确处理

### 3.4 UI组件库（0.5周）

**新建文件**：
```
frontend/lib/presentation/widgets/common/
├── primary_button.dart ⚠️ 新增
├── secondary_button.dart ⚠️ 新增
├── text_input.dart ⚠️ 新增
├── loading_overlay.dart ⚠️ 新增
├── error_dialog.dart ⚠️ 新增
├── confirmation_dialog.dart ⚠️ 新增
└── empty_state.dart ⚠️ 新增

frontend/lib/presentation/widgets/business/
├── agent_avatar.dart ⚠️ 新增
├── status_badge.dart ⚠️ 新增
├── markdown_viewer.dart ⚠️ 新增
└── lean_canvas_widget.dart ⚠️ 新增（精益画布可视化）
```

**验收标准**：
- 所有通用组件有文档
- 所有组件有Widget测试
- 设计系统一致性检查通过

---

## Phase 4: 集成与部署（Week 12）

**目标**：完整的CI/CD流程和部署方案

### 4.1 CI/CD完善（2天）

**新建文件**：
```
.github/workflows/production-deploy.yml
.github/workflows/security-scan.yml
```

**production-deploy.yml**：
```yaml
name: Production Deployment

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
      redis:
        image: redis:7
    steps:
      - uses: actions/checkout@v3
      - name: Run backend tests
        run: |
          cd backend
          npm install
          npm run test:coverage
      - name: Check coverage
        run: |
          if [ $(cat coverage/coverage-summary.json | jq '.total.lines.pct') -lt 70 ]; then
            echo "Coverage below 70%"
            exit 1
          fi

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Build Docker image
        run: docker build -t thinkcraft-backend:${{ github.sha }} ./backend
      - name: Push to Docker Hub
        run: docker push thinkcraft-backend:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: |
          echo "Deployment ready - image: thinkcraft-backend:${{ github.sha }}"
```

**验收标准**：
- CI/CD流水线全绿
- 测试覆盖率 ≥ 70%自动检查
- Docker镜像自动构建推送

### 4.2 生产环境配置（2天）

**新建文件**：
```
nginx.conf
backend/ecosystem.config.js（PM2配置）
deploy.sh
```

**nginx.conf**：
```nginx
upstream backend {
    server backend:3000;
}

server {
    listen 80;
    server_name _;

    location /api {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}
```

**ecosystem.config.js**：
```javascript
module.exports = {
  apps: [{
    name: 'thinkcraft-backend',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    max_memory_restart: '1G'
  }]
};
```

**验收标准**：
- Nginx反向代理配置正确
- PM2集群模式运行
- 生产环境一键部署

### 4.3 Flutter发布（2天）

**实施步骤**：

1. **Android发布**：
```bash
cd frontend
flutter build apk --release
flutter build appbundle --release
```

2. **iOS发布**：
```bash
flutter build ios --release
# 通过Xcode上传到App Store Connect
```

3. **配置应用签名和版本**

**验收标准**：
- Android APK能安装运行
- iOS IPA能安装运行
- 连接生产API成功

---

## Phase 5: 生产验证（Week 13）

**目标**：确保生产环境稳定性

### 5.1 压力测试（2天）

**新建文件**：
```
tests/load/k6-load-test.js
tests/load/scenarios.js
```

**k6测试脚本**：
```javascript
// k6-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },  // 爬升到100并发
    { duration: '5m', target: 100 },  // 保持100并发
    { duration: '2m', target: 0 },    // 降至0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  // 测试雇佣Agent API
  let res = http.post('http://localhost:3000/api/agents/hire',
    JSON.stringify({
      userId: 'test_user',
      agentTypeId: 'developer',
      nickname: 'Test Agent'
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

**性能目标**：
- QPS ≥ 500
- P95响应时间 < 500ms
- P99响应时间 < 1s
- 错误率 < 0.1%

### 5.2 安全审计（2天）

**使用工具**：
- OWASP ZAP（自动化扫描）
- npm audit（依赖漏洞扫描）

**审计清单**：
```
- [ ] SQL注入测试
- [ ] XSS攻击测试
- [ ] CSRF保护验证
- [ ] 敏感信息泄露检查
- [ ] 身份认证绕过测试
- [ ] 权限提升测试
- [ ] 依赖漏洞扫描
- [ ] API速率限制测试
```

**验收标准**：
- 0个高危漏洞
- 0个中危漏洞（或有明确缓解措施）
- npm audit无漏洞

### 5.3 生产检查清单（1天）

```markdown
## 基础设施
- [ ] 数据库备份策略配置（每日自动备份）
- [ ] Redis持久化开启（AOF模式）
- [ ] 日志聚合配置（7天保留）
- [ ] SSL证书有效（有效期>30天）
- [ ] 域名DNS配置正确

## 监控告警
- [ ] Sentry错误告警配置
- [ ] 服务器CPU/内存告警（>80%触发）
- [ ] 磁盘空间告警（>90%触发）
- [ ] API可用性监控
- [ ] 数据库慢查询监控

## 安全
- [ ] 环境变量加密存储
- [ ] API Key轮换机制
- [ ] Rate Limiting生效
- [ ] CORS白名单配置
- [ ] 数据库只读账号（供分析使用）

## 业务
- [ ] 用户数据导出功能（GDPR合规）
- [ ] 敏感操作审计日志
- [ ] 灰度发布机制
- [ ] 回滚方案（5分钟内回滚）
- [ ] 故障恢复演练
```

**验收标准**：
- 所有检查项100%完成
- 回滚演练成功
- 监控大盘数据正常

---

## 成功标准

### 技术指标
- ✅ 测试覆盖率 ≥ 70%（后端）、≥ 60%（前端）
- ✅ API响应时间 P95 < 500ms
- ✅ Docker化完成，一键启动
- ✅ CI/CD流水线全绿
- ✅ 0个高危安全漏洞

### 业务指标（MVP）
- ✅ 对话功能完整可用
- ✅ 多模态输入（语音+图片+文字）全部实现
- ✅ 报告生成并能分享
- ✅ Agent雇佣和协同编排可用
- ✅ 前后端完整集成

### 生产就绪度
- ✅ 监控告警配置完成
- ✅ 数据备份策略就绪
- ✅ 回滚方案验证通过
- ✅ 文档完整（API文档、部署文档、运维手册）

---

## 风险与缓解措施

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| Flutter开发延期 | 高 | 高 | Week 8-9优先核心流程，降低UI复杂度 |
| 测试覆盖率不达标 | 中 | 中 | 每日检查覆盖率，及时补充 |
| DeepSeek API限流 | 中 | 高 | 实现本地缓存 + 队列控制 |
| 多模态识别准确率低 | 中 | 中 | 提供手动修正入口 |
| 数据库性能瓶颈 | 低 | 中 | 提前优化索引，实现缓存层 |

---

## 下一步行动

1. **立即执行**：创建 `docker-compose.yml` 并验证容器化启动
2. **Week 1准备**：安装Redis、配置Bull队列、集成Sentry
3. **Week 3启动**：开始编写第一批测试（AgentHireService已有模板）

---

**重要提醒**：
- 每个Phase结束必须验收，不达标不进入下一Phase
- 测试覆盖率每日检查，绝不妥协
- 每周五进行进度Review和风险评估
- 保持与业务需求（MVP.md）的对齐，避免过度设计
