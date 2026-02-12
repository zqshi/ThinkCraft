import express from 'express';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { callDeepSeekAPI } from '../../../../config/deepseek.js';
import { ARTIFACT_TYPES, normalizeStageId } from '../../../../config/workflow-stages.js';
import { projectRepository } from '../../../features/projects/infrastructure/index.js';
import {
  deleteArtifactPhysicalFile,
  ensureProjectWorkspace,
  removeArtifactsIndex,
  resolveRepoRoot
} from '../../../features/projects/infrastructure/project-files.js';
import {
  buildRoleTemplateMapping,
  collectProjectArtifacts,
  getStageArtifactsFromProject,
  normalizeArtifactsForResponse,
  normalizeOutputToTypeId,
  parseJsonPayload,
  resolveProjectStageIds,
  resolveStageOutputsForProject
} from './helpers/workflow-helpers.js';
import { registerArtifactsRoutes } from './routes/workflow-artifacts-routes.js';
import { registerDeployRoutes } from './routes/workflow-deploy-routes.js';
import { registerExecutionRoutes } from './routes/workflow-execution-routes.js';
import { registerFilesRoutes } from './routes/workflow-files-routes.js';
import { buildFileTree } from '../application/workflow-file-tree.js';
import { runCommand } from '../application/workflow-command-runner.js';
import { executeStage } from '../application/workflow-stage-executor.js';
import { loadProject } from '../application/workflow-project-service.js';
import { buildZipBundle } from '../infrastructure/workflow-bundle-service.js';
import { listRunRecords } from '../infrastructure/workflow-artifact-run.repository.js';
import {
  getChunkSession,
  listChunkSessions
} from '../infrastructure/workflow-artifact-chunk.repository.js';

const router = express.Router();

registerExecutionRoutes(router, {
  executeStage,
  loadProject,
  normalizeStageId,
  resolveStageOutputsForProject,
  listRunRecords,
  listChunkSessions,
  getChunkSession
});

registerArtifactsRoutes(router, {
  fs,
  fsPromises,
  path,
  loadProject,
  buildFileTree,
  buildZipBundle,
  runCommand,
  projectRepository,
  ensureProjectWorkspace,
  deleteArtifactPhysicalFile,
  removeArtifactsIndex,
  resolveRepoRoot,
  normalizeStageId,
  resolveProjectStageIds,
  getStageArtifactsFromProject,
  normalizeArtifactsForResponse,
  collectProjectArtifacts
});

registerFilesRoutes(router, {
  fs,
  path,
  loadProject,
  ensureProjectWorkspace
});

registerDeployRoutes(router, {
  projectRepository,
  ARTIFACT_TYPES,
  callDeepSeekAPI,
  parseJsonPayload,
  buildRoleTemplateMapping,
  collectProjectArtifacts,
  normalizeOutputToTypeId
});

export default router;
