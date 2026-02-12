import fsPromises from 'fs/promises';
import path from 'path';
import { runCommand } from '../application/workflow-command-runner.js';

export async function buildZipBundle(projectRoot, bundlePath) {
  const metaDir = path.join(projectRoot, 'meta');
  await fsPromises.mkdir(metaDir, { recursive: true });
  const scriptPath = path.join(metaDir, 'zip_bundle.py');
  const script = [
    'import os, zipfile',
    'root = os.path.abspath(os.path.dirname(__file__))',
    'project = os.path.abspath(os.path.join(root, \'..\'))',
    `bundle = os.path.abspath(r'''${bundlePath}''')`,
    'excludes = set([\'node_modules\', \'.git\', \'dist\', \'build\', \'.DS_Store\'])',
    'def should_skip(path_parts):',
    '    return any(part in excludes for part in path_parts)',
    'with zipfile.ZipFile(bundle, \'w\', zipfile.ZIP_DEFLATED) as zf:',
    '    for current_root, dirs, files in os.walk(project):',
    '        rel_dir = os.path.relpath(current_root, project)',
    '        if rel_dir == \'.\':',
    '            rel_dir = ""',
    '        parts = [p for p in rel_dir.split(os.sep) if p]',
    '        if should_skip(parts):',
    '            continue',
    '        dirs[:] = [d for d in dirs if d not in excludes]',
    '        for fname in files:',
    '            if fname in excludes:',
    '                continue',
    '            rel_path = os.path.normpath(os.path.join(rel_dir, fname))',
    '            if rel_path.startswith(\'meta\' + os.sep):',
    '                pass',
    '            full_path = os.path.join(current_root, fname)',
    '            if should_skip(full_path.split(os.sep)):',
    '                continue',
    '            zf.write(full_path, rel_path)',
    'print(bundle)'
  ].join('\\n');

  await fsPromises.writeFile(scriptPath, script, 'utf-8');
  const result = await runCommand(`python3 "${scriptPath}"`, {
    cwd: projectRoot,
    timeoutMs: 10 * 60 * 1000
  });
  if (!result.ok) {
    const output = [result.stdout, result.stderr].filter(Boolean).join('\\n');
    throw new Error(`zip 生成失败\\n${output}`);
  }
  return bundlePath;
}
