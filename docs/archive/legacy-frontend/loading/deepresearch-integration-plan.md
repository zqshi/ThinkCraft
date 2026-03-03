# DeepResearch集成实施计划（分阶段）

> **说明**：本计划分为两个阶段
>
> - **第一阶段**：基础功能实现（UI、API、Python微服务、重试机制、降级策略）
> - **第二阶段**：后续扩展和优化（详细执行计划见文档末尾）

## 背景与目标

### 需求背景

用户希望在ThinkCraft的商业计划书和产品立项材料生成功能中集成Alibaba-NLP/DeepResearch，以提升报告的专业性和深度。当前系统使用DeepSeek API进行快速生成，但缺乏深度研究能力（多轮迭代、网络搜索、数据验证）。

### 核心需求

1. **在章节选择弹窗中添加深度研究开关**：针对当前对话（chatID）和文档类型（商业计划书/产品立项材料）的设置，不同chatID之间相互隔离
2. **开关作用范围**：整篇文档，不区分章节
   - **开启时**：所有选中的章节都使用DeepResearch深度研究模式生成
   - **未开启时**：所有章节都使用现有的DeepSeek快速生成逻辑
3. **降级策略**：DeepResearch服务不可用时，**主动询问用户**是否降级到DeepSeek，而不是自动降级
4. **超时和重试机制**：
   - 超时时间尽可能放大（建议10分钟/章节），避免正常生成被误判为超时
   - 识别服务异常（连接失败、500错误等），采用5次重试机制
   - 5次重试仍失败后，告知用户并支持用户手动重试
5. **支持范围**：所有章节都支持深度研究（不区分章节类型）

### 技术方案

- **前端**：在章节选择弹窗添加开关，状态与chatID+文档类型关联存储
- **后端**：Python微服务集成DeepResearch，Node.js后端通过HTTP调用
- **数据隔离**：每个chatID的每种文档类型独立的深度研究设置
- **生成逻辑**：开关开启后，所有章节统一使用深度研究模式，不需要单独判断章节类型
- **超时配置**：单章节超时时间设置为10分钟，避免误判
- **重试机制**：服务异常时自动重试5次，失败后提示用户并支持手动重试
- **降级策略**：服务不可用时询问用户是否降级，不自动降级

---

## 当前系统分析

### 章节生成流程

1. **前端触发**：用户点击"生成商业计划书/产品立项材料"按钮
2. **章节选择**：显示章节选择弹窗（`showChapterSelection`）
   - 核心章节（必选）：执行摘要、市场分析、解决方案、商业模式
   - 可选章节：竞争格局、营销策略、团队架构、财务预测等
3. **开始生成**：用户点击"开始生成"（`startGeneration`）
   - 获取选中的章节ID列表
   - 调用`generate(type, chapterIds)`方法
4. **逐章节生成**：循环调用后端API `/api/business-plan/generate-chapter`
   - 传递：`chapterId`, `conversationHistory`, `type`
   - 返回：章节内容、tokens、agent信息
5. **进度展示**：实时更新进度弹窗，显示当前生成的章节和agent
6. **完成保存**：所有章节生成完成后，保存到IndexedDB并显示报告

### 关键文件

- **前端**：
  - `/frontend/js/modules/business-plan-generator.js` - 章节选择和生成逻辑
  - `/index.html` - 章节选择弹窗HTML结构（第602-628行）
  - `/frontend/js/utils/global-bridges.js` - 全局函数桥接

- **后端**：
  - `/backend/src/features/business-plan/interfaces/business-plan-routes.js` - API路由
  - `/backend/src/infrastructure/ai/deepseek-client.js` - DeepSeek API客户端
  - `/backend/src/utils/prompt-loader.js` - 提示词加载器

### 数据隔离机制

- 当前系统已实现chatID级别的数据隔离
- 生成状态存储在`StateManager`中，按chatID索引
- IndexedDB持久化也按chatID存储

---

## 实施方案

### 阶段一：前端UI和状态管理（P0）

#### 1.1 修改章节选择弹窗HTML

**文件**：`/index.html`（第602-628行）

在`<div class="modal-body">`中添加深度研究开关：

```html
<div class="modal-body">
  <p class="tip">核心章节将自动生成，您可以选择需要深入分析的其他章节</p>

  <!-- 新增：深度研究开关 -->
  <div
    class="deep-research-toggle"
    style="margin: 16px 0; padding: 12px; background: var(--bg-secondary); border-radius: 8px;"
  >
    <label style="display: flex; align-items: center; cursor: pointer;">
      <input type="checkbox" id="deepResearchSwitch" style="margin-right: 8px;" />
      <div>
        <strong>启用深度研究模式（整篇文档）</strong>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: var(--text-secondary);">
          使用DeepResearch对所有章节进行多轮迭代和网络搜索，生成更专业的报告（耗时约2-3分钟/章节）
        </p>
      </div>
    </label>
  </div>

  <div id="chapterList">
    <!-- 章节列表将通过JavaScript动态生成 -->
  </div>
</div>
```

#### 1.2 修改前端生成逻辑

**文件**：`/frontend/js/modules/business-plan-generator.js`

**修改`startGeneration()`方法**（第648-677行）：

```javascript
async startGeneration() {
    // 获取选中的章节
    const checkboxes = document.querySelectorAll('#chapterList input[type="checkbox"]:checked');
    let selectedChapters = Array.from(checkboxes).map(cb => cb.dataset.chapter);

    if (selectedChapters.length === 0) {
        window.modalManager.alert('请至少选择一个章节', 'warning');
        return;
    }

    // 新增：获取深度研究开关状态
    const deepResearchSwitch = document.getElementById('deepResearchSwitch');
    const useDeepResearch = deepResearchSwitch ? deepResearchSwitch.checked : false;

    // 关闭选择模态框
    window.modalManager.close('chapterSelectionModal');

    // 获取当前报告类型
    const modal = document.getElementById('chapterSelectionModal');
    const type = modal?.dataset?.reportType || 'business';

    // 验证type参数
    if (type !== 'business' && type !== 'proposal') {
        console.error('[开始生成] 无效的报告类型', { type, typeOf: typeof type });
        alert('系统错误：无效的报告类型');
        return;
    }

    selectedChapters = this.normalizeChapterIdsByType(type, selectedChapters);
    logger.debug('[开始生成] 报告类型:', type, '选中章节:', selectedChapters, '深度研究:', useDeepResearch);

    // 开始生成流程（传递深度研究标志）
    await this.generate(type, selectedChapters, useDeepResearch);
}
```

