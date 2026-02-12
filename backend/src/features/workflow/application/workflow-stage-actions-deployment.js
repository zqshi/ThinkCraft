import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { resolveRepoRoot } from '../../../features/projects/infrastructure/project-files.js';
import { formatCommandSection, redactEnvContent, trimLog } from '../interfaces/helpers/workflow-helpers.js';
import { runCommand } from './workflow-command-runner.js';
import { buildExecutionArtifact } from './workflow-artifact-builder.js';

export async function executeDeploymentStage({ projectId, stageId, effectiveArtifactTypes }) {
  const repoRoot = resolveRepoRoot();
  const envFile = process.env.PROD_ENV_FILE || path.join(repoRoot, 'backend', '.env.production');
  if (!fs.existsSync(envFile)) {
    const err = new Error(`部署环境文件不存在: ${envFile}`);
    err.status = 400;
    throw err;
  }

  const deployResult = await runCommand(`bash scripts/start-prod.sh "${envFile}"`, {
    cwd: repoRoot,
    timeoutMs: 30 * 60 * 1000
  });
  if (!deployResult.ok) {
    const output = [deployResult.stdout, deployResult.stderr].filter(Boolean).join('\n');
    const tail = trimLog(output, 4000);
    const err = new Error(`部署命令失败\n\n${tail}`);
    err.status = 500;
    throw err;
  }

  const statusResult = await runCommand('docker compose ps', {
    cwd: repoRoot,
    timeoutMs: 60 * 1000
  });
  const nowIso = new Date().toISOString();
  const artifacts = [];

  if (effectiveArtifactTypes.includes('deploy-doc')) {
    const content = [
      '# 部署文档（真实执行）',
      '',
      `- 项目: ${projectId}`,
      `- 执行时间: ${nowIso}`,
      '',
      formatCommandSection('Deploy command', deployResult),
      '',
      formatCommandSection('Service status', statusResult)
    ].join('\n');
    artifacts.push(
      buildExecutionArtifact({
        projectId,
        stageId,
        artifactType: 'deploy-doc',
        content,
        agentType: 'devops'
      })
    );
  }

  if (effectiveArtifactTypes.includes('env-config')) {
    const envText = await fsPromises.readFile(envFile, 'utf-8');
    const content = ['# 环境配置（脱敏）', '', `来源: ${envFile}`, '', '```', redactEnvContent(envText), '```'].join('\n');
    artifacts.push(
      buildExecutionArtifact({
        projectId,
        stageId,
        artifactType: 'env-config',
        content,
        agentType: 'devops'
      })
    );
  }

  if (effectiveArtifactTypes.includes('release-notes')) {
    const gitResult = await runCommand('git log -1 --pretty=format:%H', {
      cwd: repoRoot,
      timeoutMs: 30 * 1000
    });
    const commit = gitResult.ok ? gitResult.stdout.trim() : 'unknown';
    const content = [
      '# 发布说明（真实执行）',
      '',
      `- 提交: ${commit || 'unknown'}`,
      `- 时间: ${nowIso}`,
      '',
      '本次发布为自动化部署生成。'
    ].join('\n');
    artifacts.push(
      buildExecutionArtifact({
        projectId,
        stageId,
        artifactType: 'release-notes',
        content,
        agentType: 'devops'
      })
    );
  }

  return artifacts;
}
