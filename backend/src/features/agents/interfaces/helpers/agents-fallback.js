import { AGENT_PROMPT_MAP } from '../../../../../config/workflow-stages.js';

export {
  normalizeAgentId,
  buildFallbackAgent
};

const AGENT_TYPES = AGENT_PROMPT_MAP || {};

function normalizeAgentId(raw) {
  if (!raw) {
    return null;
  }
  if (AGENT_TYPES[raw]) {
    return raw;
  }
  if (raw.endsWith('-agent.md')) {
    const stripped = raw.slice(0, -9);
    if (AGENT_TYPES[stripped]) {
      return stripped;
    }
  }
  if (raw.endsWith('-agent')) {
    const stripped = raw.slice(0, -6);
    if (AGENT_TYPES[stripped]) {
      return stripped;
    }
  }
  return raw;
}

function buildFallbackAgent(id, promptInfo) {
  return {
    id,
    name: id,
    emoji: '🤖',
    desc: promptInfo?.description || '暂无描述',
    skills: [],
    salary: 0,
    level: 'custom',
    available: true,
    promptPath: promptInfo?.promptPath
  };
}
