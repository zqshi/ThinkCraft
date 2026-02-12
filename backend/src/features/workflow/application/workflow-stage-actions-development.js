import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { runCommand } from './workflow-command-runner.js';

export async function executeDevelopmentStageActions({ projectId, projectRoot }) {
  const results = [];
  const frontendDir = path.join(projectRoot, 'frontend');
  const backendDir = path.join(projectRoot, 'backend');

  const frontendPkg = path.join(frontendDir, 'package.json');
  if (fs.existsSync(frontendPkg)) {
    const frontendNodeModules = path.join(frontendDir, 'node_modules');
    if (!fs.existsSync(frontendNodeModules)) {
      const installResult = await runCommand('npm install', {
        cwd: frontendDir,
        timeoutMs: 15 * 60 * 1000
      });
      results.push({ label: 'Frontend npm install', result: installResult });
    }

    try {
      const pkg = JSON.parse(await fsPromises.readFile(frontendPkg, 'utf-8'));
      if (pkg?.scripts?.build) {
        const buildResult = await runCommand('npm run build', {
          cwd: frontendDir,
          timeoutMs: 15 * 60 * 1000
        });
        results.push({ label: 'Frontend npm run build', result: buildResult });
      }
      if (pkg?.scripts?.dev) {
        const devResult = await runCommand('npm run dev', {
          cwd: frontendDir,
          timeoutMs: 30 * 1000
        });
        results.push({ label: 'Frontend npm run dev (30s)', result: devResult });
      }
    } catch (error) {
      results.push({
        label: 'Frontend build skipped',
        result: { ok: false, stdout: '', stderr: 'package.json 解析失败', durationMs: 0 }
      });
    }
  }

  const backendPkg = path.join(backendDir, 'package.json');
  if (fs.existsSync(backendPkg)) {
    const backendNodeModules = path.join(backendDir, 'node_modules');
    if (!fs.existsSync(backendNodeModules)) {
      const installResult = await runCommand('npm install', {
        cwd: backendDir,
        timeoutMs: 15 * 60 * 1000
      });
      results.push({ label: 'Backend npm install', result: installResult });
    }

    try {
      const pkg = JSON.parse(await fsPromises.readFile(backendPkg, 'utf-8'));
      if (pkg?.scripts?.dev) {
        const devResult = await runCommand('npm run dev', {
          cwd: backendDir,
          timeoutMs: 30 * 1000
        });
        results.push({ label: 'Backend npm run dev (30s)', result: devResult });
      }
    } catch (error) {
      results.push({
        label: 'Backend dev skipped',
        result: { ok: false, stdout: '', stderr: 'package.json 解析失败', durationMs: 0 }
      });
    }
  }

  if (results.length === 0) {
    return [];
  }

  const nowIso = new Date().toISOString();
  const content = [
    '# 开发阶段动作日志（真实执行）',
    '',
    `- 项目: ${projectId}`,
    `- 执行时间: ${nowIso}`,
    '',
    ...results.map(item => {
      const logs = [item.result.stdout, item.result.stderr].filter(Boolean).join('\n');
      const duration = Math.round((item.result.durationMs || 0) / 1000);
      return [
        `## ${item.label}`,
        '',
        `- 状态: ${item.result.ok ? 'success' : 'failed'}`,
        `- 耗时: ${duration}s`,
        '',
        '```',
        logs || '(empty)',
        '```'
      ].join('\n');
    })
  ].join('\n');

  return [
    {
      id: `artifact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      projectId,
      stageId: 'development',
      type: 'report',
      name: 'Development Actions Log',
      content,
      agentName: 'devops',
      source: 'execution',
      createdAt: Date.now(),
      tokens: 0
    }
  ];
}
