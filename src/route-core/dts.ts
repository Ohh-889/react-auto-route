import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { PAGE_DEGREE_SPLITTER } from '../core';
import type { ElegantRouterFile, ElegantRouterNamePathEntry } from '../core';
import { ensureFile } from '../shared/fs';
import type { CustomRouteConfig, ElegantReactRouterOption } from '../types';

import { createPrefixCommentOfGenFile } from './comment';
import { getCustomRouteConfig } from './shared';

export async function genDtsFile(
  files: ElegantRouterFile[],
  entries: ElegantRouterNamePathEntry[],
  options: ElegantReactRouterOption
) {
  if (files.length === 0) return;

  const customEntries = getCustomRouteConfig(options, entries);

  const code = getDtsCode(files, entries, customEntries);

  const dtsPath = path.posix.join(options.cwd, options.dtsDir);

  try {
    await ensureFile(dtsPath);
  } catch {}

  await writeFile(dtsPath, code);
}

function getDtsCode(files: ElegantRouterFile[], entries: ElegantRouterNamePathEntry[], customRoute: CustomRouteConfig) {
  const {
    entries: customEntries,
    firstLevelRoutes: customFirstLevelRoutes,
    lastLevelRoutes: customLastLevelRoutes
  } = customRoute;

  const allEntries = [...customEntries, ...entries];

  const firstLevelRoutes = entries
    .filter(([name]) => name.split(PAGE_DEGREE_SPLITTER).length === 1)
    .map(([name]) => name);

  const prefixComment = createPrefixCommentOfGenFile();

  let code = `${prefixComment}
import '@soybean-react/vite-plugin-react-router';

declare module "@soybean-react/vite-plugin-react-router" {

  /**
   * route map
   */
  export type RouteMap = {`;
  allEntries.forEach(([routeName, routePath]) => {
    if (routePath) {
      code += `\n    "${routeName}": "${routePath}";`;
    }
  });

  code += `
  };

  /**
   * route key
   */
  export type RouteKey = keyof RouteMap;

  /**
   * route path
   */
  export type RoutePath = RouteMap[RouteKey];

  /**
   * custom route key
   */
  export type CustomRouteKey = Extract<
    RouteKey,`;

  customEntries.forEach(([routeName]) => {
    code += `\n    | "${routeName}"`;
  });

  code += `
  >;

  /**
   * the generated route key
   */
  export type GeneratedRouteKey = Exclude<RouteKey, CustomRouteKey>;

  /**
   * the first level route key, which contain the layout of the route
   */
  export type FirstLevelRouteKey = Extract<
    RouteKey,`;

  firstLevelRoutes.forEach(routeName => {
    code += `\n    | "${routeName}"`;
  });

  code += `
  >;

  /**
   * the custom first level route key
   */
  export type CustomFirstLevelRouteKey = Extract<
    CustomRouteKey,`;

  customFirstLevelRoutes.forEach(routeName => {
    code += `\n    | "${routeName}"`;
  });

  code += `
  >;

  /**
   * the last level route key, which has the page file
   */
  export type LastLevelRouteKey = Extract<
    RouteKey,`;

  files.forEach(file => {
    code += `\n    | "${file.routeName}"`;
  });

  code += `
  >;

  /**
   * the custom last level route key
   */
  export type CustomLastLevelRouteKey = Extract<
    CustomRouteKey,`;

  customLastLevelRoutes.forEach(routeName => {
    code += `\n    | "${routeName}"`;
  });

  code += `
  >;
}
`;

  return code;
}
