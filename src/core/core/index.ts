import type { FSWatcher } from 'chokidar';
import micromatch from 'micromatch';

import { getGlobs } from '../shared/glob';
import type {
  ElegantRouterFile,
  ElegantRouterNamePathEntry,
  ElegantRouterNamePathMap,
  ElegantRouterOption,
  ElegantRouterTree
} from '../types';

import { createPluginOptions } from './options';
import {
  transformPageGlobToRouterFile,
  transformRouterEntriesToTrees,
  transformRouterFilesToMaps,
  transformRouterMapsToEntries
} from './transform';
import { setupWatcher } from './watcher';

/** the class of the plugin */
export default class ElegantRouter {
  /** the plugin options */
  options: ElegantRouterOption;

  /** the page globs */
  pageGlobs: string[] = [];

  /** the router files */
  files: ElegantRouterFile[] = [];

  /** the router name path maps */
  maps: ElegantRouterNamePathMap = new Map<string, string>();

  /** the router name path entries */
  entries: ElegantRouterNamePathEntry[] = [];

  /** the router trees */
  trees: ElegantRouterTree[] = [];

  /** the FS watcher */
  fsWatcher?: FSWatcher;

  constructor(options: Partial<ElegantRouterOption> = {}) {
    this.options = createPluginOptions(options);
    this.scanPages();
  }

  /** scan the pages */
  scanPages() {
    this.getPageGlobs();
    this.getRouterContextProps();
  }

  /** get the valid page globs */
  getPageGlobs() {
    const { pageDir, pageExcludePatterns, pagePatterns } = this.options;

    this.pageGlobs = getGlobs(pagePatterns, pageExcludePatterns, pageDir);
  }

  /**
   * whether the glob is match page glob
   *
   * @param glob
   */
  isMatchPageGlob(glob: string) {
    const { pageExcludePatterns, pagePatterns } = this.options;

    return micromatch.isMatch(glob, pagePatterns, { ignore: pageExcludePatterns });
  }

  /**
   * get route file by glob
   *
   * @param glob
   */
  getRouterFileByGlob(glob: string) {
    return transformPageGlobToRouterFile(glob, this.options);
  }

  /** get the router context props */
  getRouterContextProps() {
    this.files = this.pageGlobs.map(glob => transformPageGlobToRouterFile(glob, this.options));

    this.maps = transformRouterFilesToMaps(this.files, this.options);

    this.entries = transformRouterMapsToEntries(this.maps);

    this.trees = transformRouterEntriesToTrees(this.entries, this.maps, this.files);
  }

  /**
   * setup the FS watcher
   *
   * @param afterChange after change callback
   * @param beforeChange before change callback
   */
  setupFSWatcher(afterChange: (action: 'add' | 'unlink', path: string) => void, beforeChange?: () => void) {
    const { pageDir, pageExcludePatterns } = this.options;
    this.fsWatcher = setupWatcher(
      pageDir,
      pageExcludePatterns,
      (action, path) => {
        beforeChange?.();
        this.scanPages();
        afterChange(action, path);
      },
      this.options.log
    );
  }

  /** stop the FS watcher */
  stopFSWatcher() {
    this.fsWatcher?.close();
  }
}
