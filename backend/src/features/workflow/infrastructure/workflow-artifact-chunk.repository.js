import crypto from 'crypto';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { ensureProjectWorkspace } from '../../projects/infrastructure/project-files.js';

function hashText(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

async function resolveIndexFile(project) {
  const workspace = await ensureProjectWorkspace(project);
  return {
    artifactRoot: workspace.artifactRoot,
    indexFile: path.join(workspace.projectRoot, 'meta', 'artifact-chunks.json')
  };
}

async function readIndex(project, projectId) {
  const { artifactRoot, indexFile } = await resolveIndexFile(project);
  if (!fs.existsSync(indexFile)) {
    return {
      projectId,
      artifactRoot,
      updatedAt: new Date().toISOString(),
      sessions: []
    };
  }
  try {
    const raw = await fsPromises.readFile(indexFile, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      projectId,
      artifactRoot,
      updatedAt: new Date().toISOString(),
      sessions: Array.isArray(parsed?.sessions) ? parsed.sessions : []
    };
  } catch (_error) {
    return {
      projectId,
      artifactRoot,
      updatedAt: new Date().toISOString(),
      sessions: []
    };
  }
}

async function writeIndex(project, index) {
  const { indexFile } = await resolveIndexFile(project);
  const payload = {
    ...index,
    updatedAt: new Date().toISOString()
  };
  await fsPromises.mkdir(path.dirname(indexFile), { recursive: true });
  await fsPromises.writeFile(indexFile, JSON.stringify(payload, null, 2), 'utf-8');
}

function upsertSession(index, seed) {
  const sessions = Array.isArray(index.sessions) ? index.sessions : [];
  const existingIndex = sessions.findIndex(item => item?.runId === seed.runId);
  if (existingIndex === -1) {
    const created = {
      runId: seed.runId,
      projectId: seed.projectId,
      stageId: seed.stageId,
      artifactType: seed.artifactType,
      status: seed.status || 'queued',
      totalRounds: Number(seed.totalRounds || 0),
      completedRounds: Number(seed.completedRounds || 0),
      chunks: [],
      assembled: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      error: null
    };
    sessions.push(created);
    index.sessions = sessions;
    return created;
  }
  const existing = sessions[existingIndex];
  const merged = {
    ...existing,
    ...seed,
    chunks: Array.isArray(existing?.chunks) ? existing.chunks : [],
    updatedAt: new Date().toISOString()
  };
  sessions[existingIndex] = merged;
  index.sessions = sessions;
  return merged;
}

function sanitizeSession(session, includeChunkContent = true) {
  if (!session || typeof session !== 'object') {
    return null;
  }
  const chunks = Array.isArray(session.chunks) ? session.chunks : [];
  return {
    ...session,
    chunks: includeChunkContent
      ? chunks
      : chunks.map(item => {
          const { content, ...rest } = item || {};
          return rest;
        })
  };
}

export async function ensureChunkSession({
  project,
  projectId,
  runId,
  stageId,
  artifactType,
  totalRounds = 0,
  status = 'queued'
}) {
  const index = await readIndex(project, projectId);
  const session = upsertSession(index, {
    runId,
    projectId,
    stageId,
    artifactType,
    totalRounds,
    status
  });
  await writeIndex(project, index);
  return session;
}

export async function appendChunkRecord({
  project,
  projectId,
  runId,
  stageId,
  artifactType,
  round,
  content,
  finishReason = null,
  totalRounds = 0
}) {
  const index = await readIndex(project, projectId);
  const session = upsertSession(index, {
    runId,
    projectId,
    stageId,
    artifactType,
    status: 'running',
    totalRounds
  });
  const chunks = Array.isArray(session.chunks) ? session.chunks : [];
  const chunk = {
    round: Number(round || 0),
    content: String(content || ''),
    contentChars: String(content || '').length,
    contentHash: hashText(content || ''),
    finishReason: finishReason || null,
    createdAt: new Date().toISOString()
  };
  const existingIndex = chunks.findIndex(item => Number(item?.round || 0) === Number(chunk.round || 0));
  if (existingIndex >= 0) {
    chunks[existingIndex] = {
      ...chunks[existingIndex],
      ...chunk,
      updatedAt: new Date().toISOString()
    };
  } else {
    chunks.push(chunk);
  }
  chunks.sort((a, b) => Number(a?.round || 0) - Number(b?.round || 0));
  session.chunks = chunks;
  session.completedRounds = chunks.length;
  session.updatedAt = new Date().toISOString();
  session.error = null;
  await writeIndex(project, index);
  return session;
}

export async function markChunkSessionStatus({
  project,
  projectId,
  runId,
  status,
  error = null
}) {
  const index = await readIndex(project, projectId);
  const session = upsertSession(index, {
    runId,
    projectId
  });
  session.status = status;
  session.error = error;
  session.updatedAt = new Date().toISOString();
  if (status === 'succeeded' || status === 'failed') {
    session.completedAt = new Date().toISOString();
  }
  await writeIndex(project, index);
  return session;
}

export async function markChunkSessionAssembled({
  project,
  projectId,
  runId,
  content,
  artifact = null,
  isComplete = false
}) {
  const index = await readIndex(project, projectId);
  const session = upsertSession(index, {
    runId,
    projectId
  });
  session.assembled = {
    contentChars: String(content || '').length,
    contentHash: hashText(content || ''),
    isComplete: Boolean(isComplete),
    artifactId: artifact?.id || null,
    fileName: artifact?.fileName || null,
    relativePath: artifact?.relativePath || null,
    updatedAt: new Date().toISOString()
  };
  session.status = 'assembled';
  session.updatedAt = new Date().toISOString();
  await writeIndex(project, index);
  return session;
}

export async function getChunkSession({
  project,
  projectId,
  runId,
  includeChunkContent = true
}) {
  const index = await readIndex(project, projectId);
  const session = (index.sessions || []).find(item => item?.runId === runId) || null;
  return sanitizeSession(session, includeChunkContent);
}

export async function listChunkSessions({
  project,
  projectId,
  stageId = null,
  artifactType = null,
  limit = 50,
  includeChunkContent = false
}) {
  const index = await readIndex(project, projectId);
  const stageFilter = stageId ? String(stageId) : '';
  const artifactFilter = artifactType ? String(artifactType) : '';
  const sessions = (index.sessions || [])
    .filter(item => {
      if (stageFilter && String(item?.stageId || '') !== stageFilter) {
        return false;
      }
      if (artifactFilter && String(item?.artifactType || '') !== artifactFilter) {
        return false;
      }
      return true;
    })
    .sort((a, b) => new Date(b?.updatedAt || 0).getTime() - new Date(a?.updatedAt || 0).getTime())
    .slice(0, Math.max(1, Math.min(200, Number(limit) || 50)));
  return sessions.map(session => sanitizeSession(session, includeChunkContent));
}

export function assembleContentFromSession(session) {
  const chunks = Array.isArray(session?.chunks) ? session.chunks : [];
  if (chunks.length === 0) {
    return '';
  }
  return chunks
    .sort((a, b) => Number(a?.round || 0) - Number(b?.round || 0))
    .map(item => String(item?.content || ''))
    .join('');
}
