#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function main() {
  console.log('🧹 开始清理node_modules...\n');

  const backendPath = path.join(__dirname, '..', 'backend');
  const nodeModulesPath = path.join(backendPath, 'node_modules');

  try {
    // 检查是否存在node_modules
    if (fs.existsSync(nodeModulesPath)) {
      console.log('📦 发现node_modules目录，正在清理...');

      // 从git中移除node_modules
      try {
        execSync('git rm -r --cached node_modules', {
          cwd: backendPath,
          stdio: 'pipe'
        });
        console.log('✅ 已从git跟踪中移除node_modules');
      } catch (error) {
        console.log('⚠️  node_modules可能未被git跟踪');
      }

      // 删除node_modules目录
      fs.rmSync(nodeModulesPath, { recursive: true, force: true });
      console.log('✅ 已删除node_modules目录');

      // 删除package-lock.json
      const packageLockPath = path.join(backendPath, 'package-lock.json');
      if (fs.existsSync(packageLockPath)) {
        fs.unlinkSync(packageLockPath);
        console.log('✅ 已删除package-lock.json');
      }

      console.log('\n🎉 node_modules清理完成！');
      console.log('\n下一步操作:');
      console.log('1. 运行: cd backend && npm install');
      console.log('2. 提交更改: git add -A && git commit -m "Remove node_modules from tracking"');
    } else {
      console.log('✅ node_modules目录不存在，无需清理');
    }
  } catch (error) {
    console.error('❌ 清理失败:', error.message);
  }
}

main();
