"""
DeepResearch Flask 微服务

通过 OpenRouter API 调用 Tongyi-DeepResearch-30B-A3B 模型
为 ThinkCraft 提供深度研究能力
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
from deep_research_client import DeepResearchClient
from pathlib import Path
import os
from dotenv import load_dotenv
import time
import logging

# 加载环境变量
load_dotenv()

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# OpenRouter 配置
OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
# 支持配置模型名称，默认使用 DeepResearch，可以设置为免费模型进行测试
# 免费模型示例: openrouter/auto (自动路由到免费模型)
MODEL_NAME = os.getenv('OPENROUTER_MODEL', 'alibaba/tongyi-deepresearch-30b-a3b')

# DeepResearch 检索/迭代提供商配置
# 可选: tavily | perplexity | openai | openrouter
DEEPRESEARCH_PROVIDER = os.getenv('DEEPRESEARCH_PROVIDER', 'openrouter')
DEEPRESEARCH_API_KEY = os.getenv('DEEPRESEARCH_API_KEY')
DEEPRESEARCH_API_URL = os.getenv('DEEPRESEARCH_API_URL')

# 超时配置
REQUEST_TIMEOUT = 600  # 10分钟

# 初始化 OpenAI 客户端（兼容 OpenRouter）
client = OpenAI(
    api_key=OPENROUTER_API_KEY,
    base_url=OPENROUTER_BASE_URL,
    timeout=REQUEST_TIMEOUT
)

# 初始化 DeepResearch 客户端（检索/迭代）
research_client = DeepResearchClient(
    api_key=DEEPRESEARCH_API_KEY,
    api_url=DEEPRESEARCH_API_URL,
    provider=DEEPRESEARCH_PROVIDER
)

# 章节提示词模板（作为兜底）
CHAPTER_PROMPTS = {
    'executive-summary': """
基于以下产品创意，生成商业计划书的执行摘要：

产品创意：
{conversation}

请提供：
1. 项目概述（2-3句话）
2. 核心价值主张
3. 目标市场和用户
4. 商业模式简述
5. 关键里程碑

要求：简洁专业，突出亮点，字数控制在500字以内。
""",
    'market-analysis': """
基于以下产品创意，进行深度市场分析：

产品创意：
{conversation}

请提供：
1. 目标市场规模（TAM/SAM/SOM）和增长趋势
2. 用户画像、需求痛点和行为特征
3. 市场驱动因素和发展机会
4. 行业标准和最佳实践

要求：提供数据支持和可靠来源，进行多轮网络搜索验证。
""",
    'competitive-landscape': """
分析以下产品的竞争格局：

产品创意：
{conversation}

请提供：
1. 主要竞品列表和核心特点
2. 竞争优势对比矩阵
3. 市场定位和差异化策略
4. 竞争壁垒和护城河

要求：提供具体的竞品数据和市场份额信息。
""",
    'solution': """
基于以下产品创意，详细描述解决方案：

产品创意：
{conversation}

请提供：
1. 产品功能和特性
2. 技术架构和实现方案
3. 用户体验设计
4. 创新点和差异化

要求：技术可行，逻辑清晰。
""",
    'business-model': """
基于以下产品创意，设计商业模式：

产品创意：
{conversation}

请提供：
1. 收入模式和定价策略
2. 成本结构分析
3. 盈利能力预测
4. 规模化路径

要求：数据合理，逻辑严密。
""",
    'financial-projection': """
基于以下产品创意，进行财务预测分析：

产品创意：
{conversation}

请提供：
1. 收入模型和定价策略
2. 成本结构和盈亏平衡点
3. 3-5年财务预测
4. 行业财务基准和估值参考

要求：提供行业数据和财务模型参考。
""",
    'marketing-strategy': """
基于以下产品创意，制定营销策略：

产品创意：
{conversation}

请提供：
1. 目标客户定位
2. 营销渠道和推广策略
3. 品牌建设和传播
4. 获客成本和转化率预估

要求：策略可行，数据支持。
""",
    'team-structure': """
基于以下产品创意，设计团队架构：

产品创意：
{conversation}

