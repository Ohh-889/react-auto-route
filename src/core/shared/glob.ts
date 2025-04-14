import fg from 'fast-glob';

import { PAGE_DEGREE_SPLITTER } from '../constants';

/**
 * get globs
 *
 * @param patterns the glob patterns
 * @param exclude the glob exclude patterns
 * @param matchDir the glob match directory
 */
export function getGlobs(patterns: string[], exclude: string[], matchDir: string) {
  const { sync } = fg;

  const globs = sync(patterns, {
    cwd: matchDir,
    ignore: exclude,
    onlyFiles: true
  });

  return globs.sort();
}

export function isRouteGroup(name: string) {
  const lastName = name.split(PAGE_DEGREE_SPLITTER).at(-1);

  return lastName?.startsWith('(') && lastName?.endsWith(')');
}
