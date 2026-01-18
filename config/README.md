# ThinkCraft 配置目录

本目录包含ThinkCraft的核心配置文件。

## 配置文件

### system-prompts.js
AI系统提示词配置文件，定义了AI助手的行为和对话风格。

**包含的预设**：
- `default` - 默认的专业创意分析助手
- `business_consultant` - 商业分析顾问
- `friendly_mentor` - 友好的创业导师
- `tech_product_expert` - 技术产品专家
- `lean_startup_coach` - 精益创业教练
- `concise` - 简洁直接模式

**修改方式**：
1. 打开 `system-prompts.js`
2. 修改 `DEFAULT_PROMPT` 切换预设，或直接编辑预设内容
3. 保存后刷新浏览器

详细的配置指南已移至 `docs/guides/QUICK_REFERENCE.md`

## 未来配置（计划中）
- `.env` - 环境变量配置（PostgreSQL、Redis等）
- `database.js` - 数据库连接配置
- `redis.js` - Redis缓存配置
