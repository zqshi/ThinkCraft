# 提示词架构清理前的归档

**归档时间**：2026-01-27
**归档原因**：提示词架构升级后的冗余文件清理

## 归档内容

本目录包含提示词架构升级前的所有冗余文件：

### 1. `prompt/` - 旧的提示词目录

- **来源**：`docs/prompt/`
- **说明**：架构升级前的提示词目录，已迁移到 `prompts/`
- **包含内容**：
  - agents/：旧的Agent定义
  - business-plan/：商业计划书提示词
  - proposal/：立项材料提示词
  - analysis-report/：分析报告提示词
  - dialogue/：对话引导提示词
  - workflows/：工作流定义
  - design-standard.backup/：设计标准备份

### 2. `agent-product-development.backup/` - Agent产品开发备份

- **来源**：`docs/agent-product-development.backup/`
- **说明**：最初的Agent产品开发提示词版本
- **状态**：已整合到新架构的 `prompts/scene-2-agent-orchestration/agent-product-development/`

### 3. `product-development.backup/` - 传统产品开发备份

- **来源**：`docs/product-development.backup/`
- **说明**：最初的传统产品开发提示词版本
- **状态**：已整合到新架构的 `prompts/scene-2-agent-orchestration/traditional-product-development/`

### 4. `.claude-skills/` - Claude Skills旧配置

- **来源**：`.claude/skills/_shared/`
- **说明**：Claude Code Skills系统的旧配置
- **状态**：已迁移到 `prompts/scene-2-agent-orchestration/shared/`

## 新架构位置

所有提示词现在统一管理在：`/prompts/`

### 目录结构

```
prompts/
├── scene-1-dialogue/              # 场景一：对话链路
│   ├── dialogue-guide/
│   ├── analysis-report/
│   ├── business-plan/
│   └── proposal/
└── scene-2-agent-orchestration/   # 场景二：Agent调度链路
    ├── shared/                    # 共享规范
    ├── agent-product-development/
    └── traditional-product-development/
```

## 恢复方法

如需回滚（不建议）：

```bash
# 恢复旧的prompt目录
cp -r docs/archives/2026-01-27-before-cleanup/prompt docs/

# 恢复备份目录
cp -r docs/archives/2026-01-27-before-cleanup/agent-product-development.backup docs/
cp -r docs/archives/2026-01-27-before-cleanup/product-development.backup docs/

# 恢复.claude/skills配置
cp -r docs/archives/2026-01-27-before-cleanup/.claude-skills/* .claude/skills/
```

## 注意事项

⚠️ **重要**：

- 归档文件仅供参考和应急恢复使用
- 新架构已经过完整测试验证
- 建议保留归档至少1个月
- 1个月后如无问题可以删除归档

## 相关文档

- 新架构说明：`/prompts/README.md`
- 升级计划：`/Users/zqs/.claude/plans/effervescent-petting-cocke.md`
- 下一步任务：`/NEXT_STEPS.md`

---

**文档版本**：1.0.0
**创建时间**：2026-01-27
**维护者**：ThinkCraft Team
