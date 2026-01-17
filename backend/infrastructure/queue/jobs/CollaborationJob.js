import queueManager from '../QueueManager.js';

const QUEUE_NAME = 'collaboration';

export async function enqueueCollaborationJob(payload) {
  return queueManager.collaborationQueue.add(QUEUE_NAME, payload);
}

