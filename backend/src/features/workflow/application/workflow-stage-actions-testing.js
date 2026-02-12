import fs from 'fs';
import path from 'path';
import { resolveRepoRoot } from '../../../features/projects/infrastructure/project-files.js';
import {
  extractFailureLines,
  formatCommandSection,
  trimLog
} from '../interfaces/helpers/workflow-helpers.js';
import { runCommand } from './workflow-command-runner.js';
import { buildExecutionArtifact } from './workflow-artifact-builder.js';

export async function executeTestingStage({ projectId, stageId, effectiveArtifactTypes }) {
  const repoRoot = resolveRepoRoot();
  const results = [];
  const rootTest = await runCommand('npm test', {
    cwd: repoRoot,
    timeoutMs: 30 * 60 * 1000
  });
  results.push({ label: 'Root npm test', result: rootTest });

  const backendPkg = path.join(repoRoot, 'backend', 'package.json');
  if (fs.existsSync(backendPkg)) {
    const backendTest = await runCommand('npm test', {
      cwd: path.join(repoRoot, 'backend'),
      timeoutMs: 30 * 60 * 1000
    });
    results.push({ label: 'Backend npm test', result: backendTest });
  }

  const failed = results.find(item => !item.result.ok);
  if (failed) {
    const output = [failed.result.stdout, failed.result.stderr].filter(Boolean).join('\n');
    const tail = trimLog(output, 4000);
    const err = new Error(`测试命令失败: ${failed.label}\n\n${tail}`);
    err.status = 500;
    throw err;
  }

  const sections = results.map(item => formatCommandSection(item.label, item.result));
  const totalDurationMs = results.reduce((sum, item) => sum + item.result.durationMs, 0);
  const nowIso = new Date().toISOString();
  const combinedLogs = results
    .map(item => [item.result.stdout, item.result.stderr].filter(Boolean).join('\n'))
    .join('\n');

  const artifacts = [];
  if (effectiveArtifactTypes.includes('test-report')) {
    const content = [
      '# 测试报告（真实执行）',
      '',
      `- 项目: ${projectId}`,
      `- 执行时间: ${nowIso}`,
      `- 总耗时: ${Math.round(totalDurationMs / 1000)}s`,
      '',
      ...sections
    ].join('\n');
    artifacts.push(
      buildExecutionArtifact({
        projectId,
        stageId,
        artifactType: 'test-report',
        content,
        agentType: 'qa-engineer',
        meta: { durationMs: totalDurationMs }
      })
    );
  }

  if (effectiveArtifactTypes.includes('bug-list')) {
    const failures = extractFailureLines(combinedLogs);
    const content = [
      '# Bug 清单（基于真实测试日志）',
      '',
      failures.length === 0
        ? '未检测到失败用例或错误日志。'
        : failures.map((line, idx) => `${idx + 1}. ${line}`).join('\n')
    ].join('\n');
    artifacts.push(
      buildExecutionArtifact({
        projectId,
        stageId,
        artifactType: 'bug-list',
        content,
        agentType: 'qa-engineer'
      })
    );
  }

  if (effectiveArtifactTypes.includes('performance-report')) {
    const perfScript = path.join(repoRoot, 'scripts', 'performance-test-simple.sh');
    let perfContent = '# 性能测试报告（真实执行）\n\n未执行性能测试。';
    if (fs.existsSync(perfScript)) {
      const perfResult = await runCommand('bash scripts/performance-test-simple.sh', {
        cwd: repoRoot,
        timeoutMs: 15 * 60 * 1000
      });
      perfContent = [
        '# 性能测试报告（真实执行）',
        '',
        formatCommandSection('Performance test (simple)', perfResult)
      ].join('\n');
    }

    artifacts.push(
      buildExecutionArtifact({
        projectId,
        stageId,
        artifactType: 'performance-report',
        content: perfContent,
        agentType: 'qa-engineer'
      })
    );
  }

  return artifacts;
}
