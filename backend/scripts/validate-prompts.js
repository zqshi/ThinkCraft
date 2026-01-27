/**
 * Prompt同步验证脚本
 * 验证Markdown文件与JS脚本的同步性
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * 验证Markdown文件格式
 */
async function validateMarkdownFormat(filePath, type) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const errors = [];

    // 检查是否有代码块
    const codeBlockMatch = content.match(/```\s*([^\s]*?)\s*\n([\s\S]*?)```/);
    if (!codeBlockMatch) {
      errors.push(`缺少代码块`);
    }

    // 检查是否有版本信息
    if (!content.includes('Version:')) {
      errors.push(`缺少版本信息`);
    }

    // 检查是否有更新日期
    if (!content.includes('Last Updated:')) {
      errors.push(`缺少更新日期`);
    }

    // 检查占位符格式（仅对Task类型）
    if (type === 'task') {
      const promptContent = codeBlockMatch ? codeBlockMatch[2] : '';
      if (promptContent.includes('{{taskContent}}')) {
        // 正确格式
      } else if (promptContent.includes('${taskContent}')) {
        errors.push(`占位符格式错误：应使用 {{taskContent}} 而不是 \${taskContent}`);
      }
    }

    return { valid: errors.length === 0, errors };
  } catch (error) {
    return { valid: false, errors: [`读取文件失败: ${error.message}`] };
  }
}

/**
 * 获取JS文件中定义的类型
 */
async function getDefinedTypes(jsFilePath, type) {
  try {
    const content = await fs.readFile(jsFilePath, 'utf-8');
    const types = new Set();

    if (type === 'agent') {
      // 从agent-prompts.js中提取Agent类型
      const match = content.match(/const basePrompts = \{([^}]+)\}/s);
      if (match) {
        const typesText = match[1];
        const typeMatches = typesText.matchAll(/(\w+):/g);
        for (const m of typeMatches) {
          types.add(m[1]);
        }
      }
    } else if (type === 'task') {
      // 从task-prompts.js中提取Task类型
      const match = content.match(/const templates = \{([^}]+)\}/s);
      if (match) {
        const typesText = match[1];
        const typeMatches = typesText.matchAll(/(\w+):/g);
        for (const m of typeMatches) {
          types.add(m[1]);
        }
      }
    }

    return Array.from(types);
  } catch (error) {
    log(`读取JS文件失败: ${error.message}`, 'red');
    return [];
  }
}

/**
 * 获取Markdown文件列表
 */
async function getMarkdownFiles(dir) {
  try {
    const files = await fs.readdir(dir);
    return files.filter(file => file.endsWith('.md')).map(file => path.basename(file, '.md'));
  } catch (error) {
    return [];
  }
}

/**
 * 验证Agent Prompts
 */
async function validateAgentPrompts() {
  log('\n=== 验证Agent Prompts ===', 'blue');

  const agentsDir = path.join(__dirname, '../../prompts/scene-2-agent-orchestration');
  const jsFile = path.join(
    __dirname,
    '../src/features/agents/infrastructure/prompt-templates/agent-prompts.js'
  );

  // 获取Markdown文件列表
  const mdFiles = await getMarkdownFiles(agentsDir);
  log(`找到 ${mdFiles.length} 个Agent Markdown文件`, 'green');

  // 获取JS中定义的类型
  const jsTypes = await getDefinedTypes(jsFile, 'agent');
  log(`JS文件中定义了 ${jsTypes.length} 个Agent类型`, 'green');

  // 验证每个Markdown文件
  let validCount = 0;
  let errorCount = 0;

  for (const mdFile of mdFiles) {
    const filePath = path.join(agentsDir, `${mdFile}.md`);
    const result = await validateMarkdownFormat(filePath, 'agent');

    if (result.valid) {
      log(`✓ ${mdFile}.md`, 'green');
      validCount++;
    } else {
      log(`✗ ${mdFile}.md`, 'red');
      result.errors.forEach(err => log(`  - ${err}`, 'yellow'));
      errorCount++;
    }
  }

  // 检查是否有JS中定义但没有Markdown文件的类型
  const missingMd = jsTypes.filter(type => !mdFiles.includes(type));
  if (missingMd.length > 0) {
    log(`\n警告: 以下Agent类型在JS中定义但缺少Markdown文件:`, 'yellow');
    missingMd.forEach(type => log(`  - ${type}.md`, 'yellow'));
  }

  // 检查是否有Markdown文件但JS中没有定义的类型
  const extraMd = mdFiles.filter(type => !jsTypes.includes(type));
  if (extraMd.length > 0) {
    log(`\n提示: 以下Markdown文件存在但JS中未定义（将使用动态加载）:`, 'blue');
    extraMd.forEach(type => log(`  - ${type}.md`, 'blue'));
  }

  log(
    `\n总计: ${validCount} 个有效, ${errorCount} 个错误`,
    validCount === mdFiles.length ? 'green' : 'yellow'
  );
  return errorCount === 0;
}

