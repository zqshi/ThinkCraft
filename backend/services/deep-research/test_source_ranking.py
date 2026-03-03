import unittest

from app import append_canonical_source_list, rank_and_filter_sources


class SourceRankingTests(unittest.TestCase):
    def test_rank_and_filter_sources_keeps_relevant_top10(self):
        conversation = [
            {"role": "user", "content": "做一个面向宠物主的智能健身APP，关注用户痛点和市场机会"}
        ]
        raw_sources = [
            {
                "title": "Pet Fitness Market Report 2025",
                "url": "https://www.statista.com/pet-fitness-report",
                "snippet": "宠物 健身 app 用户 场景 痛点 机会 市场 需求 adoption trends",
                "relevance": 0.95,
            },
            {
                "title": "Reuters: Health app growth",
                "url": "https://www.reuters.com/technology/health-app-growth",
                "snippet": "用户 需求 市场 增长 机会 app growth and wellness spending",
                "relevance": 0.9,
            },
            {
                "title": "首页",
                "url": "https://foo.com",
                "snippet": "noise",
                "relevance": 0.9,
            },
        ]

        for i in range(20):
            raw_sources.append(
                {
                    "title": f"Unrelated forum {i}",
                    "url": f"https://forum.example.com/post-{i}",
                    "snippet": "random gaming thread unrelated to product market",
                    "relevance": 0.1,
                }
            )

        ranked = rank_and_filter_sources(raw_sources, conversation, "project-summary", max_items=10)

        self.assertLessEqual(len(ranked), 10)
        self.assertTrue(any("statista.com" in item["url"] for item in ranked))
        self.assertTrue(all(item.get("relevance", 0) >= 0.75 for item in ranked))

    def test_append_canonical_source_list_replaces_existing_list(self):
        content = "## 结论\n这是正文\n\n## 来源清单\n1. 旧来源 - https://old.example.com"
        sources = [
            {"title": "新来源A", "url": "https://a.example.com"},
            {"title": "新来源B", "url": "https://b.example.com"},
        ]

        merged = append_canonical_source_list(content, sources)
        self.assertIn("## 来源清单", merged)
        self.assertIn("1. 新来源A - https://a.example.com", merged)
        self.assertIn("2. 新来源B - https://b.example.com", merged)
        self.assertNotIn("旧来源", merged)


if __name__ == "__main__":
    unittest.main()
