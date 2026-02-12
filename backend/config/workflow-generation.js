function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const WORKFLOW_GENERATION_CONFIG = {
  reactEnabled: String(process.env.WORKFLOW_REACT_ENABLED || 'true').trim() !== 'false',
  prototype: {
    maxTokens: toPositiveInt(process.env.WORKFLOW_PROTOTYPE_MAX_TOKENS, 8000),
    // 默认 10 轮，支持通过环境变量覆盖
    loopMaxRounds: toPositiveInt(process.env.WORKFLOW_PROTOTYPE_LOOP_MAX_ROUNDS, 10),
    loopChunkMaxTokens: toPositiveInt(process.env.WORKFLOW_PROTOTYPE_LOOP_CHUNK_MAX_TOKENS, 3200),
    skipReact: String(process.env.WORKFLOW_PROTOTYPE_SKIP_REACT || 'true').trim() !== 'false',
    endMarker: String(process.env.WORKFLOW_PROTOTYPE_END_MARKER || '<!--END_HTML-->')
  },
  artifact: {
    loopMaxRounds: toPositiveInt(process.env.WORKFLOW_ARTIFACT_LOOP_MAX_ROUNDS, 4),
    loopChunkMaxTokens: toPositiveInt(process.env.WORKFLOW_ARTIFACT_LOOP_CHUNK_MAX_TOKENS, 2800)
  }
};

