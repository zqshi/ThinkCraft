#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 处理TODO的函数
function handleTodos(content, filePath) {
  let modified = false;

  // 处理不同类型的TODO
  const todoPatterns = [
    {
      pattern: /\/\/\s*TODO:\s*(.*)\n/g,
      handler: (match, todoText) => {
        console.log(`📋 发现TODO in ${filePath}: ${todoText.trim()}`);
        // 保留TODO但添加时间戳
        modified = true;
        return `// TODO [${new Date().toISOString().split('T')[0]}]: ${todoText}\n`;
      }
    },
    {
      pattern: /\/\*\s*TODO:\s*(.*?)\s*\*\//g,
      handler: (match, todoText) => {
        console.log(`📋 发现TODO in ${filePath}: ${todoText.trim()}`);
        modified = true;
        return `/* TODO [${new Date().toISOString().split('T')[0]}]: ${todoText} */`;
      }
    },
    {
      pattern: /\/\/\s*FIXME:\s*(.*)\n/g,
      handler: (match, fixmeText) => {
        console.log(`🔧 发现FIXME in ${filePath}: ${fixmeText.trim()}`);
        // 将FIXME标记为HIGH PRIORITY
        modified = true;
        return `// FIXME [HIGH PRIORITY - ${new Date().toISOString().split('T')[0]}]: ${fixmeText}\n`;
      }
    },
    {
      pattern: /\/\/\s*BUG:\s*(.*)\n/g,
      handler: (match, bugText) => {
        console.log(`🐛 发现BUG in ${filePath}: ${bugText.trim()}`);
        // 将BUG转换为FIXME
        modified = true;
        return `// FIXME [BUG - ${new Date().toISOString().split('T')[0]}]: ${bugText}\n`;
      }
    },
    {
      pattern: /\/\/\s*HACK:\s*(.*)\n/g,
      handler: (match, hackText) => {
        console.log(`⚠️  发现HACK in ${filePath}: ${hackText.trim()}`);
        // 将HACK标记为需要重构
        modified = true;
        return `// HACK [REFACTOR NEEDED - ${new Date().toISOString().split('T')[0]}]: ${hackText}\n`;
      }
    }
  ];

  let newContent = content;
  todoPatterns.forEach(({ pattern, handler }) => {
    newContent = newContent.replace(pattern, handler);
  });

  return { content: newContent, modified };
}

// 递归处理目录
function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  let totalModified = 0;

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      totalModified += processDirectory(filePath);
    } else if (stat.isFile() && file.endsWith('.js')) {
      const modified = processFile(filePath);
      if (modified) totalModified++;
    }
  });

  return totalModified;
}

// 处理单个文件
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const result = handleTodos(content, filePath);

    if (result.modified) {
      fs.writeFileSync(filePath, result.content, 'utf8');
      return true;
    }
  } catch (error) {
    console.error(`❌ 处理失败: ${filePath}`, error.message);
  }
  return false;
}

// 生成TODO报告
function generateTodoReport() {
  const reportPath = path.join(__dirname, '..', 'TODO_REPORT.md');
  const reportContent = `# TODO/FIXME 处理报告

生成时间: ${new Date().toISOString()}

## 处理结果
- 所有TODO/FIXME已标记时间戳
- BUG已转换为FIXME并标记优先级
- HACK已标记需要重构

## 建议
1. 优先处理标记为[HIGH PRIORITY]的FIXME
2. 定期审查TODO列表
3. 在开发新功能前解决现有FIXME

## 下一步行动
- [ ] 审查所有FIXME并制定修复计划
- [ ] 为复杂TODO创建GitHub Issue
- [ ] 建立TODO处理流程规范
`;

  fs.writeFileSync(reportPath, reportContent, 'utf8');
  console.log(`\n📝 TODO报告已生成: ${reportPath}`);
}

// 主函数
function main() {
  console.log('开始处理TODO/FIXME注释...\n');

  const frontendPath = path.join(__dirname, '..', 'frontend');
  const backendPath = path.join(__dirname, '..', 'backend');

  let totalModified = 0;

  if (fs.existsSync(frontendPath)) {
    console.log('处理前端文件...');
    totalModified += processDirectory(frontendPath);
  }

  if (fs.existsSync(backendPath)) {
    console.log('\n处理后端文件...');
    totalModified += processDirectory(backendPath);
  }

  console.log(`\n✅ 处理完成！共修改 ${totalModified} 个文件`);

  // 生成报告
  generateTodoReport();
}

main();