请提供：
1. 核心团队成员和职责
2. 组织架构设计
3. 人才招聘计划
4. 团队文化和价值观

要求：结构合理，职责清晰。
""",
    'risk-analysis': """
基于以下产品创意，进行风险分析：

产品创意：
{conversation}

请提供：
1. 市场风险和应对策略
2. 技术风险和解决方案
3. 运营风险和预防措施
4. 财务风险和控制手段

要求：全面客观，措施具体。
""",
    'risk-assessment': """
基于以下产品创意，进行风险分析：

产品创意：
{conversation}

请提供：
1. 市场风险和应对策略
2. 技术风险和解决方案
3. 运营风险和预防措施
4. 财务风险和控制手段

要求：全面客观，措施具体。
""",
    'implementation-plan': """
基于以下产品创意，制定实施计划：

产品创意：
{conversation}

请提供：
1. 项目里程碑和时间表
2. 资源需求和预算
3. 关键任务和责任人
4. 成功指标和评估标准

要求：计划详细，可执行性强。
"""
}

# Prompt 文件路径与缓存
PROJECT_ROOT = Path(__file__).resolve().parents[3]
PROMPT_ROOT = PROJECT_ROOT / 'prompts' / 'scene-1-dialogue' / 'deep-research'
_PROMPT_CACHE = {}


def _strip_frontmatter(content: str) -> str:
    if content.startswith('---'):
        parts = content.split('---', 2)
        if len(parts) == 3:
            return parts[2].strip()
    return content.strip()


def _load_prompt_file(relative_path: str, fallback: str = '') -> str:
    file_path = PROMPT_ROOT / relative_path
    try:
        stat = file_path.stat()
        cached = _PROMPT_CACHE.get(str(file_path))
        if cached and cached['mtime'] == stat.st_mtime:
            return cached['content']
        content = file_path.read_text(encoding='utf-8')
        content = _strip_frontmatter(content)
        _PROMPT_CACHE[str(file_path)] = {'mtime': stat.st_mtime, 'content': content}
        logger.info(f'Prompt热更新加载: {file_path}')
        return content
    except Exception:
        return fallback


def _render_template(template: str, **kwargs) -> str:
    rendered = template
    for key, value in kwargs.items():
        rendered = rendered.replace('{' + key + '}', value)
    return rendered

def format_conversation(conversation_history):
    """格式化对话历史"""
    if isinstance(conversation_history, list):
        return '\n'.join([
            f"{msg.get('role', 'user')}: {msg.get('content', '')}"
            for msg in conversation_history
        ])
    return str(conversation_history)

def build_research_prompt(chapter_id, conversation_history):
    """构建研究提示词"""
    conversation_text = format_conversation(conversation_history)

    fallback = CHAPTER_PROMPTS.get(chapter_id, """
基于以下产品创意，生成{chapter_id}章节内容：

产品创意：
{conversation}

请提供专业、详细的分析和建议。
""")

    template = _load_prompt_file(f'chapters/{chapter_id}.md', fallback)
    return _render_template(template, conversation=conversation_text, chapter_id=chapter_id)

def build_search_summary(conversation_history, chapter_id):
    """生成简短检索摘要（<=350字符），用于构建搜索query"""
    conversation_text = format_conversation(conversation_history)
    fallback = """
请将以下对话内容压缩成不超过350字的检索摘要，包含：
1) 产品/项目核心描述
2) 目标用户或市场
3) 行业关键词
4) 关键约束或地区信息（如有）

仅输出摘要，不要输出其他内容。

章节: {chapter_id}
对话内容：
{conversation}
"""
    template = _load_prompt_file('search-summary.md', fallback)
    return _render_template(template, conversation=conversation_text, chapter_id=chapter_id)

def build_synthesis_prompt(chapter_id, conversation_history, sources):
    """构建带来源的最终合成提示词"""
    conversation_text = format_conversation(conversation_history)
    sources_text = '\n'.join([
        f"[{idx + 1}] {s.get('title', '未知来源')} - {s.get('url', '')}\n{s.get('snippet', '')}"
        for idx, s in enumerate(sources or [])
    ])

    fallback = """
你是一位专业的商业分析师和研究专家。请基于用户提供的信息与检索来源，生成高质量的章节内容。

