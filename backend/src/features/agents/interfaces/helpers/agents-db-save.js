import { UserAgentModel } from '../../infrastructure/user-agent.model.js';

export {
  saveUserAgentToDb
};

async function saveUserAgentToDb(agent) {
  try {
    if (!agent?.id || !agent?.userId) {
      return null;
    }
    await UserAgentModel.updateOne(
      { _id: agent.id },
      {
        $set: {
          userId: agent.userId,
          type: agent.type,
          name: agent.name || agent.nickname || '',
          nickname: agent.nickname || agent.name || '',
          emoji: agent.emoji || '',
          desc: agent.desc || '',
          skills: Array.isArray(agent.skills) ? agent.skills : [],
          salary: agent.salary || 0,
          level: agent.level || '',
          hiredAt: agent.hiredAt || new Date().toISOString(),
          status: agent.status || 'idle',
          tasksCompleted: agent.tasksCompleted || 0,
          performance: agent.performance || 100
        }
      },
      { upsert: true }
    );
    return agent;
  } catch (error) {
    return null;
  }
}