**修改`generate()`方法签名**（第684行）：

```javascript
async generate(type, chapterIds, useDeepResearch = false) {
    const chatId = window.state?.currentChat || null;

    try {
        // ... 现有的参数验证代码 ...

        logger.debug('[生成] 开始生成:', {
            type,
            chapterIds,
            chatId,
            useDeepResearch  // 新增日志
        });

        // ... 现有的状态管理代码 ...

        // 持久化时保存深度研究标志
        await this.persistGenerationState(chatId, type, {
            status: 'generating',
            selectedChapters: chapterIds,
            useDeepResearch,  // 新增：保存深度研究标志
            progress: { /* ... */ },
            // ... 其他字段 ...
        });

        // ... 循环生成章节的代码 ...

        // 在章节生成失败时，检查是否为DeepResearch错误
        // 如果是，询问用户是否降级到DeepSeek
        if (useDeepResearch && error.message.includes('DeepResearch')) {
            const shouldFallback = confirm(
                'DeepResearch服务调用失败。\n\n' +
                '错误信息：' + error.message + '\n\n' +
                '是否降级到DeepSeek快速模式继续生成？\n\n' +
                '点击"确定"降级，点击"取消"停止生成'
            );

            if (shouldFallback) {
                // 用户同意降级，重新调用API（不使用深度研究）
                console.log('[生成] 用户同意降级到DeepSeek');
                // 重新调用当前章节的生成，useDeepResearch设为false
                // ... 实现降级逻辑 ...
            } else {
                // 用户拒绝降级，停止生成
                console.log('[生成] 用户拒绝降级，停止生成');
                throw error;
            }
        }

        // ... 继续现有逻辑 ...
    }
}
```

**修改章节生成API调用**（第858-867行附近）：

```javascript
// 在循环生成章节时，传递深度研究标志
// 注意：useDeepResearch对所有章节生效，不需要单独判断章节类型
const response = await this.api.request('/api/business-plan/generate-chapter', {
  method: 'POST',
  body: {
    chapterId,
    conversationHistory: conversation,
    type,
    useDeepResearch // 新增：传递深度研究标志（对所有章节生效）
  },
  timeout: useDeepResearch ? 600000 : 180000, // 深度研究模式超时10分钟，避免误判
  retry: 0 // 不在前端重试，由后端统一处理重试逻辑
});
```

---

### 阶段二：后端API扩展（P0）

#### 2.1 修改后端路由

**文件**：`/backend/src/features/business-plan/interfaces/business-plan-routes.js`（第167-196行）

```javascript
router.post('/generate-chapter', async (req, res, next) => {
  try {
    const {
      chapterId,
      conversationHistory,
      type = 'business',
      useDeepResearch = false // 新增：深度研究标志
    } = req.body;

    // 参数验证
    if (!chapterId) {
      return res.status(400).json({
        code: -1,
        error: '缺少必要参数: chapterId'
      });
    }

    if (!conversationHistory || !Array.isArray(conversationHistory)) {
      return res.status(400).json({
        code: -1,
        error: '缺少或无效的对话历史'
      });
    }

    // 根据深度研究标志选择生成方式
    const result = await generateSingleChapter(
      chapterId,
      conversationHistory,
      type,
      useDeepResearch // 新增：传递深度研究标志
    );

    res.json({
      code: 0,
      data: result
    });
  } catch (error) {
    next(error);
  }
});
```

#### 2.2 修改章节生成函数

**文件**：`/backend/src/features/business-plan/interfaces/business-plan-routes.js`（第75-161行）

```javascript
async function generateSingleChapter(
  chapterId,
  conversationHistory,
  type = 'business',
  useDeepResearch = false
) {
  // 如果启用深度研究，调用DeepResearch服务
  if (useDeepResearch) {
    return await generateWithDeepResearch(chapterId, conversationHistory, type);
  }

  // 否则使用现有的DeepSeek逻辑
  return await generateWithDeepSeek(chapterId, conversationHistory, type);
}

// 将现有的生成逻辑重构为独立函数
async function generateWithDeepSeek(chapterId, conversationHistory, type) {
  // ... 现有的DeepSeek生成逻辑（第75-161行的代码）...
  const prompts = type === 'proposal' ? PROPOSAL_PROMPTS : CHAPTER_PROMPTS;
  let promptTemplate = prompts[chapterId];

  if (!promptTemplate) {
    const docType = type === 'proposal' ? 'proposal' : 'business-plan';
    promptTemplate = await promptLoader.loadChapterTemplate(docType, chapterId);
  }

  const agent = CHAPTER_AGENTS[chapterId];
  const conversation = formatConversation(conversationHistory);

  let prompt;
  if (promptTemplate.includes('{CONVERSATION}')) {
    prompt = promptTemplate.replace('{CONVERSATION}', conversation);
  } else {
    prompt = `${promptTemplate}\n\n**对话历史**：\n\`\`\`\n${conversation}\n\`\`\``;
  }

  const result = await callDeepSeekAPI([{ role: 'user', content: prompt }], null, {
    max_tokens: 1500,
    temperature: 0.7,
    timeout: 120000
  });

  return {
    chapterId,
    content: result.content,
    agent: agent.name,
    emoji: agent.emoji,
    tokens: result.usage.total_tokens,
    timestamp: Date.now(),
    mode: 'fast' // 标记生成模式
  };
}

