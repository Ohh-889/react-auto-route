import { watch } from 'chokidar';

import { log } from './log';
import { normalizeWindowsPath } from './path';

// eslint-disable-next-line max-params
export function setupWatcher(
  watchDir: string,
  ignored: string[],
  callback: (action: 'add' | 'unlink', addPath: string) => Promise<void> | void,
  showLog = true
) {
  const watcher = watch('.', {
    cwd: watchDir,
    ignored,
    ignoreInitial: true
  });

  const stacks: string[] = [];

  function addStack(path: string) {
    stacks.push(path);
  }

  function clearStack() {
    stacks.length = 0;
  }

  let timeoutId: NodeJS.Timeout | null = null;

  function handleStack(action: 'add' | 'unlink', path: string, duration = 500) {
    if (timeoutId) return;

    timeoutId = setTimeout(async () => {
      log(`The ${path} file has been ${action}, regenerating the dts file and routes...`, 'info', showLog);
      await callback(action, path);

      clearStack();

      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    }, duration);
  }

  watcher.on('ready', () => {
    log('watcher ready', 'start', showLog);
  });
  watcher.on('add', path => {
    const normalPath = normalizeWindowsPath(path);
    addStack(normalPath);
    handleStack('add', normalPath);
  });
  watcher.on('unlink', path => {
    const normalPath = normalizeWindowsPath(path);
    addStack(normalPath);
    handleStack('unlink', normalPath);
  });

  return watcher;
}
