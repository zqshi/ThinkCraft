import { spawn } from 'child_process';
import { trimLog } from '../interfaces/helpers/workflow-helpers.js';

export async function runCommand(command, options = {}) {
  const { cwd, env, timeoutMs = 20 * 60 * 1000, maxLogChars = 20000 } = options;
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const child = spawn(command, {
      cwd,
      env: { ...process.env, ...(env || {}) },
      shell: true
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      const durationMs = Date.now() - start;
      resolve({
        ok: false,
        code: null,
        signal: 'SIGKILL',
        stdout: trimLog(stdout, maxLogChars),
        stderr: trimLog(stderr, maxLogChars),
        durationMs
      });
    }, timeoutMs);

    child.stdout?.on('data', chunk => {
      stdout += chunk.toString();
      if (stdout.length > maxLogChars) {
        stdout = trimLog(stdout, maxLogChars);
      }
    });
    child.stderr?.on('data', chunk => {
      stderr += chunk.toString();
      if (stderr.length > maxLogChars) {
        stderr = trimLog(stderr, maxLogChars);
      }
    });
    child.on('error', error => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', code => {
      clearTimeout(timer);
      const durationMs = Date.now() - start;
      resolve({
        ok: code === 0,
        code,
        signal: null,
        stdout: trimLog(stdout, maxLogChars),
        stderr: trimLog(stderr, maxLogChars),
        durationMs
      });
    });
  });
}