// 新增：DeepResearch生成函数（占位符，阶段三实现）
async function generateWithDeepResearch(chapterId, conversationHistory, type) {
  // 阶段三接入：调用 Python 微服务
  // 暂时返回模拟数据或抛出错误
  throw new Error('DeepResearch服务尚未实现，请先部署Python微服务');
}
```

---

### 阶段三：Python微服务开发（P1）

#### 3.1 创建Python微服务目录结构

```
/backend/services/deep-research/
├── app.py                 # Flask/FastAPI主应用
├── requirements.txt       # Python依赖
├── config.py             # 配置文件
├── deep_research_client.py  # DeepResearch客户端封装
├── Dockerfile            # Docker配置（可选）
└── README.md             # 服务文档
```

#### 3.2 安装依赖

**文件**：`/backend/services/deep-research/requirements.txt`

```txt
flask==3.0.0
deep-research==0.1.0  # 需要验证实际包名
requests==2.31.0
python-dotenv==1.0.0
```

#### 3.3 实现Flask服务

**文件**：`/backend/services/deep-research/app.py`

```python
from flask import Flask, request, jsonify
from deep_research_client import DeepResearchClient
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
client = DeepResearchClient(api_key=os.getenv('DEEPRESEARCH_API_KEY'))

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'service': 'deep-research'})

@app.route('/research/business-plan-chapter', methods=['POST'])
def research_chapter():
    try:
        data = request.json
        chapter_id = data.get('chapterId')
        conversation_history = data.get('conversationHistory')
        doc_type = data.get('type', 'business')

        if not chapter_id or not conversation_history:
            return jsonify({'error': '缺少必要参数'}), 400

        # 调用DeepResearch
        result = client.generate_chapter(
            chapter_id=chapter_id,
            conversation_history=conversation_history,
            doc_type=doc_type,
            depth='medium',
            iterations=3
        )

        return jsonify({
            'chapterId': chapter_id,
            'content': result['content'],
            'sources': result.get('sources', []),
            'confidence': result.get('confidence', 0.8),
            'tokens': result.get('tokens', 0),
            'mode': 'deep'
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=False)
```

#### 3.4 实现DeepResearch客户端

**文件**：`/backend/services/deep-research/deep_research_client.py`

```python
from deep_research import DeepResearch  # 需要验证实际导入方式

class DeepResearchClient:
    def __init__(self, api_key):
        self.client = DeepResearch(api_key=api_key)

    def generate_chapter(self, chapter_id, conversation_history, doc_type, depth='medium', iterations=3):
        """
        生成商业计划书章节
        """
        # 构建研究查询
        query = self._build_research_query(chapter_id, conversation_history, doc_type)

        # 调用DeepResearch API
        result = self.client.research(
            query=query,
            depth=depth,
            sources=['web', 'academic'],
            iterations=iterations,
            output_format='markdown'
        )

        return {
            'content': result.content,
            'sources': result.sources,
            'confidence': result.confidence,
            'tokens': result.usage.total_tokens
        }

    def _build_research_query(self, chapter_id, conversation_history, doc_type):
        """
        根据章节ID构建研究查询
        """
        # 格式化对话历史
        conversation_text = self._format_conversation(conversation_history)

        # 章节特定的查询模板
        queries = {
            'market-analysis': f"""
基于以下产品创意，进行深度市场分析：
1. 目标市场规模（TAM/SAM/SOM）和增长趋势
2. 用户画像、需求痛点和行为特征
3. 市场驱动因素和发展机会
4. 行业标准和最佳实践

产品创意：
{conversation_text}

请提供数据支持和可靠来源。
""",
            'competitive-landscape': f"""
分析以下产品的竞争格局：
1. 主要竞品列表和核心特点
2. 竞争优势对比矩阵
3. 市场定位和差异化策略
4. 竞争壁垒和护城河

产品创意：
{conversation_text}

请提供具体的竞品数据和市场份额信息。
""",
            'financial-projection': f"""
基于以下产品创意，进行财务预测分析：
1. 收入模型和定价策略
2. 成本结构和盈亏平衡点
3. 3-5年财务预测
4. 行业财务基准和估值参考

产品创意：
{conversation_text}

请提供行业数据和财务模型参考。
"""
        }

        # 返回对应章节的查询，如果没有则返回通用查询
        return queries.get(chapter_id, f"基于以下内容生成{chapter_id}章节：\n{conversation_text}")

    def _format_conversation(self, conversation_history):
        """
        格式化对话历史为文本
        """
        if isinstance(conversation_history, list):
            return '\n'.join([
                f"{msg.get('role', 'user')}: {msg.get('content', '')}"
                for msg in conversation_history
            ])
        return str(conversation_history)
```

---

### 阶段四：Node.js后端集成Python服务（P1）

#### 4.1 创建DeepResearch HTTP客户端

**文件**：`/backend/src/infrastructure/ai/deep-research-http-client.js`（新建）

```javascript
import axios from 'axios';

const DEEPRESEARCH_SERVICE_URL = process.env.DEEPRESEARCH_SERVICE_URL || 'http://localhost:5001';
const REQUEST_TIMEOUT = 600000; // 10分钟超时，避免误判
const MAX_RETRIES = 5; // 最大重试次数

/**
 * 调用DeepResearch Python微服务（带重试机制）
 */
export async function callDeepResearchService(chapterId, conversationHistory, type = 'business') {
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[DeepResearch] 第${attempt}次尝试调用服务...`);

      const response = await axios.post(
        `${DEEPRESEARCH_SERVICE_URL}/research/business-plan-chapter`,
        {
          chapterId,
          conversationHistory,
          type
        },
        {
          timeout: REQUEST_TIMEOUT,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`[DeepResearch] 第${attempt}次调用成功`);
      return response.data;
    } catch (error) {
      lastError = error;
      console.error(`[DeepResearch] 第${attempt}次调用失败:`, error.message);

      // 判断是否为服务异常（需要重试）
      const isServiceError =
        error.code === 'ECONNREFUSED' || // 连接被拒绝
        error.code === 'ETIMEDOUT' || // 连接超时
        error.code === 'ENOTFOUND' || // 域名解析失败
        (error.response && error.response.status >= 500); // 服务器错误

      // 如果是超时错误（ECONNABORTED），不重试，直接抛出
      if (error.code === 'ECONNABORTED') {
        throw new Error('DeepResearch生成超时（10分钟），请检查服务状态或稍后重试');
      }

      // 如果不是服务异常，直接抛出错误
      if (!isServiceError) {
        if (error.response) {
          throw new Error(`DeepResearch服务错误: ${error.response.data.error || error.message}`);
        } else {
          throw new Error(`DeepResearch调用失败: ${error.message}`);
        }
      }

      // 如果是最后一次重试，抛出错误
      if (attempt === MAX_RETRIES) {
        throw new Error(`DeepResearch服务异常，已重试${MAX_RETRIES}次仍失败: ${lastError.message}`);
      }

      // 等待后重试（指数退避）
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // 最多等待10秒
      console.log(`[DeepResearch] 等待${delay}ms后重试...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // 理论上不会到这里，但为了类型安全
  throw new Error(`DeepResearch服务异常，已重试${MAX_RETRIES}次仍失败`);
}

/**
 * 健康检查
 */
export async function checkDeepResearchHealth() {
  try {
    const response = await axios.get(`${DEEPRESEARCH_SERVICE_URL}/health`, {
      timeout: 5000
    });
    return response.data.status === 'ok';
  } catch (error) {
    return false;
  }
}
```

#### 4.2 实现generateWithDeepResearch函数

**文件**：`/backend/src/features/business-plan/interfaces/business-plan-routes.js`

```javascript
import { callDeepResearchService } from '../../../infrastructure/ai/deep-research-http-client.js';

async function generateWithDeepResearch(chapterId, conversationHistory, type) {
  const agent = CHAPTER_AGENTS[chapterId] || {
    name: '深度研究专家',
    emoji: '🔬'
  };

  // 直接调用Python微服务，不做自动降级
  // 如果失败，错误会被传递到前端，由前端询问用户是否降级
  const result = await callDeepResearchService(chapterId, conversationHistory, type);

  return {
    chapterId: result.chapterId,
    content: result.content,
    sources: result.sources || [],
    confidence: result.confidence || 0.8,
    agent: agent.name,
    emoji: agent.emoji,
    tokens: result.tokens || 0,
    timestamp: Date.now(),
    mode: 'deep' // 标记为深度研究模式
  };
}
```

#### 4.3 添加环境变量

**文件**：`/backend/.env`

```env
# 现有配置...
DEEPSEEK_API_KEY=your_deepseek_key

# 新增：DeepResearch服务配置
DEEPRESEARCH_SERVICE_URL=http://localhost:5001
DEEPRESEARCH_API_KEY=your_deepresearch_key  # 如果DeepResearch需要API密钥
```

---

## 关键文件清单

### 需要修改的文件

1. `/index.html` - 添加深度研究开关UI（第614行后）
2. `/frontend/js/modules/business-plan-generator.js` - 修改生成逻辑
   - `startGeneration()` 方法（第648行）
   - `generate()` 方法（第684行）
   - API调用部分（第858行附近）
3. `/backend/src/features/business-plan/interfaces/business-plan-routes.js` - 修改路由和生成函数
   - `/generate-chapter` 路由（第167行）
   - `generateSingleChapter()` 函数（第75行）
   - 新增 `generateWithDeepSeek()` 和 `generateWithDeepResearch()` 函数
4. `/backend/.env` - 添加DeepResearch服务配置

### 需要新建的文件

1. `/backend/services/deep-research/app.py` - Flask主应用
2. `/backend/services/deep-research/deep_research_client.py` - DeepResearch客户端
3. `/backend/services/deep-research/requirements.txt` - Python依赖
4. `/backend/services/deep-research/config.py` - 配置文件
5. `/backend/services/deep-research/README.md` - 服务文档
6. `/backend/src/infrastructure/ai/deep-research-http-client.js` - HTTP客户端

---

## 验证计划

### 阶段一验证（前端UI）

1. 打开ThinkCraft，创建新对话
2. 点击"生成商业计划书"按钮
3. 验证章节选择弹窗中显示"启用深度研究模式"开关
4. 勾选开关，选择章节，点击"开始生成"
5. 检查浏览器控制台日志，确认`useDeepResearch: true`被传递

### 阶段二验证（后端API）

1. 使用Postman或curl测试API：

```bash
curl -X POST http://localhost:3000/api/business-plan/generate-chapter \
  -H "Content-Type: application/json" \
  -d '{
    "chapterId": "market-analysis",
    "conversationHistory": [{"role": "user", "content": "测试产品"}],
    "type": "business",
    "useDeepResearch": false
  }'
