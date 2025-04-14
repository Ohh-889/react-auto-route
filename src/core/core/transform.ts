import path from 'node:path';

import {
  NOT_FOUND_ROUTE,
  PAGE_DEGREE_SPLITTER,
  PAGE_FILE_NAME_WITH_SQUARE_BRACKETS_PATTERN,
  PATH_SPLITTER,
  ROUTE_NAME_WITH_PARAMS_PATTERN
} from '../constants';
import { isRouteGroup } from '../shared/glob';
import type {
  ElegantRouterFile,
  ElegantRouterNamePathEntry,
  ElegantRouterNamePathMap,
  ElegantRouterOption,
  ElegantRouterTree
} from '../types';

import { getFullPathOfPageGlob } from './path';

/**
 * transform the page glob to the router file
 *
 * @param glob
 * @param options
 */
export function transformPageGlobToRouterFile(glob: string, options: ElegantRouterOption) {
  const { alias, cwd, pageDir, routeNameTransformer } = options;

  // 1. get path info
  const fullPath = getFullPathOfPageGlob(glob, pageDir, cwd);

  const importPath = path.posix.join(pageDir, glob);

  let importAliasPath = importPath;

  // 2. get route info
  const dirAndFile = glob.split(PATH_SPLITTER).reverse();

  const [file, ...dirs] = dirAndFile;

  const aliasEntries = Object.entries(alias);

  aliasEntries.some(item => {
    const [a, dir] = item;
    const match = importPath.startsWith(dir);

    if (match) {
      importAliasPath = importAliasPath.replace(dir, a);
    }
    return match;
  });

  const filteredDirs = dirs.filter(dir => !dir.startsWith(PAGE_DEGREE_SPLITTER)).reverse();

  if (PAGE_FILE_NAME_WITH_SQUARE_BRACKETS_PATTERN.test(file)) {
    filteredDirs.push(file.replace(/\.tsx$/, ''));
  }

  let routeName = routeNameTransformer(filteredDirs.join(PAGE_DEGREE_SPLITTER).toLocaleLowerCase());

  // 特殊处理根路径下的文件
  if (filteredDirs.length === 0) {
    routeName = 'root';
  }

  const routePath = transformRouterNameToPath(routeName);

  return {
    fullPath,
    glob,
    importAliasPath,
    importPath,
    routeName,
    routePath: options.routePathTransformer(routeName, routePath)
  } as ElegantRouterFile;
}

/**
 * transform the router files to the router maps (name -> path)
 *
 * @param files
 * @param options
 */
export function transformRouterFilesToMaps(files: ElegantRouterFile[], options: ElegantRouterOption) {
  const maps: ElegantRouterNamePathMap = new Map<string, string | null>();

  files.forEach(file => {
    const { routeName, routePath } = file;

    const names = splitRouterName(routeName);

    names.forEach(name => {
      if (!maps.has(name)) {
        const isSameName = name === routeName;

        const itemRouteName = isSameName ? name : options.routeNameTransformer(name);
        const itemRoutePath = isSameName
          ? routePath
          : options.routePathTransformer(itemRouteName, transformRouterNameToPath(name));

        maps.set(itemRouteName, itemRoutePath);
      }
    });
  });

  return maps;
}

/**
 * transform the router files to the router entries (name -> path)
 *
 * @param maps
 */
export function transformRouterMapsToEntries(maps: ElegantRouterNamePathMap) {
  const entries: ElegantRouterNamePathEntry[] = [];

  maps.forEach((routePath, routeName) => {
    entries.push([routeName, routePath]);
  });

  return entries.sort((a, b) => a[0].localeCompare(b[0]));
}

/**
 * transform the router entries to the router trees
 *
 * @param entries
 * @param options
 */
export function transformRouterEntriesToTrees(
  entries: ElegantRouterNamePathEntry[],
  maps: ElegantRouterNamePathMap,
  files: ElegantRouterFile[]
) {
  const treeWithClassify = new Map<string, string[][]>();

  entries.forEach(([routeName]) => {
    const isFirstLevel = !routeName.includes(PAGE_DEGREE_SPLITTER);

    if (isFirstLevel) {
      treeWithClassify.set(routeName, []);
    } else {
      const names = routeName.split(PAGE_DEGREE_SPLITTER);

      const firstLevelName = names[0];

      const levels = routeName.split(PAGE_DEGREE_SPLITTER).length;

      const currentLevelChildren = treeWithClassify.get(firstLevelName) || [];

      const child = currentLevelChildren[levels - 2] || [];

      child.push(routeName);

      currentLevelChildren[levels - 2] = child;

      treeWithClassify.set(firstLevelName, currentLevelChildren);
    }
  });

  const trees: ElegantRouterTree[] = [];

  treeWithClassify.forEach((children, key) => {
    const { fullPath, matchedResult } = findMatchedFiles(files, key);

    const firstLevelRoute: ElegantRouterTree = {
      fullPath,
      matchedFiles: matchedResult,
      routeName: key,
      routePath: maps.get(key) || null
    };

    const treeChildren = recursiveGetRouteTreeChildren(key, children, maps, files);

    if (treeChildren.length > 0) {
      firstLevelRoute.children = treeChildren;
    }

    trees.push(firstLevelRoute);
  });

  const rootIndex = trees.findIndex(tree => tree.routeName === 'root');

  if (rootIndex !== -1 && trees[rootIndex].matchedFiles[0]) {
    const rootNode = trees[rootIndex];

    // 创建一个新的数组，将 rootNode 的 children 设置为其他所有节点
    const newTrees = [
      {
        ...rootNode, // 保留 root 节点的原有属性
        children: trees.filter((_, index) => index !== rootIndex) // 将除了 root 以外的所有节点作为 children
      }
    ];

    const routes = newTrees[0].children;
    const notFoundPath = routes.find(item => item?.routeName === '404');

    if (notFoundPath) {
      NOT_FOUND_ROUTE.matchedFiles = notFoundPath.matchedFiles;
    }

    routes.push(NOT_FOUND_ROUTE);
    return newTrees;
  }

  const notFoundPath = trees.find(item => item?.routeName === '404');

  if (notFoundPath) {
    NOT_FOUND_ROUTE.matchedFiles = notFoundPath.matchedFiles;
  }

  trees.push(NOT_FOUND_ROUTE);

  return trees;
}

