import { UserAgentModel } from '../../infrastructure/user-agent.model.js';

export {
  updateUserAgentInDb
};

async function updateUserAgentInDb(agentId, updates = {}) {
  try {
    await UserAgentModel.updateOne({ _id: agentId }, { $set: updates });
    return true;
  } catch (error) {
    return false;
  }
}