```

2. 验证返回结果包含`mode: 'fast'`
3. 修改`useDeepResearch: true`，验证返回错误提示"DeepResearch服务尚未实现"

### 阶段三验证（Python微服务）

1. 启动Python服务：

```bash
cd backend/services/deep-research
pip install -r requirements.txt
python app.py
```

2. 测试健康检查：

```bash
curl http://localhost:5001/health
```

3. 测试章节生成：

```bash
curl -X POST http://localhost:5001/research/business-plan-chapter \
  -H "Content-Type: application/json" \
  -d '{
    "chapterId": "market-analysis",
    "conversationHistory": [{"role": "user", "content": "AI写作助手"}],
    "type": "business"
  }'
```

### 阶段四验证（端到端）

1. 启动Python微服务和Node.js后端
2. 在ThinkCraft中创建新对话，输入产品创意
3. 点击"生成商业计划书"，勾选"启用深度研究模式"
4. 选择"市场分析"章节，点击"开始生成"
5. 验证生成时间约2-3分钟（比快速模式慢）
6. 检查生成的内容是否包含数据来源和引用
7. 验证返回结果包含`mode: 'deep'`和`sources`字段

### chatID隔离验证

1. 在对话A中启用深度研究模式，生成商业计划书
2. 切换到对话B，生成商业计划书（不启用深度研究）
3. 验证对话A使用深度研究，对话B使用快速模式
4. 刷新页面，验证设置被正确恢复

---

## 实施优先级

### P0（第一阶段 - 基础功能）

### P1（第二阶段 - Python微服务）

- [ ] Python服务：实现Flask应用和DeepResearch客户端
- [ ] Node.js集成：实现HTTP客户端调用Python服务（带5次重试机制）
- [ ] 章节支持：实现所有章节的深度研究（不区分章节类型）
- [ ] 超时配置：单章节超时时间设置为10分钟
- [ ] 重试机制：服务异常时自动重试5次，失败后提示用户
- [ ] 降级策略：服务不可用时询问用户是否降级到DeepSeek
- [ ] 注意：深度研究开关对整篇文档生效，所有章节统一使用同一模式

### P2（第三阶段 - 优化增强）

- [ ] 支持所有章节的深度研究
- [ ] 添加深度研究结果的数据来源展示
- [ ] 优化生成速度（并行处理、缓存）
- [ ] 添加成本统计和预算控制
- [ ] Docker化部署Python微服务

---

## 风险与注意事项

### 技术风险

1. **DeepResearch可用性**：需要验证Alibaba-NLP/DeepResearch是否提供公开API或需要自建服务
2. **Python依赖**：DeepResearch可能依赖特定的Python版本或系统库
3. **性能问题**：深度研究模式耗时较长（单章节可能需要5-10分钟），需要优化用户体验（进度提示、可取消）
4. **成本控制**：DeepResearch可能消耗更多tokens，需要设置预算限制
5. **超时判断**：需要区分真正的超时（10分钟）和服务异常，避免误判

### 实施注意事项

1. **向后兼容**：保持现有DeepSeek快速模式不受影响
2. **降级策略**：DeepResearch服务不可用时**询问用户**是否降级到DeepSeek，不自动降级
3. **数据隔离**：确保不同chatID的深度研究设置互不影响
4. **开关作用范围**：深度研究开关对整篇文档生效，不区分章节类型，所有选中的章节统一使用同一模式
5. **超时配置**：单章节超时时间设置为10分钟，避免正常生成被误判为超时
6. **重试机制**：识别服务异常（连接失败、500错误等），自动重试5次，失败后提示用户并支持手动重试
7. **错误提示**：提供清晰的错误信息和用户指引
8. **文档更新**：更新用户文档，说明深度研究模式的使用方法和优势

---

---

# 第二阶段：后续扩展详细执行计划

## 概述

第一阶段完成后，系统已具备基础的DeepResearch集成能力。第二阶段将在此基础上进行功能扩展和用户体验优化，提升深度研究的实用性和可控性。

---

## 扩展功能清单

### 功能1：深度级别选择（P2-1）

#### 需求描述

允许用户在启用深度研究时，选择研究深度级别（浅层/中等/深度），平衡生成质量和时间成本。

#### 实施方案

**1.1 前端UI修改**

**文件**：`/index.html`（章节选择弹窗）

在深度研究开关下方添加深度级别选择：

```html
<div
  class="deep-research-toggle"
  style="margin: 16px 0; padding: 12px; background: var(--bg-secondary); border-radius: 8px;"
