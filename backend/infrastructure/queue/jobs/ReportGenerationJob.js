import queueManager from '../QueueManager.js';

const QUEUE_NAME = 'report-generation';

export async function enqueueReportGenerationJob(payload) {
  return queueManager.reportQueue.add(QUEUE_NAME, payload);
}

