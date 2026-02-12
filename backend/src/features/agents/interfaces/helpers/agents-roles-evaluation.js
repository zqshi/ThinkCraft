import { callDeepSeekAPI } from '../../../../../config/deepseek.js';
import { ARTIFACT_TYPES } from '../../../../../config/workflow-stages.js';
import { normalizeOutputToTypeId } from './agents-outputs.js';
import { buildRoleTemplateMapping } from './agents-roles-mapping.js';

export {
  evaluateStageOutputsWithAI
};

async function evaluateStageOutputsWithAI({
  idea,
  conversation,
  stages,
  workflowCategory,
  agentDeliverableMap
}) {
  try {
    if (!Array.isArray(stages) || stages.length === 0) {
      return null;
    }

    const deliverables = Object.entries(ARTIFACT_TYPES)
      .filter(([, def]) => Array.isArray(def?.promptTemplates) && def.promptTemplates.length > 0)
      .map(([id, def]) => ({
        id,
        name: def?.name || id,
        description: def?.description || '',
        templates: def?.promptTemplates || []
      }));
    if (deliverables.length === 0) {
      return null;
    }

    const templateIds = new Set(deliverables.map(d => d.id));
    const buildAllowedForStage = stage => {
      const stageOutputs = Array.isArray(stage.outputs) ? stage.outputs : [];
      const normalizedOutputs = stageOutputs.map(normalizeOutputToTypeId).filter(Boolean);
      if (normalizedOutputs.length > 0) {
        return Array.from(new Set(normalizedOutputs.filter(id => templateIds.has(id))));
      }
      const agentIds = Array.isArray(stage.agents) ? stage.agents : [];
      const agentOutputs = agentIds
        .flatMap(agentId => agentDeliverableMap?.get(agentId) || [])
        .map(normalizeOutputToTypeId)
        .filter(Boolean);
      const filtered = agentOutputs.filter(id => templateIds.has(id));
      return Array.from(new Set(filtered));
    };

    const stageBrief = stages.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description || '',
      agents: Array.isArray(s.agents) ? s.agents : [],
      allowedDeliverables: buildAllowedForStage(s)
    }));

    const roleTemplateMapping = buildRoleTemplateMapping();

    const prompt = `你是项目交付物规划专家。请基于创意、阶段信息、角色-模板映射与可用交付物列表，为每个阶段选择最必要的交付物类型。

【创意】
${idea || '未提供'}

【流程类型】
${workflowCategory || 'product-development'}

【对话摘要】
${conversation || '未提供'}

【角色与交付物模板映射（仅能从映射中选择）】
${JSON.stringify(roleTemplateMapping, null, 2)}

【阶段列表（包含该阶段可选交付物范围，必须在范围内选择）】
${JSON.stringify(stageBrief, null, 2)}

【可用交付物类型（仅能从以下id中选择，必须基于现有模板）】
${JSON.stringify(deliverables, null, 2)}

【输出要求】
1. 严格输出JSON对象：{ "stageId": ["deliverableTypeId", ...], ... }
2. 每个阶段选择 2-6 个交付物，优先选关键交付物
3. 每个阶段的输出必须是该阶段 allowedDeliverables 的子集
4. 只能使用“可用交付物类型”中的 id，禁止自造
4. 不要输出其他解释文字`;

    const result = await callDeepSeekAPI([{ role: 'user', content: prompt }], null, {
      max_tokens: 1200,
      temperature: 0.2,
      timeout: 90000
    });

    let parsed = null;
    try {
      parsed = JSON.parse(result.content);
    } catch (err) {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    }

    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const validIds = new Set(deliverables.map(d => d.id));
    const outputsByStage = {};
    Object.entries(parsed).forEach(([stageId, outputs]) => {
      if (!Array.isArray(outputs)) {
        return;
      }
      const normalized = outputs.map(normalizeOutputToTypeId).filter(id => id && validIds.has(id));
      if (normalized.length > 0) {
        const stage = stages.find(s => s.id === stageId);
        const allowed = stage ? buildAllowedForStage(stage) : [];
        const allowedSet = new Set(allowed);
        const filtered =
          allowed.length > 0 ? normalized.filter(id => allowedSet.has(id)) : normalized;
        if (filtered.length > 0) {
          outputsByStage[stageId] = Array.from(new Set(filtered));
        }
      }
    });

    return outputsByStage;
  } catch (error) {
    console.warn('[协作建议] 阶段交付物评估失败，回退本地映射:', error?.message || error);
    return null;
  }
}
