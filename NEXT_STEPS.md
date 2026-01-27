# ThinkCraft 提示词架构升级 - 下一步工作任务

## 项目背景

ThinkCraft项目已完成提示词架构的全面升级，采用全新的、干净的架构设计，按照两个场景（对话链路和Agent调度链路）进行组织。

## 已完成工作总结

### ✅ 核心架构已完成

1. **新目录结构创建**
   - 创建了 `prompts/` 作为单一数据源
   - 场景一：`prompts/scene-1-dialogue/`（对话链路）
   - 场景二：`prompts/scene-2-agent-orchestration/`（Agent调度链路）

2. **内容迁移完成**
   - 场景一：对话引导、分析报告、商业计划书（11章节）、立项材料（7章节）
   - 场景二：11个Agent产品开发Agent（按3阶段分类）+ 6个传统产品开发Agent

3. **共享规范创建**
   - agent-collaboration.md（Agent协作规范）
   - prompt-structure.md（标准Prompt结构）
   - task-decomposition.md（任务分解方法论）
   - quality-checklist.md（质量检查清单）

4. **代码更新完成**
   - `backend/src/utils/prompt-loader.js`：更新promptDir路径
   - `backend/scripts/validate-prompts.js`：更新路径引用

5. **文档创建完成**
   - `prompts/README.md`（总体说明）
   - `prompts/scene-1-dialogue/README.md`（场景一说明）
   - `prompts/scene-2-agent-orchestration/README.md`（场景二说明）

---

## 下一步工作任务清单

### 任务1：测试验证（优先级：高）

**目标**：确保新架构的提示词加载功能正常工作

#### 1.1 测试PromptLoader基础功能

**执行步骤**：

```bash
# 1. 进入backend目录
cd /Users/zqs/Downloads/project/ThinkCraft/backend

# 2. 启动Node REPL测试
node

# 3. 在REPL中执行以下测试代码
```

```javascript
// 导入PromptLoader
import promptLoader from './src/utils/prompt-loader.js';

// 初始化
await promptLoader.initialize();

// 测试1：加载场景一的对话引导提示词
const dialoguePrompt = await promptLoader.load('scene-1-dialogue/dialogue-guide/system-default');
console.log('对话引导提示词长度:', dialoguePrompt.length);

// 测试2：加载场景二的Agent提示词
const demandManager = await promptLoader.load(
  'scene-2-agent-orchestration/agent-product-development/agents/demand-design/product-demand-manager'
);
console.log('需求管理Agent提示词长度:', demandManager.length);

// 测试3：加载共享规范
const collaboration = await promptLoader.load(
  'scene-2-agent-orchestration/shared/agent-collaboration'
);
console.log('协作规范长度:', collaboration.length);

// 测试4：检查可用的Agent类型
console.log('可用Agent类型:', promptLoader.getAvailableAgentTypes());
```

**预期结果**：

- 所有提示词都能成功加载
- 没有报错
- 返回的内容长度 > 0

**如果失败**：

- 检查路径是否正确
- 检查文件是否存在
- 查看错误信息并修复

#### 1.2 测试商业计划书生成功能

**执行步骤**：

```bash
# 启动后端服务
cd /Users/zqs/Downloads/project/ThinkCraft/backend
npm start
```

```bash
# 在另一个终端测试API
curl http://localhost:3000/api/prompts/scene-1-dialogue/business-plan/full-document

# 测试章节加载
curl http://localhost:3000/api/prompts/business-plan/chapters
```

**预期结果**：

- API返回正确的提示词内容
- 章节配置正确加载

#### 1.3 测试Agent调用功能

**执行步骤**：

```bash
# 测试Agent提示词API
curl http://localhost:3000/api/prompts/scene-2-agent-orchestration/agent-product-development/agents/demand-design/product-demand-manager
```

**预期结果**：

- 返回Agent的完整提示词定义

---

### 任务2：创建验证脚本（优先级：中）

**目标**：提供自动化验证工具，确保提示词质量

#### 2.1 创建目录结构验证脚本

**文件路径**：`scripts/prompt-governance/validate-prompt-structure.js`

**执行步骤**：

```bash
# 创建目录
mkdir -p /Users/zqs/Downloads/project/ThinkCraft/scripts/prompt-governance

# 创建文件
touch /Users/zqs/Downloads/project/ThinkCraft/scripts/prompt-governance/validate-prompt-structure.js
```

**脚本内容**：

