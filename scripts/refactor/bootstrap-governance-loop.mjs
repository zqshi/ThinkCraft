#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const workspace = process.cwd();
const maxLines = Number(process.env.MAX_FILE_LINES || 300);
const includeExt = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.py']);
const ignoreDirNames = new Set([
  '.git',
  'node_modules',
  'dist',
  'coverage',
  '.next',
  '.cache',
  'venv',
  '.venv'
]);
const ignorePathParts = ['backend/services/deep-research/venv'];

function shouldSkipDir(dirPath) {
  const rel = path.relative(workspace, dirPath).replace(/\\/g, '/');
  if (!rel || rel === '.') return false;
  if (ignorePathParts.some(part => rel.includes(part))) return true;
  return rel.split('/').some(part => ignoreDirNames.has(part));
}

function walk(dir, out) {
  if (shouldSkipDir(dir)) return;
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(abs, out);
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name);
    if (!includeExt.has(ext)) continue;
    out.push(abs);
  }
}

function countLines(file) {
  try {
    return fs.readFileSync(file, 'utf8').split('\n').length;
  } catch {
    return 0;
  }
}

function checkJsSyntax(file) {
  const ext = path.extname(file);
  if (!['.js', '.mjs', '.cjs'].includes(ext)) return null;
  const result = spawnSync('node', ['--check', file], { encoding: 'utf8' });
  if (result.status === 0) return null;
  return {
    file: path.relative(workspace, file).replace(/\\/g, '/'),
    error: (result.stderr || result.stdout || '').trim().split('\n').slice(0, 4).join('\n')
  };
}

const allFiles = [];
walk(workspace, allFiles);

const oversized = [];
const syntaxErrors = [];

for (const file of allFiles) {
  const lines = countLines(file);
  if (lines > maxLines) {
    oversized.push({
      file: path.relative(workspace, file).replace(/\\/g, '/'),
      lines
    });
  }
  const syntaxError = checkJsSyntax(file);
  if (syntaxError) syntaxErrors.push(syntaxError);
}

oversized.sort((a, b) => b.lines - a.lines);

const timestamp = new Date().toISOString();
const report = {
  timestamp,
  maxLines,
  stats: {
    filesScanned: allFiles.length,
    oversizedCount: oversized.length,
    syntaxErrorCount: syntaxErrors.length
  },
  topOversized: oversized.slice(0, 50),
  syntaxErrors
};

const reportDir = path.join(workspace, 'reports', 'refactor-governance');
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, 'latest.json'), JSON.stringify(report, null, 2), 'utf8');

const mdLines = [
  '# Refactor Governance Report',
  '',
  `- Timestamp: ${timestamp}`,
  `- Max file lines: ${maxLines}`,
  `- Files scanned: ${report.stats.filesScanned}`,
  `- Oversized files: ${report.stats.oversizedCount}`,
  `- JS syntax errors: ${report.stats.syntaxErrorCount}`,
  '',
  '## Top Oversized Files',
  ''
];

if (report.topOversized.length === 0) {
  mdLines.push('- None');
} else {
  for (const row of report.topOversized) {
    mdLines.push(`- ${row.lines} ${row.file}`);
  }
}

mdLines.push('', '## Syntax Errors', '');
if (syntaxErrors.length === 0) {
  mdLines.push('- None');
} else {
  for (const row of syntaxErrors) {
    mdLines.push(`- ${row.file}`);
    mdLines.push('```text');
    mdLines.push(row.error);
    mdLines.push('```');
  }
}

fs.writeFileSync(path.join(reportDir, 'latest.md'), mdLines.join('\n'), 'utf8');

console.log(`files_scanned=${report.stats.filesScanned}`);
console.log(`oversized_files=${report.stats.oversizedCount}`);
console.log(`syntax_errors=${report.stats.syntaxErrorCount}`);
console.log(`report_json=reports/refactor-governance/latest.json`);
console.log(`report_md=reports/refactor-governance/latest.md`);

process.exit(syntaxErrors.length > 0 ? 2 : 0);
