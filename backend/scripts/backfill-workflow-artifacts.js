/**
 * 回填工作流交付物字段
 * 用法：
 *  node scripts/backfill-workflow-artifacts.js --apply --fill-source
 *  node scripts/backfill-workflow-artifacts.js --apply --fill-source --fill-tokens
 */
import { mongoManager } from '../config/database.js';
import { ProjectModel } from '../src/features/projects/infrastructure/project.model.js';

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const fillSource = args.has('--fill-source');
const fillTokens = args.has('--fill-tokens');
const defaultSource = process.env.ARTIFACT_SOURCE_DEFAULT || 'legacy';

async function run() {
  console.log('[Backfill] 连接 MongoDB...');
  await mongoManager.connect();

  const query = { 'workflow.stages.0': { $exists: true } };
  const projects = await ProjectModel.find(query);

  let touchedProjects = 0;
  let touchedArtifacts = 0;

  for (const project of projects) {
    let projectChanged = false;
    const stages = project.workflow?.stages || [];

    stages.forEach(stage => {
      const stageId = stage.id;
      const artifacts = Array.isArray(stage.artifacts) ? stage.artifacts : [];

      artifacts.forEach(artifact => {
        let changed = false;
        if (!artifact.stageId) {
          artifact.stageId = stageId;
          changed = true;
        }
        if (fillSource && !artifact.source) {
          artifact.source = defaultSource;
          changed = true;
        }
        if (fillTokens && (artifact.tokens === undefined || artifact.tokens === null)) {
          artifact.tokens = 0;
          changed = true;
        }
        if (changed) {
          touchedArtifacts += 1;
          projectChanged = true;
        }
      });
    });

    if (projectChanged) {
      touchedProjects += 1;
      if (apply) {
        await project.save();
        console.log(`[Backfill] ✓ 更新项目 ${project._id}`);
      } else {
        console.log(`[Backfill] ⚠️ 预览变更项目 ${project._id}`);
      }
    }
  }

  console.log(
    `[Backfill] 完成：项目 ${touchedProjects} 个，交付物 ${touchedArtifacts} 条${
      apply ? '' : '（未写入，使用 --apply 才会写入）'
    }`
  );

  await mongoManager.disconnect();
}

run().catch(async error => {
  console.error('[Backfill] 失败:', error);
  try {
    await mongoManager.disconnect();
  } catch (disconnectError) {
    console.error('[Backfill] 断开连接失败:', disconnectError);
  }
  process.exitCode = 1;
});
