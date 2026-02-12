import { ARTIFACT_TYPES } from '../../../../../config/workflow-stages.js';

export {
  normalizeOutputToTypeId,
  buildOutputsDetailed
};

function normalizeOutputToTypeId(output) {
  const text = String(output || '').trim();
  if (!text) {
    return null;
  }
  if (ARTIFACT_TYPES[text]) {
    return text;
  }
  const entry = Object.entries(ARTIFACT_TYPES).find(([, def]) => def?.name === text);
  return entry ? entry[0] : null;
}

function buildOutputsDetailed(outputs = []) {
  return outputs.map(outputId => {
    const def = ARTIFACT_TYPES[outputId];
    return def
      ? { id: outputId, name: def.name, promptTemplates: def.promptTemplates || [] }
      : { id: outputId, name: outputId, promptTemplates: [] };
  });
}
