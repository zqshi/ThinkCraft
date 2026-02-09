"""
DeepResearch客户端 - 通用实现

由于Alibaba-NLP/DeepResearch仓库当前为空，本实现提供了一个通用的深度研究框架，
可以轻松集成多种研究API（Perplexity、Tavily、GPT-Researcher等）
"""
import time
import requests
from typing import List, Dict, Any, Optional
import os


class DeepResearchClient:
    """通用深度研究客户端"""

    def __init__(self, api_key: str = None, api_url: str = None, provider: str = 'perplexity'):
        """
        初始化客户端

        Args:
            api_key: API密钥
            api_url: API基础URL
            provider: 研究服务提供商 (perplexity/tavily/openai)
        """
        self.api_key = api_key or os.getenv('DEEPRESEARCH_API_KEY')
        self.provider = provider

        # 根据提供商设置API URL
        if api_url:
            self.api_url = api_url
        elif provider == 'perplexity':
            self.api_url = 'https://api.perplexity.ai'
        elif provider == 'tavily':
            self.api_url = 'https://api.tavily.com'
        elif provider == 'openai':
            self.api_url = 'https://api.openai.com/v1'
        else:
            self.api_url = api_url or 'http://localhost:8080'

        self.session = requests.Session()
        if self.api_key:
            self.session.headers.update({
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            })

    def generate_chapter(
        self,
        chapter_id: str,
        conversation_history: List[Dict[str, str]],
        doc_type: str = 'business',
        depth: str = 'medium',
        iterations: int = 3,
        summary_text: Optional[str] = None,
        progress_callback: Optional[callable] = None
    ) -> Dict[str, Any]:
        """
        生成商业计划书章节

        Args:
            chapter_id: 章节ID
            conversation_history: 对话历史
            doc_type: 文档类型
            depth: 研究深度
            iterations: 迭代次数
            progress_callback: 进度回调

        Returns:
            生成结果字典
        """
        # 构建研究查询
        query = self._build_research_query(chapter_id, conversation_history, doc_type)

        print(f'[DeepResearch] 开始生成章节: {chapter_id}, 提供商: {self.provider}, 深度: {depth}')

        try:
            # 根据提供商选择不同的实现
            if self.provider == 'perplexity':
                return self._generate_with_perplexity(query, depth, iterations, progress_callback)
            elif self.provider == 'tavily':
                return self._generate_with_tavily(
                    self._build_search_queries(
                        chapter_id,
                        conversation_history,
                        doc_type,
                        query,
                        summary_text=summary_text
                    ),
                    depth,
                    iterations,
                    progress_callback
                )
            elif self.provider == 'openai':
                return self._generate_with_openai(query, depth, iterations, progress_callback)
            else:
                # 默认使用模拟实现
                return self._generate_mock(chapter_id, query, depth, iterations, progress_callback)

        except Exception as e:
            print(f'[DeepResearch] 生成失败: {str(e)}')
            raise Exception(f'DeepResearch生成失败: {str(e)}')

    def _generate_with_perplexity(
        self,
        query: str,
        depth: str,
        iterations: int,
        progress_callback: Optional[callable]
    ) -> Dict[str, Any]:
        """使用Perplexity API生成"""
        print('[DeepResearch] 使用Perplexity API')

        # Perplexity API调用
        response = self.session.post(
            f'{self.api_url}/chat/completions',
            json={
                'model': 'sonar-pro',  # 或 'sonar-reasoning'
                'messages': [
                    {
                        'role': 'system',
                        'content': '你是一个专业的商业分析师，擅长进行深度市场研究和商业分析。请基于最新的数据和信息提供专业的分析报告。'
                    },
                    {
                        'role': 'user',
                        'content': query
                    }
                ],
                'temperature': 0.7,
                'max_tokens': 4000,
                'search_domain_filter': ['news', 'academic'],  # 搜索过滤
                'return_citations': True,  # 返回引用
                'return_images': False
            },
            timeout=300
        )

        response.raise_for_status()
        result = response.json()

        # 解析响应
        content = result['choices'][0]['message']['content']
        citations = result.get('citations', [])

        # 转换引用格式
        sources = [
            {
                'title': cite.get('title', '未知来源'),
                'url': cite.get('url', ''),
                'snippet': cite.get('snippet', ''),
                'relevance': 0.9
            }
            for cite in citations[:10]
        ]

        return {
            'content': content,
            'sources': sources,
            'confidence': 0.9,
            'tokens': result.get('usage', {}).get('total_tokens', 0)
        }

    def _generate_with_tavily(
        self,
        query: str,
        depth: str,
        iterations: int,
        progress_callback: Optional[callable]
    ) -> Dict[str, Any]:
        """使用Tavily API生成"""
        print('[DeepResearch] 使用Tavily API')

        queries = query if isinstance(query, list) else [query]
        answers = []
        results = []
        keyword_seed = ' '.join([q for q in queries if q])
        keywords = self._extract_keywords(keyword_seed)

        for q in queries:
            normalized_query = self._truncate_query(q, 400)
            payload = {
                'query': normalized_query,
                'search_depth': 'advanced' if depth == 'deep' else 'basic',
                'include_answer': True,
                'max_results': 10
            }
            # Tavily 需要 api_key 字段，不接受 Bearer 头作为唯一认证
            if self.api_key:
                payload['api_key'] = self.api_key

            search_response = self.session.post(
                f'{self.api_url}/search',
                json=payload,
                timeout=60
            )

            if not search_response.ok:
                raise Exception(
                    f"Tavily请求失败: {search_response.status_code} {search_response.text[:500]}"
                )

            search_result = search_response.json()
            answers.append(search_result.get('answer', ''))
            results.extend(search_result.get('results', []))

        # 去重结果（按URL）
        deduped = []
        seen = set()
        for r in results:
            url = r.get('url')
            if url and url in seen:
                continue
            if url:
                seen.add(url)
            deduped.append(r)
        results = self._filter_results_by_keywords(deduped, keywords)

        # 使用OpenAI生成最终内容（基于搜索结果）
        context = '\n\n'.join([
            f"来源: {r['title']}\nURL: {r['url']}\n内容: {r['content']}"
            for r in results[:5]
        ])

        combined_answer = '\n\n'.join([a for a in answers if a]).strip()
        final_content = f"{combined_answer}\n\n## 详细分析\n\n基于以下来源的深度分析：\n\n{context}"

        # 转换来源格式
        sources = [
            {
                'title': r.get('title', '未知'),
                'url': r.get('url', ''),
                'snippet': r.get('content', '')[:200],
                'relevance': r.get('score', 0.8)
            }
            for r in results
        ]

        return {
            'content': final_content,
            'sources': sources,
            'confidence': 0.85,
            'tokens': len(final_content.split())
        }

    def _truncate_query(self, query: str, max_len: int = 400) -> str:
        """截断 query 以满足外部搜索接口限制"""
        normalized = ' '.join((query or '').split())
        if len(normalized) <= max_len:
            return normalized
        head = normalized[:200]
        tail = normalized[-150:] if len(normalized) > 350 else ''
        trimmed = f"{head} ... {tail}".strip()
        return trimmed[:max_len]

    def _extract_keywords(self, text: str) -> List[str]:
        """提取简单关键词用于过滤来源"""
        if not text:
            return []
        stopwords = {
            '的','了','和','与','及','或','以及','对于','关于','基于','进行','分析','如何','哪些','什么','是否',
            '项目','产品','市场','行业','用户','公司','企业','计划','报告','策略','模式','核心','关键','目标'
        }
        tokens = [t.strip().lower() for t in text.replace('/', ' ').replace('-', ' ').split()]
        keywords = [t for t in tokens if len(t) >= 2 and t not in stopwords]
        # 去重并限制数量
        deduped = []
        seen = set()
        for t in keywords:
            if t in seen:
                continue
            seen.add(t)
            deduped.append(t)
        return deduped[:12]

    def _filter_results_by_keywords(self, results: List[Dict[str, Any]], keywords: List[str]) -> List[Dict[str, Any]]:
        """根据关键词相关度筛选来源，剔除明显无关项"""
        if not results:
            return []
        if not keywords:
            return results[:10]

        scored = []
        for r in results:
            text = f"{r.get('title','')} {r.get('content','')}".lower()
            hits = sum(1 for k in keywords if k in text)
            scored.append((hits, r))

        # 保留相关度>0，最多10条；若全部为0，保留原始前10条
        filtered = [r for hits, r in sorted(scored, key=lambda x: x[0], reverse=True) if hits > 0]
        return (filtered or [r for _, r in scored])[:10]

    def _build_search_queries(
        self,
        chapter_id: str,
        conversation_history: List[Dict[str, str]],
        doc_type: str,
        base_query: str,
        summary_text: Optional[str] = None
    ) -> List[str]:
        """构建多个短 query，避免单条过长导致搜索失败"""
        if base_query and len(base_query) <= 400:
            return [base_query]

        # 提取最近的用户输入作为核心意图
        user_messages = [m.get('content', '') for m in (conversation_history or []) if m.get('role') == 'user']
        idea = summary_text or (user_messages[-1] if user_messages else '') or ''
        idea = self._truncate_query(idea, 200)

        chapter_focus = {
            'executive-summary': '执行摘要 价值主张 目标市场 商业模式',
            'market-analysis': '市场规模 增长趋势 TAM SAM SOM 用户画像',
            'competitive-landscape': '竞品 分析 竞争优势 市场份额',
            'solution': '解决方案 功能 特性 技术架构',
            'business-model': '商业模式 收入来源 定价 成本结构',
            'financial-projection': '财务预测 收入 成本 盈亏平衡',
            'marketing-strategy': '营销策略 渠道 品牌 获客成本',
            'team-structure': '团队架构 人才 组织',
            'risk-analysis': '风险分析 风险控制',
            'risk-assessment': '风险评估 风险控制',
            'implementation-plan': '实施计划 里程碑 资源'
        }.get(chapter_id, chapter_id.replace('-', ' '))

        queries = [
            f"{idea} {chapter_focus} 关键数据 统计 报告",
            f"{idea} {chapter_focus} 行业趋势 竞争格局",
            f"{idea} {chapter_focus} 最佳实践 案例"
        ]
        return [self._truncate_query(q, 400) for q in queries]

    def _generate_with_openai(
        self,
        query: str,
        depth: str,
        iterations: int,
        progress_callback: Optional[callable]
    ) -> Dict[str, Any]:
        """使用OpenAI API生成（需要配合搜索工具）"""
        print('[DeepResearch] 使用OpenAI API')

        # 注意：OpenAI本身不提供搜索功能，这里只是示例
        # 实际使用时需要配合Bing Search API或其他搜索服务

        response = self.session.post(
            f'{self.api_url}/chat/completions',
            json={
                'model': 'gpt-4-turbo-preview',
                'messages': [
                    {
                        'role': 'system',
                        'content': '你是一个专业的商业分析师。'
                    },
                    {
                        'role': 'user',
                        'content': query
                    }
                ],
                'temperature': 0.7,
                'max_tokens': 4000
            },
            timeout=120
        )

        response.raise_for_status()
        result = response.json()

        content = result['choices'][0]['message']['content']

        return {
            'content': content,
            'sources': [],  # OpenAI不提供来源
            'confidence': 0.75,
            'tokens': result.get('usage', {}).get('total_tokens', 0)
        }

    def _generate_mock(
        self,
        chapter_id: str,
        query: str,
        depth: str,
        iterations: int,
        progress_callback: Optional[callable]
    ) -> Dict[str, Any]:
        """模拟实现（当没有配置真实API时使用）"""
        print('[DeepResearch] 使用模拟实现')

        # 模拟多轮迭代
        for i in range(1, iterations + 1):
            if progress_callback:
                progress_callback(i, iterations, f'正在进行第{i}轮研究...')
            time.sleep(1)  # 模拟处理时间

        # 返回模拟内容
        return {
            'content': f"""# {chapter_id} 章节内容（深度研究模式）

## 概述
这是使用DeepResearch深度研究模式生成的内容。实际部署时，这里会显示基于多轮迭代和网络搜索的专业分析结果。

## 研究发现
1. **关键洞察**：基于对话历史和网络搜索，我们发现...
2. **数据支持**：根据最新的行业报告...
3. **专业建议**：结合最佳实践，建议...

## 详细分析
（这里会包含详细的分析内容，包括数据、图表、引用等）

---
*注意：当前为模拟内容，实际使用时需要配置真实的研究API（Perplexity/Tavily/OpenAI）*
""",
            'sources': self._generate_mock_sources(chapter_id),
            'confidence': 0.85,
            'tokens': 1200
        }

    def _build_research_query(
        self,
        chapter_id: str,
        conversation_history: List[Dict[str, str]],
        doc_type: str
    ) -> str:
        """构建研究查询"""
        conversation_text = self._format_conversation(conversation_history)

        # 章节特定的查询模板
        queries = {
            'market-analysis': f"""
请对以下产品进行深度市场分析：

{conversation_text}

分析要点：
1. 目标市场规模（TAM/SAM/SOM）和增长趋势
2. 用户画像、需求痛点和行为特征
3. 市场驱动因素和发展机会
4. 行业标准和最佳实践

请提供数据支持和可靠来源。
""",
            'competitive-landscape': f"""
请分析以下产品的竞争格局：

{conversation_text}

分析要点：
1. 主要竞品列表和核心特点
2. 竞争优势对比矩阵
3. 市场定位和差异化策略
4. 竞争壁垒和护城河

请提供具体的竞品数据和市场份额信息。
""",
            'financial-projection': f"""
请对以下产品进行财务预测分析：

{conversation_text}

分析要点：
1. 收入模型和定价策略
2. 成本结构和盈亏平衡点
3. 3-5年财务预测
4. 行业财务基准和估值参考

请提供行业数据和财务模型参考。
""",
            'solution-design': f"""
请设计以下产品的解决方案：

{conversation_text}

设计要点：
1. 核心功能和技术架构
2. 用户体验和交互设计
3. 技术实现路径和难点
4. 行业最佳实践参考

请提供技术方案和案例参考。
""",
            'business-model': f"""
请设计以下产品的商业模式：

{conversation_text}

设计要点：
1. 收入来源和盈利模式
2. 成本结构和关键资源
3. 客户关系和渠道策略
4. 价值主张和合作伙伴

请提供商业模式画布和案例参考。
""",
            'executive-summary': f"""
请为以下产品撰写执行摘要：

{conversation_text}

摘要要点：
1. 核心价值主张和解决的问题
2. 目标市场和商业机会
3. 竞争优势和差异化
4. 财务预测和融资需求

请提供简洁有力的总结。
""",
            'marketing-strategy': f"""
请为以下产品制定营销策略：

{conversation_text}

策略要点：
1. 目标客户和市场定位
2. 营销渠道和推广策略
3. 品牌建设和传播计划
4. 预算分配和效果评估

请提供营销案例和最佳实践。
""",
            'risk-analysis': f"""
请对以下产品进行风险分析：

{conversation_text}

分析要点：
1. 市场风险和应对策略
2. 技术风险和解决方案
3. 运营风险和预防措施
4. 财务风险和控制手段

请提供可执行的风险缓解措施和参考案例。
""",
            'risk-assessment': f"""
请对以下产品进行风险评估：

{conversation_text}

分析要点：
1. 市场风险和应对策略
2. 技术风险和解决方案
3. 运营风险和预防措施
4. 财务风险和控制手段

请提供可执行的风险缓解措施和参考案例。
"""
        }

        return queries.get(chapter_id, f"请基于以下内容生成{chapter_id}章节：\n{conversation_text}")

    def _format_conversation(self, conversation_history: List[Dict[str, str]]) -> str:
        """格式化对话历史"""
        if not conversation_history:
            return ''

        lines = []
        for msg in conversation_history:
            role = msg.get('role', 'user')
            content = msg.get('content', '')
            lines.append(f"{role}: {content}")

        return '\n'.join(lines)

    def _generate_mock_sources(self, chapter_id: str) -> List[Dict[str, Any]]:
        """生成模拟数据来源"""
        return [
            {
                'title': '2024年中国AI市场研究报告',
                'url': 'https://example.com/report-2024',
                'snippet': '市场规模达到1000亿元，年增长率30%...',
                'relevance': 0.95
            },
            {
                'title': '行业白皮书：人工智能应用趋势',
                'url': 'https://example.com/whitepaper',
                'snippet': '企业级AI应用正在快速普及...',
                'relevance': 0.88
            },
            {
                'title': '竞品分析：主要玩家对比',
                'url': 'https://example.com/competitor-analysis',
                'snippet': '市场前三名占据70%份额...',
                'relevance': 0.82
            }
        ]
