import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { loadFile } from 'magicast';
import { parse } from 'recast/parsers/typescript.js';

import type { ElegantRouterTree } from '../core';
import { isRouteGroup } from '../core/shared/glob';
import { formatCode } from '../shared/prettier';
import type { ElegantConstRoute, ElegantReactRouterOption, RouteConstExport } from '../types';

import { createPrefixCommentOfGenFile } from './comment';

export async function genConstFile(tree: ElegantRouterTree[], options: ElegantReactRouterOption) {
  const { constDir, cwd } = options;

  const routesFilePath = path.posix.join(cwd, constDir);

  const code = await getConstCode(tree, options);

  await writeFile(routesFilePath, code, 'utf8');
}

async function getConstCode(trees: ElegantRouterTree[], options: ElegantReactRouterOption) {
  const { constDir, cwd } = options;
  const routeFilePath = path.posix.join(cwd, constDir);

  const existFile = existsSync(routeFilePath);

  if (!existFile) {
    const code = await createEmptyRouteConst();
    await writeFile(routeFilePath, code, 'utf-8');
  }

  const md = await loadFile<RouteConstExport>(routeFilePath, { parser: { parse } });

  const autoRoutes = trees.map(item => transformRouteTreeToElegantConstRoute(item, options));

  const oldRoutes = JSON.parse(JSON.stringify(md.exports.generatedRoutes)) as ElegantConstRoute[];

  const oldRouteMap = getElegantConstRouteMap(oldRoutes);

  const updated = getUpdatedRouteConst(oldRouteMap, autoRoutes, options);

  const formattedCode = await formatCode(createEmptyRouteConst(JSON.stringify(updated)));

  const removedEmptyLineCode = formattedCode.replace(/,\n\n/g, `,\n`);

  return removedEmptyLineCode;
}

function getUpdatedRouteConst(
  oldConst: Map<string, ElegantConstRoute>,
  newConst: ElegantConstRoute[],
  options: ElegantReactRouterOption
) {
  const updated = newConst.map(item => {
    const oldRoute = oldConst.get(item.name);

    if (!oldRoute) {
      return item;
    }

    const { children, handle, path: routePath, ...rest } = item;

    const updatedRoute = { ...oldRoute, path: routePath };

    mergeObject(updatedRoute, rest);

    if (children?.length) {
      updatedRoute.children = getUpdatedRouteConst(oldConst, children, options);
    }

    if (!updatedRoute.handle && handle) {
      updatedRoute.handle = handle;
    }

    if (updatedRoute.handle && handle) {
      mergeObject(updatedRoute.handle, handle);
    }

    return updatedRoute;
  });

  return updated;
}

function mergeObject<T extends Record<string, unknown>>(target: T, source: T) {
  const keys = Object.keys(source) as (keyof T)[];

  keys.forEach(key => {
    if (!target[key]) {
      Object.assign(target, { [key]: source[key] });
    }
  });
}

function getElegantConstRouteMap(constRoutes: ElegantConstRoute[]) {
  const routeMap = new Map<string, ElegantConstRoute>();

  function recursiveGetElegantConstRoute(routes: ElegantConstRoute[]) {
    routes.forEach(item => {
      const { children, name } = item;

      routeMap.set(name, item);

      if (children?.length) {
        recursiveGetElegantConstRoute(children);
      }
    });
  }

  recursiveGetElegantConstRoute(constRoutes);

  return routeMap;
}

function createEmptyRouteConst(newCode: string = '[]') {
  const prefixComment = createPrefixCommentOfGenFile();

  const code = `${prefixComment}
//这里只能修改 handle 并且路由组作为布局路由组件 是不能有handle的

import type { ElegantConstRoute } from '@soybean-react/vite-plugin-react-router';

export const generatedRoutes: ElegantConstRoute[] = ${newCode};
`;

  return code;
}

/**
 * transform ElegantRouter route tree to ElegantConstRoute
 *
 * @param tree the ElegantRouter route tree
 * @param options the plugin options
 */
function transformRouteTreeToElegantConstRoute(tree: ElegantRouterTree, options: ElegantReactRouterOption) {
  const { onRouteMetaGen } = options;

  const { children = [], matchedFiles, routeName, routePath } = tree;

  const hasChildren = children.length > 0;

  const route: ElegantConstRoute = {
    matchedFiles,
    name: routeName,
    path: routePath
  };

  if (isRouteGroup(routeName)) {
    route.handle = null;
  } else {
    route.handle = onRouteMetaGen(routeName);
  }

  if (hasChildren) {
    route.children = children.map(item => recursiveGetElegantConstRouteByChildTree(item, options));
  }

  return route;
}

function recursiveGetElegantConstRouteByChildTree(
  childTree: ElegantRouterTree,
  options: ElegantReactRouterOption
): ElegantConstRoute {
  const { children = [], matchedFiles, routeName, routePath } = childTree;

  const { onRouteMetaGen } = options;

  const hasChildren = children.length > 0;

  const route: ElegantConstRoute = {
    matchedFiles,
    name: routeName,
    path: routePath
  };

  if (isRouteGroup(routeName)) {
    route.handle = null;
  } else {
    route.handle = onRouteMetaGen(routeName);
  }

  if (hasChildren) {
    const routeChildren = children.map(item => recursiveGetElegantConstRouteByChildTree(item, options));

    route.children = routeChildren;
  }

  return route;
}
