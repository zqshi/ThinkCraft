import fsPromises from 'fs/promises';
import path from 'path';
import { shouldSkipTreeEntry } from '../interfaces/helpers/workflow-helpers.js';

export async function buildFileTree(rootDir, currentDir, depth, maxDepth) {
  const entries = await fsPromises.readdir(currentDir, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    if (shouldSkipTreeEntry(entry.name)) {
      continue;
    }
    const fullPath = path.join(currentDir, entry.name);
    const relativePath = path.relative(rootDir, fullPath);
    if (entry.isDirectory()) {
      const children =
        depth < maxDepth ? await buildFileTree(rootDir, fullPath, depth + 1, maxDepth) : [];
      result.push({
        name: entry.name,
        type: 'directory',
        path: relativePath,
        children
      });
    } else {
      let size = 0;
      try {
        const stat = await fsPromises.stat(fullPath);
        size = stat.size;
      } catch (error) {
        size = 0;
      }
      result.push({
        name: entry.name,
        type: 'file',
        path: relativePath,
        size
      });
    }
  }
  return result;
}