/**
 * recursive get the route tree children
 *
 * @param parentName
 * @param children
 * @param maps
 */
// eslint-disable-next-line max-params
function recursiveGetRouteTreeChildren(
  parentName: string,
  children: string[][],
  maps: ElegantRouterNamePathMap,
  files: ElegantRouterFile[]
) {
  if (children.length === 0) {
    return [];
  }

  const [current, ...rest] = children;

  const currentChildren = current.filter(name => name.startsWith(parentName) && name !== parentName);

  const trees = currentChildren.map(name => {
    const { fullPath, matchedResult } = findMatchedFiles(files, name);
    const tree: ElegantRouterTree = {
      fullPath,
      matchedFiles: matchedResult,
      routeName: name,
      routePath: maps.get(name) || null
    };

    const nextChildren = recursiveGetRouteTreeChildren(name, rest, maps, files);

    if (nextChildren.length > 0) {
      tree.children = nextChildren;
    }

    return tree;
  });

  return trees;
}

/**
 * split the router name
 *
 * @example
 *   a_b_c => ['a', 'a_b', 'a_b_c'];
 *
 * @param name
 */
export function splitRouterName(name: string) {
  const names = name.split(PAGE_DEGREE_SPLITTER);

  return names.reduce((prev, cur) => {
    const last = prev[prev.length - 1];

    const next = last ? `${last}${PAGE_DEGREE_SPLITTER}${cur}` : cur;

    prev.push(next);

    return prev;
  }, [] as string[]);
}

/**
 * transform the router name to the router path
 *
 * @example
 *   a_b_c => '/a/b/c';
 *
 * @param name
 */
export function transformRouterNameToPath(name: string) {
  if (name === 'root') return '/';

  if (isRouteGroup(name)) return null;

  // 依次执行一系列替换
  const cleanedName = name
    // 1. 去除路由组 (auth)、(xxx) 等 (可能带后缀下划线)
    .replaceAll(/\([^)]+\)_?/g, '')
    // 2. 将 [...param] 转换为 *
    .replaceAll(/\[\.{3}[^\]]+\]/g, '*')
    // 2. 将 [param] 转换为 :param
    .replaceAll(/\[([^\]]+)\]/g, ':$1')
    // 3. 如果需要将特定标识替换，可在此处继续添加
    .replaceAll(PAGE_DEGREE_SPLITTER, PATH_SPLITTER);

  // 最终在前面拼接 '/'
  return `/${cleanedName}`;
}

function findMatchedFiles(data: ElegantRouterFile[], currentName: string) {
  // 结果数组，四个值都为 null
  // 分别对应: 0->layout, 1->index, 2->loading, 3->error
  const matchedResult: (string | null)[] = [null, null, null, null];

  // findIndex 找到当前 name 对应的下标
  const startIndex = data.findIndex(item => item.routeName === currentName);

  if (startIndex === -1) {
    // 找不到就直接返回全是 null 的数组
    return { fullPath: null, matchedResult };
  }

  // 最多匹配 3 个之后的元素(含自己共 4 个)
  const endIndex = Math.min(startIndex + 4, data.length - 1);

  // 从 startIndex 开始往后遍历，直到 endIndex
  for (let i = startIndex; i <= endIndex; i += 1) {
    const { importPath, routeName } = data[i];

    // 如果后面的 name 跟当前 name 不一样，则立即停止匹配
    if (routeName !== currentName) {
      break;
    }

    const { glob } = data[i];

    // 如果 name 一直跟 currentName 一样，则根据文件结尾来判定要填哪一个
    if (glob.endsWith('layout.tsx')) {
      matchedResult[0] = routeName; // 把 layout 填入第一个位置
    } else if (glob.endsWith('index.tsx') || ROUTE_NAME_WITH_PARAMS_PATTERN.test(glob)) {
      if (!isRouteGroup(routeName)) {
        matchedResult[1] = `/${importPath}`; // 填入第二个位置
      }
    } else if (glob.endsWith('loading.tsx')) {
      matchedResult[2] = `/${importPath}`; // 填入第三个位置
    } else if (glob.endsWith('error.tsx')) {
      matchedResult[3] = routeName; // 填入第四个位置
    }
  }

  return { fullPath: data[startIndex].fullPath, matchedResult };
}
