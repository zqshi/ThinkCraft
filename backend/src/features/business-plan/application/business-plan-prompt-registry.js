import promptLoader from '../../../utils/prompt-loader.js';

let chapterPrompts = {};
let proposalPrompts = {};

export async function initializeBusinessPlanPrompts() {
  chapterPrompts = await promptLoader.loadBusinessPlanChapters();
  proposalPrompts = await promptLoader.loadProposalChapters();
}

export function getChapterPrompts() {
  return chapterPrompts;
}

export function getProposalPrompts() {
  return proposalPrompts;
}

export function getPromptsByType(type = 'business') {
  return type === 'proposal' ? proposalPrompts : chapterPrompts;
}
