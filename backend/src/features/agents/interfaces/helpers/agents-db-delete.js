import { UserAgentModel } from '../../infrastructure/user-agent.model.js';

export {
  deleteUserAgentFromDb
};

async function deleteUserAgentFromDb(agentId) {
  try {
    await UserAgentModel.deleteOne({ _id: agentId });
    return true;
  } catch (error) {
    return false;
  }
}
