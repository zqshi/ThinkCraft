#!/usr/bin/env node

/**
 * CSS 同步脚本
 * --once: 仅执行一次同步并退出（用于构建）
 * --watch: 持续监听并同步（用于本地开发）
 * 默认行为: watch
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const sourceDir = path.join(rootDir, 'css');
const targetDir = path.join(rootDir, 'public', 'css');

function ensureTargetDir() {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
    console.log('✅ 创建目录:', targetDir);
  }
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

// 初始同步所有 CSS 文件
function initialSync({ logWatchHint = false } = {}) {
  console.log('🔄 开始初始同步...\n');

  if (!fs.existsSync(sourceDir)) {
    console.error(`❌ 源目录不存在: ${sourceDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(sourceDir);
  const cssFiles = files.filter(file => file.endsWith('.css'));

  cssFiles.forEach(file => copyFile(file));

  console.log(`\n✅ 初始同步完成，共 ${cssFiles.length} 个文件`);
  if (logWatchHint) {
    console.log('👀 正在监听 css/ 目录的变化...\n');
  }
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

function getMode() {
  if (process.argv.includes('--once')) {
    return 'once';
  }
  if (process.argv.includes('--watch')) {
    return 'watch';
  }
  return 'watch';
}

// 启动
ensureTargetDir();
const mode = getMode();
if (mode === 'once') {
  initialSync({ logWatchHint: false });
  process.exit(0);
}

initialSync({ logWatchHint: true });
watchFiles();

process.on('SIGINT', () => {
  console.log('\n\n👋 停止监听');
  process.exit(0);
});