/**
 * 验证Task Prompts
 */
async function validateTaskPrompts() {
  log('\n=== 验证Task Prompts ===', 'blue');

  const tasksDir = path.join(__dirname, '../../prompts/scene-2-agent-orchestration/shared');
  const jsFile = path.join(
    __dirname,
    '../src/features/agents/infrastructure/prompt-templates/task-prompts.js'
  );

  // 获取Markdown文件列表
  const mdFiles = await getMarkdownFiles(tasksDir);
  log(`找到 ${mdFiles.length} 个Task Markdown文件`, 'green');

  // 获取JS中定义的类型
  const jsTypes = await getDefinedTypes(jsFile, 'task');
  log(`JS文件中定义了 ${jsTypes.length} 个Task类型`, 'green');

  // 验证每个Markdown文件
  let validCount = 0;
  let errorCount = 0;

  for (const mdFile of mdFiles) {
    const filePath = path.join(tasksDir, `${mdFile}.md`);
    const result = await validateMarkdownFormat(filePath, 'task');

    if (result.valid) {
      log(`✓ ${mdFile}.md`, 'green');
      validCount++;
    } else {
      log(`✗ ${mdFile}.md`, 'red');
      result.errors.forEach(err => log(`  - ${err}`, 'yellow'));
      errorCount++;
    }
  }

  // 检查是否有JS中定义但没有Markdown文件的类型
  const missingMd = jsTypes.filter(type => !mdFiles.includes(type));
  if (missingMd.length > 0) {
    log(`\n警告: 以下Task类型在JS中定义但缺少Markdown文件:`, 'yellow');
    missingMd.forEach(type => log(`  - ${type}.md`, 'yellow'));
  }

  // 检查是否有Markdown文件但JS中没有定义的类型
  const extraMd = mdFiles.filter(type => !jsTypes.includes(type));
  if (extraMd.length > 0) {
    log(`\n提示: 以下Markdown文件存在但JS中未定义（将使用动态加载）:`, 'blue');
    extraMd.forEach(type => log(`  - ${type}.md`, 'blue'));
  }

  log(
    `\n总计: ${validCount} 个有效, ${errorCount} 个错误`,
    validCount === mdFiles.length ? 'green' : 'yellow'
  );
  return errorCount === 0;
}

/**
 * 主函数
 */
async function main() {
  log('========================================', 'blue');
  log('  Prompt同步验证工具', 'blue');
  log('========================================', 'blue');

  const agentValid = await validateAgentPrompts();
  const taskValid = await validateTaskPrompts();

  log('\n========================================', 'blue');
  if (agentValid && taskValid) {
    log('  ✓ 所有验证通过', 'green');
    log('========================================', 'blue');
    process.exit(0);
  } else {
    log('  ✗ 验证失败，请修复上述错误', 'red');
    log('========================================', 'blue');
    process.exit(1);
  }
}

main();
