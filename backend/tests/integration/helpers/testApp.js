let appPromise = null;

export async function loadApp() {
  if (!appPromise) {
    appPromise = import('../../../server.js').then((mod) => mod.app);
  }
  return appPromise;
}

export function resetApp() {
  appPromise = null;
}
