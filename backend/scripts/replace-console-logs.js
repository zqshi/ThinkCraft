#!/usr/bin/env node

/**
 * 批量替换console.log为Winston logger
 *
 * 此脚本会：
 * 1. 扫描backend目录下所有.js文件
 * 2. 替换console.log/console.error/console.warn为logger调用
 * 3. 自动添加logger导入语句
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 需要扫描的目录
const SCAN_DIRS = [
  path.join(__dirname, '../domains'),
  path.join(__dirname, '../routes'),
  path.join(__dirname, '../config'),
  path.join(__dirname, '../middleware')
];

// 跳过的文件
const SKIP_FILES = ['errorHandler.js']; // errorHandler可能需要console.error用于调试

// 领域映射（根据文件路径确定使用哪个domainLogger）
const DOMAIN_MAP = {
  'domains/agent': 'Agent',
  'domains/collaboration': 'Collaboration',
  'domains/businessPlan': 'BusinessPlan',
  'domains/demo': 'Demo',
  'domains/pdfExport': 'PdfExport',
  'routes': 'HTTP',
  'config': 'Server',
  'middleware': 'Server'
};

/**
 * 递归扫描目录获取所有.js文件
 */
function getAllJsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        getAllJsFiles(filePath, fileList);
      }
    } else if (file.endsWith('.js') && !SKIP_FILES.includes(file)) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * 确定文件应该使用的领域logger
 */
function getDomainForFile(filePath) {
  for (const [pathPattern, domain] of Object.entries(DOMAIN_MAP)) {
    if (filePath.includes(pathPattern)) {
      return domain;
    }
  }
  return 'Server'; // 默认
}

/**
 * 检查文件是否已经导入了logger
 */
function hasLoggerImport(content) {
  return content.includes('domainLoggers') || content.includes('createDomainLogger');
}

/**
 * 添加logger导入语句
 */
function addLoggerImport(content, domain) {
  const importStatement = `import { domainLoggers } from '../infrastructure/logging/domainLogger.js';\n\nconst logger = domainLoggers.${domain};\n\n`;

  // 找到第一个import语句后的位置
  const importRegex = /^import .+;$/m;
  const match = content.match(importRegex);

  if (match) {
    // 在最后一个import后添加
    const lines = content.split('\n');
    let lastImportIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ')) {
        lastImportIndex = i;
      }
    }

    if (lastImportIndex !== -1) {
      lines.splice(lastImportIndex + 1, 0, '', `const logger = domainLoggers.${domain};`);
      lines.splice(lastImportIndex + 1, 0, `import { domainLoggers } from '../infrastructure/logging/domainLogger.js';`);
      return lines.join('\n');
    }
  }

  // 如果没有import语句，添加到文件开头
  return importStatement + content;
}

/**
 * 替换console调用为logger调用
 */
function replaceConsoleCalls(content) {
  let modified = content;

  // 替换 console.log([Domain]) 格式
  modified = modified.replace(/console\.log\(\s*\[([^\]]+)\]\s*(.+?)\)/g, (match, label, rest) => {
    return `logger.info(${rest})`;
  });

  // 替换 console.error([Domain]) 格式
  modified = modified.replace(/console\.error\(\s*\[([^\]]+)\]\s*(.+?)\)/g, (match, label, rest) => {
    return `logger.error(${rest})`;
  });

  // 替换普通的 console.log
  modified = modified.replace(/console\.log\(/g, 'logger.info(');

  // 替换 console.error
  modified = modified.replace(/console\.error\(/g, 'logger.error(');

  // 替换 console.warn
  modified = modified.replace(/console\.warn\(/g, 'logger.warn(');

  // 替换 console.debug
  modified = modified.replace(/console\.debug\(/g, 'logger.debug(');

  return modified;
}

/**
 * 处理单个文件
 */
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');

    // 检查是否包含console调用
    if (!content.includes('console.')) {
      return { processed: false, reason: 'no-console' };
    }

    // 检查是否已经有logger导入
    const hasImport = hasLoggerImport(content);

    // 确定使用的领域
    const domain = getDomainForFile(filePath);

    // 替换console调用
    const newContent = replaceConsoleCalls(content);

    // 如果内容发生变化且没有logger导入，添加导入
    if (newContent !== content && !hasImport) {
      const finalContent = addLoggerImport(newContent, domain);
      fs.writeFileSync(filePath, finalContent, 'utf-8');
      return { processed: true, domain, changes: countChanges(content, newContent) };
    } else if (newContent !== content) {
      fs.writeFileSync(filePath, newContent, 'utf-8');
      return { processed: true, domain, changes: countChanges(content, newContent) };
    }

    return { processed: false, reason: 'no-changes' };
  } catch (error) {
    return { processed: false, reason: 'error', error: error.message };
  }
}

/**
 * 统计变更次数
 */
function countChanges(oldContent, newContent) {
  const oldConsole = (oldContent.match(/console\./g) || []).length;
  const newConsole = (newContent.match(/console\./g) || []).length;
  return oldConsole - newConsole;
}

/**
 * 主函数
 */
function main() {
  console.log('====================================');
  console.log('  开始替换console.log为logger');
  console.log('====================================\n');

  let totalFiles = 0;
  let processedFiles = 0;
  let totalReplacements = 0;

  // 扫描所有目录
  for (const dir of SCAN_DIRS) {
    console.log(`扫描目录: ${path.relative(path.join(__dirname, '..'), dir)}`);

    if (!fs.existsSync(dir)) {
      console.log(`  跳过（目录不存在）\n`);
      continue;
    }

    const files = getAllJsFiles(dir);
    totalFiles += files.length;

    console.log(`  找到 ${files.length} 个文件\n`);

    for (const file of files) {
      const result = processFile(file);

      if (result.processed) {
        processedFiles++;
        totalReplacements += result.changes;
        const relativePath = path.relative(path.join(__dirname, '..'), file);
        console.log(`✓ ${relativePath}`);
        console.log(`  替换 ${result.changes} 处console调用 → logger.${result.domain}`);
      }
    }

    console.log('');
  }

  console.log('====================================');
  console.log('  替换完成');
  console.log('====================================');
  console.log(`总文件数: ${totalFiles}`);
  console.log(`已处理: ${processedFiles}`);
  console.log(`总替换: ${totalReplacements} 处\n`);
}

main();
