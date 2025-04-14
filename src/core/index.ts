import { PAGE_DEGREE_SPLITTER, PATH_SPLITTER } from './constants';
import ElegantRouter from './core';
import { splitRouterName, transformRouterNameToPath } from './core/transform';
import type {
  ElegantRouterFile,
  ElegantRouterNamePathEntry,
  ElegantRouterNamePathMap,
  ElegantRouterOption,
  ElegantRouterTree
} from './types';

export type {
  ElegantRouterFile,
  ElegantRouterNamePathEntry,
  ElegantRouterNamePathMap,
  ElegantRouterOption,
  ElegantRouterTree
};

export { PAGE_DEGREE_SPLITTER, PATH_SPLITTER, splitRouterName, transformRouterNameToPath };

export default ElegantRouter;
