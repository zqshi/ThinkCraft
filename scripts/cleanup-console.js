#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 清理调试代码的函数
function cleanupDebugCode(content) {
  // 移除 console.log 语句
  content = content.replace(/console\.log\([^)]*\);?\s*\n?/g, '');

  // 移除 console.error 语句
  content = content.replace(/console\.error\([^)]*\);?\s*\n?/g, '');

  // 移除 console.warn 语句
  content = content.replace(/console\.warn\([^)]*\);?\s*\n?/g, '');

  // 移除 console.info 语句
  content = content.replace(/console\.info\([^)]*\);?\s*\n?/g, '');

  // 移除 debugger 语句
  content = content.replace(/debugger;?\s*\n?/g, '');

  // 移除空行（连续两个以上的空行）
  content = content.replace(/\n{3,}/g, '\n\n');

  return content;
}

// 递归处理目录
function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      processDirectory(filePath);
    } else if (stat.isFile() && file.endsWith('.js')) {
      processFile(filePath);
    }
  });
}

// 处理单个文件
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    content = cleanupDebugCode(content);

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ 已清理: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ 处理失败: ${filePath}`, error.message);
  }
}

// 主函数
function main() {
  console.log('开始清理前端调试代码...');

  const frontendPath = path.join(__dirname, '..', 'frontend', 'js');

  if (fs.existsSync(frontendPath)) {
    processDirectory(frontendPath);
    console.log('\n✅ 前端调试代码清理完成！');
  } else {
    console.error('❌ 找不到前端目录:', frontendPath);
  }
}

main();
