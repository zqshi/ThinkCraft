export function registerDeployRoutes(router, deps) {
  const {
    projectRepository,
    ARTIFACT_TYPES,
    callDeepSeekAPI,
    parseJsonPayload,
    buildRoleTemplateMapping,
    collectProjectArtifacts,
    normalizeOutputToTypeId
  } = deps;

  router.post('/:projectId/deploy-readiness', async (req, res, next) => {
    try {
      const { projectId } = req.params;
      const { goal, idea, conversation } = req.body || {};

      const project = await projectRepository.findById(projectId);
      if (!project) {
        return res.status(404).json({ code: -1, error: '项目不存在' });
      }

      const workflow = project.workflow?.toJSON ? project.workflow.toJSON() : project.workflow;
      const workflowStages = Array.isArray(workflow?.stages) ? workflow.stages : [];
      const stageArtifacts = collectProjectArtifacts(workflowStages);

      const stageBrief = workflowStages.map(stage => ({
        id: stage.id,
        name: stage.name,
        description: stage.description || '',
        agents: Array.isArray(stage.agents) ? stage.agents : [],
        outputs: Array.isArray(stage.outputs) ? stage.outputs : [],
        outputsDetailed: Array.isArray(stage.outputsDetailed) ? stage.outputsDetailed : []
      }));

      const deliverablesCatalog = Object.entries(ARTIFACT_TYPES).map(([id, def]) => ({
        id,
        name: def?.name || id,
        description: def?.description || '',
        templates: Array.isArray(def?.promptTemplates) ? def.promptTemplates : []
      }));

      const roleTemplateMapping = buildRoleTemplateMapping();
      const targetGoal = goal || '输出一个可实际交付部署的完整产品';

      const step1Prompt = `你是项目交付物规划专家。目标是：${targetGoal}\n\n【创意】\n${idea || '未提供'}\n\n【对话摘要】\n${conversation || '未提供'}\n\n【角色与交付物模板映射（仅能从映射中选择）】\n${JSON.stringify(roleTemplateMapping, null, 2)}\n\n【阶段列表】\n${JSON.stringify(stageBrief, null, 2)}\n\n【交付物类型库（仅能从以下id中选择，必须基于现有模板）】\n${JSON.stringify(deliverablesCatalog, null, 2)}\n\n请输出JSON：\n{\n  "requiredByStage": { "stageId": ["deliverableTypeId", "..."] },\n  "criticalDeliverables": ["deliverableTypeId", "..."],\n  "notes": "简短说明"\n}\n\n要求：\n1. 每个阶段至少选择1个交付物类型\n2. 必须来自交付物类型库\n3. requiredByStage 内的类型必须与阶段输出和角色职责匹配`;

      const step1Result = await callDeepSeekAPI([{ role: 'user', content: step1Prompt }], null, {
        max_tokens: 1200,
        temperature: 0.2,
        timeout: 90000
      });

      const step1Parsed = parseJsonPayload(step1Result?.content) || {};
      const requiredByStage = step1Parsed.requiredByStage || {};
      const criticalDeliverables = Array.isArray(step1Parsed.criticalDeliverables)
        ? step1Parsed.criticalDeliverables
        : [];

      const missingByStage = {};
      const availableByStage = {};
      workflowStages.forEach(stage => {
        const stageId = stage.id;
        const required = Array.isArray(requiredByStage?.[stageId]) ? requiredByStage[stageId] : [];
        const artifactsForStage = Array.isArray(stageArtifacts.get(stageId))
          ? stageArtifacts.get(stageId)
          : [];
        const actualTypes = artifactsForStage
          .map(a => normalizeOutputToTypeId(a?.type || a?.name))
          .filter(Boolean);
        const actualSet = new Set(actualTypes);
        const missing = required.filter(type => !actualSet.has(type));
        if (missing.length > 0) {
          missingByStage[stageId] = missing;
        }
        availableByStage[stageId] = Array.from(new Set(actualTypes));
      });

      const overallMissingCritical = criticalDeliverables.filter(type => {
        return !Object.values(availableByStage).some(list => list.includes(type));
      });

      const step2Prompt = `你是项目交付评估专家。目标是：${targetGoal}\n\n【阶段要求】\n${JSON.stringify(requiredByStage, null, 2)}\n\n【阶段已产出交付物】\n${JSON.stringify(availableByStage, null, 2)}\n\n【缺失交付物】\n${JSON.stringify(missingByStage, null, 2)}\n\n【关键交付物缺失】\n${JSON.stringify(overallMissingCritical, null, 2)}\n\n请输出JSON：\n{\n  "isDeployable": true/false,\n  "riskLevel": "low|medium|high",\n  "summary": "简短结论",\n  "nextActions": ["动作1", "动作2", "..."],\n  "stageGaps": [{ "stageId": "阶段", "missing": ["类型"], "impact": "影响说明" }]\n}\n\n要求：仅输出JSON，避免额外解释。`;

      const step2Result = await callDeepSeekAPI([{ role: 'user', content: step2Prompt }], null, {
        max_tokens: 1000,
        temperature: 0.2,
        timeout: 90000
      });

      const step2Parsed = parseJsonPayload(step2Result?.content) || {};

      res.json({
        code: 0,
        data: {
          goal: targetGoal,
          requiredByStage,
          criticalDeliverables,
          availableByStage,
          missingByStage,
          missingCritical: overallMissingCritical,
          assessment: step2Parsed,
          method: 'react-loop'
        }
      });
    } catch (error) {
      next(error);
    }
  });
}
