import { ARTIFACT_TYPES } from '../../../../../config/workflow-stages.js';

export {
  parseJsonPayload,
  normalizeOutputToTypeId,
  escapeRegExp,
  replaceTemplateVariables,
  trimLog,
  formatCommandSection,
  extractFailureLines,
  redactEnvContent
};

function parseJsonPayload(text) {
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    const match = String(text).match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (inner) {
        return null;
      }
    }
    return null;
  }
}

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

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceTemplateVariables(content, context = {}) {
  let result = String(content || '');
  Object.entries(context || {}).forEach(([key, value]) => {
    const safeValue = value === null || value === undefined ? '' : String(value);
    result = result.replace(new RegExp(`\\{${escapeRegExp(key)}\\}`, 'g'), safeValue);
  });
  return result;
}

function trimLog(text, maxChars = 20000) {
  const value = String(text || '');
  if (value.length <= maxChars) {
    return value;
  }
  return value.slice(value.length - maxChars);
}

function formatCommandSection(label, result) {
  const status = result.ok ? 'SUCCESS' : 'FAILED';
  const duration = `${Math.round(result.durationMs / 1000)}s`;
  const output = [result.stdout, result.stderr].filter(Boolean).join('\n');
  return [
    `## ${label}`,
    `- 状态: ${status}`,
    `- 耗时: ${duration}`,
    '',
    '```',
    trimLog(output, 20000),
    '```'
  ].join('\n');
}

function extractFailureLines(logText, maxLines = 200) {
  const lines = String(logText || '').split('\n');
  const hits = lines.filter(line =>
    /(^|\s)(FAIL|FAILURE|Error:|✕|●)\b/.test(line)
  );
  const unique = Array.from(new Set(hits));
  return unique.slice(0, maxLines);
}

function redactEnvContent(envText) {
  const lines = String(envText || '').split('\n');
  return lines
    .map(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
        return line;
      }
      const [key] = trimmed.split('=');
      return `${key}=***`;
    })
    .join('\n');
}
