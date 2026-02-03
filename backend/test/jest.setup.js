// Jest setup for backend tests
if (!process.env.SMS_PROVIDER) {
  process.env.SMS_PROVIDER = 'mock';
}

// Strip invalid localstorage CLI args that may be injected by environment
const flagIndex = process.argv.indexOf('--localstorage-file');
if (flagIndex !== -1) {
  process.argv.splice(flagIndex, 1);
  if (process.argv[flagIndex] && !process.argv[flagIndex].startsWith('--')) {
    process.argv.splice(flagIndex, 1);
  }
}

// Silence known noisy warning from localstorage flag
const originalEmitWarning = process.emitWarning;
process.emitWarning = (warning, ...args) => {
  const message = typeof warning === 'string' ? warning : warning?.message;
  if (message && message.includes('--localstorage-file')) {
    return;
  }
  return originalEmitWarning.call(process, warning, ...args);
};

// Filter expected auth error logs during tests to keep output clean
const originalConsoleError = console.error;
console.error = (...args) => {
  const message = String(args[0] || '');
  if (
    message.includes('[AuthUseCase] 注册失败') ||
    message.includes('[AuthUseCase] 刷新令牌失败')
  ) {
    return;
  }
  return originalConsoleError(...args);
};