>
  <label style="display: flex; align-items: center; cursor: pointer;">
    <input
      type="checkbox"
      id="deepResearchSwitch"
      style="margin-right: 8px;"
      onchange="toggleDeepResearchOptions()"
    />
    <div>
      <strong>启用深度研究模式（整篇文档）</strong>
      <p style="margin: 4px 0 0 0; font-size: 12px; color: var(--text-secondary);">
        使用DeepResearch对所有章节进行多轮迭代和网络搜索，生成更专业的报告
      </p>
    </div>
  </label>

  <!-- 新增：深度级别选择 -->
  <div id="deepResearchOptions" style="display: none; margin-top: 12px; padding-left: 28px;">
    <label
      style="font-size: 13px; color: var(--text-secondary); margin-bottom: 8px; display: block;"
      >研究深度：</label
    >
    <div style="display: flex; gap: 8px;">
      <label class="depth-option">
        <input type="radio" name="researchDepth" value="shallow" style="margin-right: 4px;" />
        <span>浅层（1轮，约2分钟/章节）</span>
      </label>
      <label class="depth-option">
        <input
          type="radio"
          name="researchDepth"
          value="medium"
          checked
          style="margin-right: 4px;"
        />
        <span>中等（3轮，约5分钟/章节）</span>
      </label>
      <label class="depth-option">
        <input type="radio" name="researchDepth" value="deep" style="margin-right: 4px;" />
        <span>深度（5轮，约10分钟/章节）</span>
      </label>
    </div>
  </div>
</div>

<script>
  function toggleDeepResearchOptions() {
    const checkbox = document.getElementById('deepResearchSwitch');
    const options = document.getElementById('deepResearchOptions');
    options.style.display = checkbox.checked ? 'block' : 'none';
  }
</script>
```

**1.2 前端逻辑修改**

**文件**：`/frontend/js/modules/business-plan-generator.js`

修改`startGeneration()`方法：

```javascript
async startGeneration() {
    // ... 现有代码 ...

    // 获取深度研究开关状态
    const deepResearchSwitch = document.getElementById('deepResearchSwitch');
    const useDeepResearch = deepResearchSwitch ? deepResearchSwitch.checked : false;

    // 新增：获取研究深度
    let researchDepth = 'medium';  // 默认中等
    if (useDeepResearch) {
        const depthRadio = document.querySelector('input[name="researchDepth"]:checked');
        researchDepth = depthRadio ? depthRadio.value : 'medium';
    }

    logger.debug('[开始生成] 深度研究:', useDeepResearch, '研究深度:', researchDepth);

    // 开始生成流程（传递深度研究标志和深度级别）
    await this.generate(type, selectedChapters, useDeepResearch, researchDepth);
}
```

修改`generate()`方法签名：

```javascript
async generate(type, chapterIds, useDeepResearch = false, researchDepth = 'medium') {
    // ... 现有代码 ...

    // 持久化时保存深度级别
    await this.persistGenerationState(chatId, type, {
        status: 'generating',
        selectedChapters: chapterIds,
        useDeepResearch,
        researchDepth,  // 新增：保存研究深度
        // ... 其他字段 ...
    });

    // 在API调用时传递深度级别
    const response = await this.api.request('/api/business-plan/generate-chapter', {
        method: 'POST',
        body: {
            chapterId,
            conversationHistory: conversation,
            type,
            useDeepResearch,
            researchDepth  // 新增：传递研究深度
        },
        timeout: this._calculateTimeout(useDeepResearch, researchDepth),  // 根据深度动态计算超时
        retry: 0
    });
}