```javascript
/**
 * 验证提示词目录结构
 */
import fs from 'fs/promises';
import path from 'path';

const REQUIRED_STRUCTURE = {
  'prompts/scene-1-dialogue/dialogue-guide': true,
  'prompts/scene-1-dialogue/analysis-report': true,
  'prompts/scene-1-dialogue/business-plan': true,
  'prompts/scene-1-dialogue/proposal': true,
  'prompts/scene-2-agent-orchestration/shared': true,
  'prompts/scene-2-agent-orchestration/agent-product-development': true,
  'prompts/scene-2-agent-orchestration/traditional-product-development': true
};

async function validateStructure() {
  console.log('验证提示词目录结构...\n');

  let errors = 0;

  for (const dir of Object.keys(REQUIRED_STRUCTURE)) {
    try {
      const stats = await fs.stat(dir);
      if (stats.isDirectory()) {
        console.log(`✅ ${dir}`);
      } else {
        console.log(`❌ ${dir} 不是目录`);
        errors++;
      }
    } catch (error) {
      console.log(`❌ ${dir} 不存在`);
      errors++;
    }
  }

  console.log(
    `\n总计: ${Object.keys(REQUIRED_STRUCTURE).length - errors} 个通过, ${errors} 个错误`
  );

  if (errors > 0) {
    process.exit(1);
  }
}

validateStructure();
```

**运行方式**：

```bash
cd /Users/zqs/Downloads/project/ThinkCraft
node scripts/prompt-governance/validate-prompt-structure.js
```

#### 2.2 创建依赖验证脚本

**文件路径**：`scripts/prompt-governance/validate-dependencies.js`

**功能**：验证提示词文件中的引用依赖是否存在

**执行步骤**：参考上面的模式创建脚本

#### 2.3 创建提示词加载测试脚本

**文件路径**：`scripts/prompt-governance/test-prompt-loading.js`

**功能**：自动化测试所有提示词的加载功能

---

### 任务3：清理旧文件（优先级：低，建议在测试通过后执行）

**目标**：清理历史文件，保持项目整洁

#### 3.1 归档旧的提示词目录

**执行步骤**：

````bash
cd /Users/zqs/Downloads/project/ThinkCraft

# 创建归档目录
mkdir -p docs/archives/2026-01-27-before-upgrade

# 移动旧目录到归档
mv docs/prompt docs/archives/2026-01-27-before-upgrade/
mv docs/agent-product-development.backup docs/archives/2026-01-27-before-upgrade/
mv docs/product-development.backup docs/archives/2026-01-27-before-upgrade/

# 创建归档说明
cat > docs/archives/2026-01-27-before-upgrade/README.md << 'EOF'
# 提示词架构升级前的备份

**归档时间**：2026-01-27
**归档原因**：提示词架构升级前的完整备份

## 内容说明

- `prompt/`：旧的提示词目录
- `agent-product-development.backup/`：Agent产品开发旧版本
- `product-development.backup/`：传统产品开发旧版本

## 新架构位置

新的提示词架构位于：`/prompts/`

## 恢复方法

如需回滚（不建议）：
```bash
cp -r docs/archives/2026-01-27-before-upgrade/prompt docs/
````

EOF

````

**注意**：
- ⚠️ 只在测试验证通过后执行此步骤
- ⚠️ 确保新架构完全正常工作
- ⚠️ 建议保留归档至少1个月

#### 3.2 更新.gitignore

**执行步骤**：

```bash
cd /Users/zqs/Downloads/project/ThinkCraft

# 添加归档目录到.gitignore
echo "docs/archives/" >> .gitignore
````

---

### 任务4：更新.claude/skills配置（优先级：中）

**目标**：更新Claude Code的Skill系统，使其使用新的提示词路径

#### 4.1 检查当前Skill配置

**执行步骤**：

```bash
cd /Users/zqs/Downloads/project/ThinkCraft

# 查看agent-product-orchestrator的配置
cat .claude/skills/agent-product-orchestrator/SKILL.md | head -20

# 查看product-orchestrator的配置
cat .claude/skills/product-orchestrator/SKILL.md | head -20
```

#### 4.2 更新Skill中的路径引用

**需要检查的文件**：

- `.claude/skills/agent-product-orchestrator/SKILL.md`
- `.claude/skills/product-orchestrator/SKILL.md`
- `.claude/skills/agent-product-orchestrator/README.md`
- `.claude/skills/product-orchestrator/README.md`

**需要更新的内容**：

- 如果有硬编码的路径引用，更新为新路径
- 如果引用了 `docs/prompt/`，更新为 `prompts/`