章节: {chapter_id}
产品创意：
{conversation}

检索来源：
{sources}

要求：
1. 输出结构化内容（标题 + 要点 + 结论）。
2. 每个关键数据点或事实后标注引用编号，如 [1][2]。
3. 只引用与本产品场景直接相关的来源；无关来源不得引用。
4. 若来源不足，请明确说明“不足以支持该结论”，且不要强行引用不相关来源。
5. 报告末尾必须追加“来源清单”区块，格式为有序列表，对应编号与标题+URL；如无有效来源，允许输出空清单。
6. 语言专业、客观、可执行。

来源清单数据：
{sources}
"""

    template = _load_prompt_file('synthesis.md', fallback)
    return _render_template(
        template,
        chapter_id=chapter_id,
        conversation=conversation_text,
        sources=(sources_text if sources_text else '（无来源）')
    )

@app.route('/health', methods=['GET'])
def health_check():
    """健康检查"""
    return jsonify({
        'status': 'ok',
        'service': 'deep-research',
        'model': MODEL_NAME,
        'timestamp': time.time()
    })

@app.route('/research/business-plan-chapter', methods=['POST'])
def research_chapter():
    """
    生成商业计划书章节
    
    请求体：
    {
        "chapterId": "market-analysis",
        "conversationHistory": [...],
        "type": "business",
        "researchDepth": "medium"
    }
    """
    try:
        data = request.json
        chapter_id = data.get('chapterId')
        conversation_history = data.get('conversationHistory')
        doc_type = data.get('type', 'business')
        research_depth = data.get('researchDepth', 'medium')
        
        # 参数验证
        if not chapter_id:
            return jsonify({'error': '缺少必要参数: chapterId'}), 400
        
        if not conversation_history:
            return jsonify({'error': '缺少必要参数: conversationHistory'}), 400
        
        logger.info(f"开始生成章节: {chapter_id}, 深度: {research_depth}")
        
        # 构建研究提示词
        prompt = build_research_prompt(chapter_id, conversation_history)

        # 根据研究深度设置参数
        depth_config = {
            'shallow': {'temperature': 0.7, 'synthesis_temperature': 0.4, 'max_tokens': 2000, 'iterations': 2},
            'medium': {'temperature': 0.85, 'synthesis_temperature': 0.5, 'max_tokens': 4000, 'iterations': 3},
            'deep': {'temperature': 0.9, 'synthesis_temperature': 0.6, 'max_tokens': 6000, 'iterations': 5}
        }
        config = depth_config.get(research_depth, depth_config['medium'])

        start_time = time.time()
        content = None
        sources = []
        total_tokens = 0

        # 优先使用检索/迭代提供商
        if DEEPRESEARCH_PROVIDER in ['tavily', 'perplexity', 'openai']:
            if not DEEPRESEARCH_API_KEY:
                raise Exception('DeepResearch服务配置错误：未设置 DEEPRESEARCH_API_KEY')

            summary_text = None
            # 先生成检索摘要，减少query过长导致搜索失败
            if OPENROUTER_API_KEY:
                try:
                    summary_prompt = build_search_summary(conversation_history, chapter_id)
                    summary_response = client.chat.completions.create(
                        model=MODEL_NAME,
                        messages=[
                            {
                                "role": "system",
                                "content": "你是一个信息抽取助手，擅长将对话压缩成检索摘要。"
                            },
                            {
                                "role": "user",
                                "content": summary_prompt
                            }
                        ],
                        temperature=0.2,
                        max_tokens=300,
                        top_p=0.9
                    )
                    summary_text = summary_response.choices[0].message.content.strip()
                    if len(summary_text) > 350:
                        summary_text = summary_text[:350]
                except Exception as summary_error:
                    logger.warning(f"检索摘要生成失败，使用默认query: {summary_error}")

            research_result = research_client.generate_chapter(
                chapter_id=chapter_id,
                conversation_history=conversation_history,
                doc_type=doc_type,
                depth=research_depth,
                iterations=config['iterations'],
                summary_text=summary_text
            )
            raw_sources = research_result.get('sources', [])
            # 过滤无效来源并去重
            sources = []
            seen_urls = set()
            for s in raw_sources:
                url = (s.get('url') or '').strip()
                title = (s.get('title') or '').strip()
                if not url or not title:
                    continue
                if url in seen_urls:
                    continue
                seen_urls.add(url)
                sources.append(s)
            sources = sources[:8]

            # 二次合成（可选），确保结构化输出与引用
            if OPENROUTER_API_KEY:
                synthesis_prompt = build_synthesis_prompt(
                    chapter_id=chapter_id,
                    conversation_history=conversation_history,
                    sources=sources
                )
                synthesis_response = client.chat.completions.create(
                    model=MODEL_NAME,
                    messages=[
                        {
                            "role": "system",
                            "content": "你是一位专业的商业分析师和研究专家。请基于来源进行严谨总结并标注引用。"
                        },
                        {
                            "role": "user",
                            "content": synthesis_prompt
                        }
                    ],
                    temperature=config['synthesis_temperature'],
                    max_tokens=config['max_tokens'],
                    top_p=0.95,
                    presence_penalty=1.1
                )
                content = synthesis_response.choices[0].message.content
                usage = synthesis_response.usage
                total_tokens = usage.total_tokens if usage else 0
            else:
                content = research_result.get('content', '')
                total_tokens = research_result.get('tokens', 0)
        else:
            # 回退到 OpenRouter 单次生成
            response = client.chat.completions.create(
                model=MODEL_NAME,
                messages=[
                    {
                        "role": "system",
                        "content": "你是一位专业的商业分析师和研究专家。请基于用户提供的信息，进行深入的研究和分析，提供专业、详实的报告内容。"
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=config['temperature'],
                max_tokens=config['max_tokens'],
                top_p=0.95,
                presence_penalty=1.1
            )
            content = response.choices[0].message.content
            usage = response.usage
            total_tokens = usage.total_tokens if usage else 0

        elapsed_time = time.time() - start_time
        
        logger.info(f"章节生成成功: {chapter_id}, 耗时: {elapsed_time:.2f}s, tokens: {total_tokens}")
        
        # 引用校验：检查是否存在无效编号
        if sources:
            import re
            citations = [int(n) for n in re.findall(r'\[(\d+)\]', content)]
            invalid = sorted({n for n in citations if n < 1 or n > len(sources)})
            if invalid:
                content += "\n\n## 质量校验\n"
                content += f"- 检测到无效引用编号：{', '.join(map(str, invalid))}\n"
                content += "- 建议重新生成或补充来源以确保引用一致性\n"
        return jsonify({
            'chapterId': chapter_id,
            'content': content,
            'sources': sources or [],  # 检索模式可返回 sources
            'confidence': 0.85,  # 默认置信度
            'tokens': total_tokens,
            'mode': 'deep',
            'depth': research_depth,
            'elapsed_time': elapsed_time
        })
        
    except Exception as e:
        logger.error(f"生成章节失败: {str(e)}", exc_info=True)

        # 检查是否为认证错误
        error_msg = str(e)
        if '401' in error_msg or 'authentication' in error_msg.lower() or 'api key' in error_msg.lower():
            return jsonify({
                'error': 'DeepResearch服务配置错误：API密钥无效或已过期。请访问 https://openrouter.ai/keys 获取有效的API密钥，并更新 .env 文件中的 OPENROUTER_API_KEY 配置。'
            }), 401

        return jsonify({
            'error': f'DeepResearch服务错误: {str(e)}'
        }), 500

if __name__ == '__main__':
    # 检查 API Key
    if not OPENROUTER_API_KEY:
        logger.error("错误: 未设置 OPENROUTER_API_KEY 环境变量")
        logger.error("请在 .env 文件中设置: OPENROUTER_API_KEY=your_key")
        exit(1)
    
    logger.info(f"DeepResearch 服务启动")
    logger.info(f"模型: {MODEL_NAME}")
    host = os.getenv('DEEPRESEARCH_HOST', '127.0.0.1')
    port = int(os.getenv('DEEPRESEARCH_PORT', 5001))
    logger.info(f"监听地址: {host}:{port}")
    
    app.run(host=host, port=port, debug=False)
