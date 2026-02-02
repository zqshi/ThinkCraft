#!/usr/bin/env node

/**
 * CSS自动同步脚本
 * 监听 css/ 目录的变化，自动同步到 public/css/
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const sourceDir = path.join(rootDir, 'css');
const targetDir = path.join(rootDir, 'public', 'css');

// 确保目标目录存在
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
  console.log('✅ 创建目录:', targetDir);
}

// 复制单个文件
function copyFile(filename) {
  const sourcePath = path.join(sourceDir, filename);
  const targetPath = path.join(targetDir, filename);

  try {
    fs.copyFileSync(sourcePath, targetPath);
    const time = new Date().toLocaleTimeString('zh-CN');
    console.log(`[${time}] ✅ 同步: ${filename}`);
  } catch (error) {
    console.error(`❌ 复制失败: ${filename}`, error.message);
  }
}

// 初始同步所有CSS文件
function initialSync() {
  console.log('🔄 开始初始同步...\n');

  const files = fs.readdirSync(sourceDir);
  const cssFiles = files.filter(file => file.endsWith('.css'));

  cssFiles.forEach(file => copyFile(file));

  console.log(`\n✅ 初始同步完成，共 ${cssFiles.length} 个文件`);
  console.log('👀 正在监听 css/ 目录的变化...\n');
}

// 监听文件变化
function watchFiles() {
  fs.watch(sourceDir, { recursive: false }, (eventType, filename) => {
    if (filename && filename.endsWith('.css')) {
      // 添加防抖，避免重复触发
      clearTimeout(watchFiles.debounceTimer);
      watchFiles.debounceTimer = setTimeout(() => {
        copyFile(filename);
      }, 100);
    }
  });
}

// 启动
initialSync();
watchFiles();

// 保持进程运行
process.on('SIGINT', () => {
  console.log('\n\n👋 停止监听');
  process.exit(0);
});
