import micromatch from 'micromatch';
import type { FSWatcher } from 'chokidar';
import type {
  ElegantRouterFile,
  ElegantRouterNamePathEntry,
  ElegantRouterNamePathMap,
  ElegantRouterOption,
  ElegantRouterTree
} from '../types';
import { getGlobs } from '../shared/glob';
import { createPluginOptions } from './options';
import { handleValidatePageGlob } from './validate';
import { getFullPathOfPageGlob } from './path';
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
    const { pagePatterns, pageExcludePatterns, pageDir } = this.options;

    const globs = getGlobs(pagePatterns, pageExcludePatterns, pageDir);

    this.pageGlobs = this.filterValidPageGlobs(globs);
  }

  /**
   * filter the valid page globs
   *
   * @param globs
   */
  filterValidPageGlobs(globs: string[], needMatch = false) {
    const { cwd, pageDir } = this.options;

    return globs.filter(glob => {
      const fullGlob = getFullPathOfPageGlob(glob, pageDir, cwd);

      const isValid = handleValidatePageGlob(glob, fullGlob);

      const isMatch = !needMatch || this.isMatchPageGlob(glob);

      return isValid && isMatch;
    });
  }

  /**
   * whether the glob is match page glob
   *
   * @param glob
   */
  isMatchPageGlob(glob: string) {
    const { pagePatterns, pageExcludePatterns } = this.options;

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
    this.trees = transformRouterEntriesToTrees(this.entries, this.maps);
  }

  /**
   * setup the FS watcher
   *
   * @param afterChange after change callback
   * @param beforeChange before change callback
   */
  setupFSWatcher(afterChange: () => void, beforeChange?: () => void) {
    const { pageDir, pageExcludePatterns } = this.options;
    this.fsWatcher = setupWatcher(
      pageDir,
      pageExcludePatterns,
      globs => {
        const updateGlobs = this.filterValidPageGlobs(globs, true);
        const needUpdate = updateGlobs.length > 0;
        if (needUpdate) {
          beforeChange?.();
          this.scanPages();
          afterChange();
        }
      },
      this.options.log
    );
  }

  /** stop the FS watcher */
  stopFSWatcher() {
    this.fsWatcher?.close();
  }
}