---

### 任务5：提交变更到Git（优先级：高）

**目标**：将架构升级的变更提交到版本控制

#### 5.1 查看变更

**执行步骤**：

```bash
cd /Users/zqs/Downloads/project/ThinkCraft

# 查看所有变更
git status

# 查看具体变更内容
git diff backend/src/utils/prompt-loader.js
git diff backend/scripts/validate-prompts.js
```

#### 5.2 提交变更

**执行步骤**：

```bash
# 添加新文件
git add prompts/

# 添加修改的文件
git add backend/src/utils/prompt-loader.js
git add backend/scripts/validate-prompts.js

# 查看暂存的变更
git status

# 提交
git commit -m "feat: 提示词架构全面升级

- 创建prompts/目录作为单一数据源
- 场景一（对话链路）：按功能独立管理
- 场景二（Agent调度链路）：按开发类型组织，共享规范独立管理
- 更新PromptLoader和验证脚本路径
- 创建完整的README文档和使用说明

架构特点：
- 场景完全分离
- 共享机制高效
- 结构清晰易维护
- 扩展性强

BREAKING CHANGE: 提示词目录结构重组，从docs/prompt/迁移到prompts/"
```

---

## 快速执行清单

### 立即执行（必须）

```bash
# 1. 测试提示词加载
cd /Users/zqs/Downloads/project/ThinkCraft/backend
node
# 然后执行上面的测试代码

# 2. 启动后端服务测试
npm start
# 在另一个终端测试API

# 3. 如果测试通过，提交变更
cd /Users/zqs/Downloads/project/ThinkCraft
git add prompts/ backend/src/utils/prompt-loader.js backend/scripts/validate-prompts.js
git commit -m "feat: 提示词架构全面升级"
```

### 后续执行（可选）

```bash
# 1. 创建验证脚本
mkdir -p scripts/prompt-governance
# 创建validate-prompt-structure.js等脚本

# 2. 清理旧文件（测试通过后）
mkdir -p docs/archives/2026-01-27-before-upgrade
mv docs/prompt docs/archives/2026-01-27-before-upgrade/
```

---

## 关键文件路径参考

### 新架构核心文件

```
prompts/
├── README.md                                    # 总体说明
├── scene-1-dialogue/
│   ├── README.md                                # 场景一说明
│   ├── dialogue-guide/system-default.md         # 对话引导
│   ├── business-plan/full-document.md           # 商业计划书
│   └── proposal/full-document.md                # 立项材料
└── scene-2-agent-orchestration/
    ├── README.md                                # 场景二说明
    ├── shared/
    │   ├── agent-collaboration.md               # 协作规范
    │   ├── prompt-structure.md                  # Prompt结构
    │   ├── task-decomposition.md                # 任务分解
    │   └── quality-checklist.md                 # 质量检查
    ├── agent-product-development/
    │   ├── product-core.md                      # 核心原则
    │   ├── workflow.json                        # 工作流
    │   └── agents/                              # 11个Agent
    └── traditional-product-development/
        ├── product-core.md                      # 核心原则
        ├── workflow.json                        # 工作流
        └── agents/                              # 6个Agent
```

### 修改的代码文件

```
backend/src/utils/prompt-loader.js               # 第15行：promptDir路径
backend/scripts/validate-prompts.js              # 第122、175行：路径引用
```

---

## 常见问题处理

### Q1：提示词加载失败

**症状**：`Failed to load prompt`错误

**解决方案**：

1. 检查文件路径是否正确
2. 检查文件是否存在：`ls -la prompts/scene-1-dialogue/dialogue-guide/`
3. 检查文件权限：`chmod 644 prompts/**/*.md`

### Q2：API返回404

**症状**：API端点返回404错误

**解决方案**：

1. 检查后端服务是否启动
2. 检查路由配置是否正确
3. 查看后端日志：`tail -f backend/logs/app.log`

### Q3：Git提交冲突

**症状**：提交时出现冲突

**解决方案**：

1. 先拉取最新代码：`git pull`
2. 解决冲突
3. 重新提交

---

## 联系信息

如有问题，请参考：

- 架构设计文档：`/Users/zqs/.claude/plans/effervescent-petting-cocke.md`
- 总体说明：`prompts/README.md`
- 场景一说明：`prompts/scene-1-dialogue/README.md`
- 场景二说明：`prompts/scene-2-agent-orchestration/README.md`

---

**文档版本**：1.0.0
**创建时间**：2026-01-27
**最后更新**：2026-01-27
