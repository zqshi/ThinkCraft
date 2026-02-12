import { UserAgentModel } from '../../infrastructure/user-agent.model.js';
import { normalizeUserAgent } from './agents-db-normalize.js';

export {
  loadUserAgentsFromDb
};

async function loadUserAgentsFromDb(userId) {
  try {
    const docs = await UserAgentModel.find({ userId }).lean();
    if (!docs || docs.length === 0) {
      return [];
    }
    return docs.map(doc => normalizeUserAgent(doc)).filter(Boolean);
  } catch (error) {
    return null;
  }
}
