import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import dedent from 'dedent';

import type { ElegantRouterFile, ElegantRouterNamePathEntry } from '@/core';

import { ensureFile } from '../shared/fs';
import type { ElegantReactRouterOption } from '../types';

import { createPrefixCommentOfGenFile } from './comment';
import { getCustomRouteConfig } from './shared';

export async function genRouteMapFile(
  files: ElegantRouterFile[],
  options: ElegantReactRouterOption,
  entries: ElegantRouterNamePathEntry[]
) {
  if (files.length === 0) return;

  const importsPath = path.posix.join(options.cwd, options.routeMapDir);

  await ensureFile(importsPath);

  const code = getRouteMapCode(options, entries);

  await writeFile(importsPath, code, 'utf8');
}

function getRouteMapCode(options: ElegantReactRouterOption, entries: ElegantRouterNamePathEntry[]) {
  const prefixComment = createPrefixCommentOfGenFile();

  const { entries: customEntries } = getCustomRouteConfig(options, entries);

  const allEntries = [...customEntries, ...entries];

  const code = dedent`${prefixComment}

import type { RouteKey, RouteMap, RoutePath } from '@soybean-react/vite-plugin-react-router';

/**
 * map of route name and route path
 */
export const routeMap: RouteMap = {
  ${allEntries
    .filter(([_, routePath]) => routePath)
    .map(([routeName, routePath]) => `"${routeName}": "${routePath}"`)
    .join(',\n  ')}
};

/**
 * get route path by route name
 *
 * @param name route name
 */
export function getRoutePath<T extends RouteKey>(name: T) {
  return routeMap[name];
}

/**
 * get route name by route path
 *
 * @param path route path
 */
export function getRouteName(path: RoutePath) {
  const routeEntries = Object.entries(routeMap) as [RouteKey, RoutePath][];

  const routeName: RouteKey | null = routeEntries.find(([, routePath]) => routePath === path)?.[0] || null;

  return routeName;
}
  `;

  return code;
}