// 新增：根据研究深度计算超时时间
_calculateTimeout(useDeepResearch, researchDepth) {
    if (!useDeepResearch) return 180000;  // 快速模式：3分钟

    const timeouts = {
        shallow: 300000,   // 5分钟
        medium: 600000,    // 10分钟
        deep: 900000       // 15分钟
    };

    return timeouts[researchDepth] || 600000;
}
```

**1.3 后端API修改**

**文件**：`/backend/src/features/business-plan/interfaces/business-plan-routes.js`

修改路由接收深度参数：

```javascript
router.post('/generate-chapter', async (req, res, next) => {
  try {
    const {
      chapterId,
      conversationHistory,
      type = 'business',
      useDeepResearch = false,
      researchDepth = 'medium' // 新增：研究深度
    } = req.body;

    // ... 参数验证 ...

    // 传递深度参数
    const result = await generateSingleChapter(
      chapterId,
      conversationHistory,
      type,
      useDeepResearch,
      researchDepth // 新增
    );

    res.json({ code: 0, data: result });
  } catch (error) {
    next(error);
  }
});
```

修改生成函数：

```javascript
async function generateSingleChapter(
  chapterId,
  conversationHistory,
  type,
  useDeepResearch,
  researchDepth
) {
  if (useDeepResearch) {
    return await generateWithDeepResearch(chapterId, conversationHistory, type, researchDepth);
  }
  return await generateWithDeepSeek(chapterId, conversationHistory, type);
}

