/**
 * 生成卡住修复任务（服务端兜底）
 * - 将长时间 "generating" 的报告修复为 completed 或 failed
 * - 将已生成章节但仍处于 draft 的商业计划书标记为 completed
 */
import { ReportModel } from '../features/report/infrastructure/report.model.js';
import { BusinessPlanModel } from '../features/business-plan/infrastructure/business-plan.model.js';

const DEFAULT_STALE_MINUTES = 60;
const DEFAULT_INTERVAL_MINUTES = 15;

let intervalId = null;

function shouldRunCleanup() {
  return (process.env.DB_TYPE || 'memory') === 'mongodb';
}

function getConfig() {
  const staleMinutes = Number(process.env.GENERATION_STUCK_TTL_MINUTES || DEFAULT_STALE_MINUTES);
  const intervalMinutes = Number(
    process.env.GENERATION_STUCK_CLEANUP_INTERVAL_MINUTES || DEFAULT_INTERVAL_MINUTES
  );

  return {
    staleMs: Math.max(5, staleMinutes) * 60 * 1000,
    intervalMs: Math.max(5, intervalMinutes) * 60 * 1000
  };
}

export async function runGenerationCleanup({ now = new Date() } = {}) {
  if (!shouldRunCleanup()) {
    return {
      reportCompleted: 0,
      reportFailed: 0,
      businessPlanCompleted: 0
    };
  }
  const { staleMs } = getConfig();
  const cutoff = new Date(now.getTime() - staleMs);

  const results = {
    reportCompleted: 0,
    reportFailed: 0,
    businessPlanCompleted: 0
  };

  // 报告：generating 且已超过阈值，按内容修复
  const completedReportUpdate = await ReportModel.updateMany(
    {
      status: 'generating',
      updatedAt: { $lt: cutoff },
      'sections.0': { $exists: true }
    },
    {
      $set: {
        status: 'completed',
        completedAt: now,
        updatedAt: now
      }
    }
  );
  results.reportCompleted = completedReportUpdate.modifiedCount || 0;

  const failedReportUpdate = await ReportModel.updateMany(
    {
      status: 'generating',
      updatedAt: { $lt: cutoff },
      $or: [{ sections: { $exists: false } }, { sections: { $size: 0 } }]
    },
    {
      $set: {
        status: 'failed',
        updatedAt: now,
        'metadata.generationError': '生成超时已自动标记失败',
        'metadata.autoRecoveredAt': now
      }
    }
  );
  results.reportFailed = failedReportUpdate.modifiedCount || 0;

  // 商业计划书：draft 但已有章节，修复为 completed
  const planUpdate = await BusinessPlanModel.updateMany(
    {
      status: 'draft',
      updatedAt: { $lt: cutoff },
      'chapters.0': { $exists: true }
    },
    {
      $set: {
        status: 'completed',
        completedAt: now,
        updatedAt: now
      }
    }
  );
  results.businessPlanCompleted = planUpdate.modifiedCount || 0;

  return results;
}

export function startGenerationCleanup() {
  if (intervalId) {
    return intervalId;
  }
  if (!shouldRunCleanup()) {
    console.log('[GenerationCleanup] DB_TYPE 非 mongodb，跳过自动修复任务');
    return null;
  }

  const { intervalMs } = getConfig();
  intervalId = setInterval(() => {
    runGenerationCleanup()
      .then(result => {
        if (result.reportCompleted || result.reportFailed || result.businessPlanCompleted) {
          console.log('[GenerationCleanup] 修复完成', result);
        }
      })
      .catch(error => {
        console.warn('[GenerationCleanup] 执行失败:', error.message);
      });
  }, intervalMs);

  return intervalId;
}

export function stopGenerationCleanup() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
