export {
  normalizeUserAgent
};

function normalizeUserAgent(doc) {
  if (!doc) {
    return null;
  }
  const id = doc.id || doc._id;
  return {
    id,
    userId: doc.userId,
    type: doc.type,
    name: doc.name,
    nickname: doc.nickname || doc.name,
    emoji: doc.emoji,
    desc: doc.desc,
    skills: Array.isArray(doc.skills) ? doc.skills : [],
    salary: doc.salary || 0,
    level: doc.level,
    hiredAt: doc.hiredAt,
    status: doc.status || 'idle',
    tasksCompleted: doc.tasksCompleted || 0,
    performance: doc.performance || 100
  };
}