async function generateWithDeepResearch(chapterId, conversationHistory, type, researchDepth) {
  // ... 现有代码 ...

  // 传递深度参数到Python服务
  const result = await callDeepResearchService(chapterId, conversationHistory, type, researchDepth);

  // ... 返回结果 ...
}
```

**1.4 Python微服务修改**

**文件**：`/backend/services/deep-research/app.py`

```python
@app.route('/research/business-plan-chapter', methods=['POST'])
def research_chapter():
    try:
        data = request.json
        chapter_id = data.get('chapterId')
        conversation_history = data.get('conversationHistory')
        doc_type = data.get('type', 'business')
        depth = data.get('researchDepth', 'medium')  # 新增：接收深度参数

        # 映射深度级别到迭代次数
        iterations_map = {
            'shallow': 1,
            'medium': 3,
            'deep': 5
        }
        iterations = iterations_map.get(depth, 3)

        # 调用DeepResearch
        result = client.generate_chapter(
            chapter_id=chapter_id,
            conversation_history=conversation_history,
            doc_type=doc_type,
            depth=depth,
            iterations=iterations  # 根据深度设置迭代次数
        )

        return jsonify({
            'chapterId': chapter_id,
            'content': result['content'],
            'sources': result.get('sources', []),
            'confidence': result.get('confidence', 0.8),
            'tokens': result.get('tokens', 0),
            'mode': 'deep',
            'depth': depth,  # 返回深度信息
            'iterations': iterations
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500
```

#### 验证计划

1. 启用深度研究，选择"浅层"，验证生成时间约2分钟/章节
2. 选择"中等"，验证生成时间约5分钟/章节
3. 选择"深度"，验证生成时间约10分钟/章节
4. 对比不同深度级别的内容质量差异

---

### 功能2：数据来源展示（P2-2）

#### 需求描述

在生成的报告中显示引用的数据来源和链接，增强报告的可信度和可追溯性。

#### 实施方案

**2.1 后端数据结构扩展**

确保DeepResearch返回的`sources`字段包含完整信息：

```javascript
{
    chapterId: "market-analysis",
    content: "生成的章节内容...",
    sources: [
        {
            title: "2024年中国AI市场研究报告",
            url: "https://example.com/report",
            snippet: "市场规模达到1000亿元...",
            relevance: 0.95
        },
        // ... 更多来源
    ],
    // ... 其他字段
}
```

**2.2 前端报告渲染修改**

**文件**：`/frontend/js/modules/report-viewer.js`（假设存在）

在章节内容后添加数据来源部分：

```javascript
function renderChapterWithSources(chapter) {
  let html = `
        <div class="chapter-section">
            <h2>${chapter.title}</h2>
            <div class="chapter-content">
                ${markdownRenderer.render(chapter.content)}
            </div>
    `;

  // 如果有数据来源，显示来源列表
  if (chapter.sources && chapter.sources.length > 0) {
    html += `
            <div class="chapter-sources">
                <h3>📚 数据来源</h3>
                <ul class="sources-list">
        `;

    chapter.sources.forEach((source, index) => {
      html += `
                <li class="source-item">
                    <span class="source-number">[${index + 1}]</span>
                    <a href="${source.url}" target="_blank" class="source-link">
                        ${source.title}
                    </a>
                    ${source.snippet ? `<p class="source-snippet">${source.snippet}</p>` : ''}
                    <span class="source-relevance">相关度: ${(source.relevance * 100).toFixed(0)}%</span>
                </li>
            `;
    });

    html += `
                </ul>
            </div>
        `;
  }

  html += `</div>`;
  return html;
}
```

**2.3 CSS样式**

**文件**：`/frontend/css/report-viewer.css`（新建或修改）

```css
.chapter-sources {
  margin-top: 32px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
  border-left: 4px solid var(--primary);
}

.chapter-sources h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: var(--text-primary);
}

.sources-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.source-item {
  margin-bottom: 12px;
  padding: 12px;
  background: var(--bg-primary);
  border-radius: 6px;
}

.source-number {
  display: inline-block;
  width: 24px;
  height: 24px;
  line-height: 24px;
  text-align: center;
  background: var(--primary);
  color: white;
  border-radius: 50%;
  font-size: 12px;
  margin-right: 8px;
}

.source-link {
  color: var(--primary);
  text-decoration: none;
  font-weight: 500;
}

.source-link:hover {
  text-decoration: underline;
}

.source-snippet {
  margin: 8px 0 0 32px;
  font-size: 13px;
  color: var(--text-secondary);
  font-style: italic;
}

.source-relevance {
  display: inline-block;
  margin-left: 32px;
  font-size: 12px;
  color: var(--text-tertiary);
}
```

#### 验证计划

1. 生成带深度研究的报告
2. 验证每个章节末尾显示数据来源列表
3. 点击来源链接，验证可以跳转到原始网页
4. 检查来源的相关度评分是否正确显示

---

### 功能3：置信度评分（P2-3）

#### 需求描述

在报告中显示每个章节的置信度评分，帮助用户判断内容的可靠性。

#### 实施方案

**3.1 前端章节标题修改**

在章节标题旁显示置信度徽章：

```javascript
function renderChapterTitle(chapter) {
  const confidencePercent = (chapter.confidence * 100).toFixed(0);
  const confidenceClass =
    chapter.confidence >= 0.8 ? 'high' : chapter.confidence >= 0.6 ? 'medium' : 'low';

  return `
        <div class="chapter-header">
            <h2>${chapter.title}</h2>
            ${
              chapter.mode === 'deep'
                ? `
                <span class="confidence-badge ${confidenceClass}">
                    置信度: ${confidencePercent}%
                </span>
            `
                : ''
            }
        </div>
    `;
}
```

**3.2 CSS样式**

```css
.chapter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.confidence-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.confidence-badge.high {
  background: #e8f5e9;
  color: #2e7d32;
}

.confidence-badge.medium {
  background: #fff3e0;
  color: #f57c00;
}

.confidence-badge.low {
  background: #ffebee;
  color: #c62828;
}
```

#### 验证计划

1. 生成深度研究报告
2. 验证每个章节标题旁显示置信度徽章
3. 检查不同置信度的颜色区分（高/中/低）

---

### 功能4：自定义研究问题（P2-4）

#### 需求描述

允许用户在启用深度研究时，为特定章节自定义研究方向和问题，提升报告的针对性。

#### 实施方案

**4.1 前端UI修改**

在章节选择弹窗中，为每个章节添加"自定义研究问题"按钮：

```html
<label class="chapter-item">
  <input type="checkbox" data-chapter="market-analysis" />
  <div class="chapter-info">
    <span class="chapter-name">市场分析</span>
    <span class="chapter-desc">分析目标市场规模、用户画像和市场趋势</span>
    <div>
      <span class="badge">AI自动生成</span>
      <button class="btn-custom-question" onclick="openCustomQuestionDialog('market-analysis')">
        自定义研究问题
      </button>
    </div>
  </div>
</label>
```

**4.2 自定义问题对话框**

```javascript
function openCustomQuestionDialog(chapterId) {
  const dialog = `
        <div class="modal" id="customQuestionModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>自定义研究问题 - ${chapterId}</h3>
                    <button onclick="closeCustomQuestionDialog()">×</button>
                </div>
                <div class="modal-body">
                    <p>请输入您希望深入研究的问题（每行一个问题）：</p>
                    <textarea id="customQuestions" rows="6" placeholder="例如：\n1. 目标用户的年龄分布是什么？\n2. 主要竞争对手有哪些？\n3. 市场增长率预测？"></textarea>
                </div>
                <div class="modal-footer">
                    <button onclick="saveCustomQuestions('${chapterId}')">保存</button>
                    <button onclick="closeCustomQuestionDialog()">取消</button>
                </div>
            </div>
        </div>
    `;

  document.body.insertAdjacentHTML('beforeend', dialog);
}

function saveCustomQuestions(chapterId) {
  const questions = document.getElementById('customQuestions').value;
  // 保存到状态管理器
  window.businessPlanGenerator.setCustomQuestions(chapterId, questions);
  closeCustomQuestionDialog();
}
```

**4.3 后端处理**

将自定义问题附加到研究查询中：

```python
def _build_research_query(self, chapter_id, conversation_history, doc_type, custom_questions=None):
    # ... 现有的查询构建逻辑 ...

    base_query = queries.get(chapter_id, f"基于以下内容生成{chapter_id}章节：\n{conversation_text}")

    # 如果有自定义问题，附加到查询中
    if custom_questions:
        base_query += f"\n\n**用户特别关注的问题**：\n{custom_questions}"

    return base_query
```

#### 验证计划

1. 点击"自定义研究问题"按钮
2. 输入自定义问题并保存
3. 生成报告，验证内容是否针对自定义问题进行了深入研究

---

### 功能5：进度可视化优化（P2-5）

#### 需求描述

优化深度研究的进度展示，显示当前迭代轮次、搜索进度等详细信息。

#### 实施方案

**5.1 WebSocket实时进度推送**

**后端**：在Python微服务中添加WebSocket支持

```python
from flask_socketio import SocketIO, emit

socketio = SocketIO(app, cors_allowed_origins="*")

@app.route('/research/business-plan-chapter', methods=['POST'])
def research_chapter():
    # ... 现有代码 ...

    # 在生成过程中推送进度
    def progress_callback(iteration, total_iterations, status):
        socketio.emit('research_progress', {
            'chapterId': chapter_id,
            'iteration': iteration,
            'totalIterations': total_iterations,
            'status': status
        })

    result = client.generate_chapter(
        # ... 参数 ...
        progress_callback=progress_callback
    )

    # ... 返回结果 ...
```

**前端**：监听WebSocket事件

```javascript
// 连接WebSocket
const socket = io('http://localhost:5001');

socket.on('research_progress', data => {
  console.log('[DeepResearch进度]', data);

  // 更新进度UI
  const progressText = `${data.chapterId} - 第${data.iteration}/${data.totalIterations}轮 - ${data.status}`;
  document.getElementById('deepResearchProgress').textContent = progressText;
});
```

#### 验证计划

1. 启动深度研究生成
2. 验证进度弹窗实时显示迭代轮次
3. 检查进度更新是否流畅

---

### 功能6：成本统计和预算控制（P2-6）

#### 需求描述

统计深度研究的token消耗和成本，支持设置预算上限，避免超支。

#### 实施方案

**6.1 成本统计**

在生成完成后显示成本报告：

```javascript
function showCostReport(report) {
  const totalTokens = report.chapters.reduce((sum, ch) => sum + ch.tokens, 0);
  const estimatedCost = (totalTokens / 1000) * 0.01; // 假设¥0.01/1K tokens

  alert(`
        生成完成！

        总Token数: ${totalTokens.toLocaleString()}
        预估成本: ¥${estimatedCost.toFixed(2)}
        平均每章节: ${(totalTokens / report.chapters.length).toFixed(0)} tokens
    `);
}
```

**6.2 预算控制**

在章节选择弹窗添加预算设置：

```html
<div class="budget-control" style="margin-top: 12px;">
  <label>预算上限（可选）：</label>
  <input type="number" id="budgetLimit" placeholder="例如：10（元）" step="0.1" />
  <p style="font-size: 12px; color: var(--text-secondary);">超过预算时将停止生成并提示</p>
</div>
```

在生成过程中检查预算：

```javascript
async generate(type, chapterIds, useDeepResearch, researchDepth) {
    const budgetLimit = parseFloat(document.getElementById('budgetLimit')?.value || 0);
    let totalCost = 0;

    for (const chapterId of chapterIds) {
        // ... 生成章节 ...

        // 累计成本
        totalCost += (result.tokens / 1000) * 0.01;

        // 检查预算
        if (budgetLimit > 0 && totalCost > budgetLimit) {
            const shouldContinue = confirm(
                `已超过预算上限（¥${budgetLimit}），当前成本：¥${totalCost.toFixed(2)}\n\n` +
                `是否继续生成剩余章节？`
            );

            if (!shouldContinue) {
                break;
            }
        }
    }
}
```

#### 验证计划

1. 设置预算上限为¥5
2. 生成报告，验证超过预算时弹出提示
3. 验证成本统计的准确性

---

## 实施优先级

### P2-1（高优先级）

- [ ] 功能1：深度级别选择
- [ ] 功能2：数据来源展示
- [ ] 功能5：进度可视化优化

### P2-2（中优先级）

- [ ] 功能3：置信度评分
- [ ] 功能6：成本统计和预算控制

### P2-3（低优先级）

- [ ] 功能4：自定义研究问题

---

## 验证清单

### 深度级别选择

- [ ] 浅层模式生成时间约2分钟/章节
- [ ] 中等模式生成时间约5分钟/章节
- [ ] 深度模式生成时间约10分钟/章节
- [ ] 不同深度的内容质量有明显差异

### 数据来源展示

- [ ] 报告中显示数据来源列表
- [ ] 来源链接可点击跳转
- [ ] 相关度评分正确显示

### 置信度评分

- [ ] 章节标题旁显示置信度徽章
- [ ] 不同置信度的颜色区分正确

### 自定义研究问题

- [ ] 可以为章节添加自定义问题
- [ ] 生成内容针对自定义问题进行了研究

### 进度可视化

- [ ] 实时显示迭代轮次
- [ ] 进度更新流畅

### 成本统计

- [ ] 生成完成后显示成本报告
- [ ] 预算控制功能正常工作
- [ ] 超过预算时正确提示

---

## 关键文件清单（第二阶段）

### 需要修改的文件

1. `/index.html` - 添加深度级别选择、自定义问题、预算控制UI
2. `/frontend/js/modules/business-plan-generator.js` - 扩展生成逻辑
3. `/frontend/js/modules/report-viewer.js` - 添加数据来源和置信度展示
4. `/frontend/css/report-viewer.css` - 新增样式
5. `/backend/src/features/business-plan/interfaces/business-plan-routes.js` - 接收扩展参数
6. `/backend/services/deep-research/app.py` - 支持深度级别、自定义问题、进度推送
7. `/backend/services/deep-research/deep_research_client.py` - 扩展客户端功能

### 需要新建的文件

1. `/frontend/js/components/custom-question-dialog.js` - 自定义问题对话框组件
2. `/frontend/js/utils/cost-calculator.js` - 成本计算工具
3. `/backend/services/deep-research/websocket_handler.py` - WebSocket进度推送

---

## 时间估算

| 功能               | 预估时间 | 优先级 |
| ------------------ | -------- | ------ |
| 深度级别选择       | 1-2天    | P2-1   |
| 数据来源展示       | 1天      | P2-1   |
| 置信度评分         | 0.5天    | P2-2   |
| 自定义研究问题     | 2-3天    | P2-3   |
| 进度可视化优化     | 2天      | P2-1   |
| 成本统计和预算控制 | 1天      | P2-2   |

**总计**：约7-9天

---

## 风险提示

1. **WebSocket兼容性**：需要确保前后端WebSocket库版本兼容
2. **成本计算准确性**：不同模型的token计费方式可能不同，需要动态配置
3. **自定义问题解析**：需要处理用户输入的各种格式，避免解析错误
4. **进度推送性能**：高频率的进度推送可能影响性能，需要节流处理

---

## 代码级检测未完成项（基于当前实现）

1. WebSocket 实时进度推送/迭代进度（未发现 websocket_handler 或 WS 路由）
2. 自定义研究问题（前后端请求体与服务未接入该字段）
3. 置信度徽章与颜色区分（仅返回 confidence，未渲染 UI）
4. 数据来源相关度评分（sources 无相关度字段与展示）
5. 来源链接可点击跳转（URL 仅文本展示）
6. 成本统计与预算控制（仅 DeepSeek 统计，DeepResearch 未接入）
7. Docker 化部署 Python 微服务（缺少 Dockerfile）
8. 进度可视化优化（仅章节级进度，无迭代轮次/搜索进度）
