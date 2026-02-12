export const BUSINESS_PLAN_NINE_CHAPTERS = [
  'executive-summary',
  'market-analysis',
  'solution',
  'business-model',
  'competitive-landscape',
  'marketing-strategy',
  'team-structure',
  'financial-projection',
  'risk-assessment'
];

export const PROPOSAL_SIX_CHAPTERS = [
  'project-summary',
  'problem-insight',
  'product-solution',
  'implementation-path',
  'budget-planning',
  'risk-control'
];

export function normalizeBusinessPlanChapterIds(type, chapterIds) {
  if (type === 'business') {
    // 商业计划书强制九章：忽略入参章节差异，统一固定顺序
    return [...BUSINESS_PLAN_NINE_CHAPTERS];
  }

  if (type === 'proposal') {
    // 产品立项材料强制六章：忽略入参章节差异，统一固定顺序
    return [...PROPOSAL_SIX_CHAPTERS];
  }

  return Array.isArray(chapterIds) ? chapterIds : [];
}

export function isValidBusinessPlanChapterId(type, chapterId) {
  if (type === 'business') {
    return BUSINESS_PLAN_NINE_CHAPTERS.includes(chapterId);
  }

  if (type === 'proposal') {
    return PROPOSAL_SIX_CHAPTERS.includes(chapterId);
  }

  return true;
}
