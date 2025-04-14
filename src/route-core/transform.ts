import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import dedent from 'dedent';

import { ensureFile } from '../shared/fs';
import type { ElegantReactRouterOption } from '../types';

import { createPrefixCommentOfGenFile } from './comment';

/**
 * generate the transform file
 *
 * @param options
 */
export async function genTransformFile(options: ElegantReactRouterOption) {
  const transformPath = path.posix.join(options.cwd, options.transformDir);
  if (existsSync(transformPath)) return;
  const code = getTransformCode(options);

  await ensureFile(transformPath);

  await writeFile(transformPath, code);
}

function getTransformCode(options: ElegantReactRouterOption) {
  const prefixComment = createPrefixCommentOfGenFile();

  const code = dedent`${prefixComment}

import type { ElegantConstRoute } from '@soybean-react/vite-plugin-react-router';
import type { RouteObject } from 'react-router-dom';

import { errors, layouts, pages as views } from './imports';

const loadings = import.meta.glob(\`/${options.pageDir}/**/loading.tsx\`, { eager: true, import: 'default' });

/**
 * transform elegant const routes to react routes
 *
 * @param routes elegant const routes
 * @param layouts layout components
 * @param views view components
 */
export function transformElegantRoutesToReactRoutes(routes: ElegantConstRoute[]) {
  return routes.flatMap(route => transformElegantRouteToReactRoute(route));
}

/**
 * transform elegant route to react route
 *
 * @param route elegant const route
 * @param layouts layout components
 * @param views view components
 */
export function transformElegantRouteToReactRoute(route: ElegantConstRoute): RouteObject {
  const ROUTE_DEGREE_SPLITTER = '_';

  function isRouteGroup(name: string) {
    const lastName = name.split(ROUTE_DEGREE_SPLITTER).at(-1);
    return lastName?.startsWith('(') && lastName?.endsWith(')');
  }

  const { children, matchedFiles, name, path, handle } = route;

  // Get the error boundary component
  const getErrorComponent = () => (matchedFiles[3] ? errors[matchedFiles[3]]() : errors.root());

  // Convert route config, simplifying the logic for actions, loader, etc.
  function convertConfig(m: any) {
    const { action, loader, shouldRevalidate, default: Component } = m;
    return {
      action, // always use action
      loader, // always use loader
      shouldRevalidate,
      Component
    };
  }

  // Get config for the route if available
  async function getConfig(index: boolean = false) {
    if (matchedFiles[0] && !index) {
      const config = await layouts[matchedFiles[0]]();
      return convertConfig(config);
    }

    let pageName = name;

    if (pageName==='notFound') {
          pageName = '404'
    };

    if (matchedFiles[1] && (!children?.length||index)) {
      const config = await views[pageName]();

      return convertConfig(config);
    }

    return null;
  }

  function getHandle(index: boolean = false) {
    if ((matchedFiles[0]||isRouteGroup(name))&&!index) {
      return null
    }

    return handle
  }



  const reactRoute = {
    children: [],
    HydrateFallback: matchedFiles[2] ? loadings[matchedFiles[2]] : loadings[\`/${options.pageDir}/loading.tsx\`] ,
    id: name,
    handle: getHandle(),
    lazy: async () => {
      const ErrorBoundary = await getErrorComponent();

      return {
        ErrorBoundary: ErrorBoundary?.default,
        ...(await getConfig())
      };
    },
    path
  } as RouteObject;

  if (children?.length) {
    reactRoute.children = children.flatMap(child => transformElegantRouteToReactRoute(child));

    if (matchedFiles[1] && !isRouteGroup(name)) {
      reactRoute.children.unshift({
        handle: getHandle(true),
        index: true,
        lazy: async () => {
          const ErrorBoundary = await getErrorComponent();

          return {
            ErrorBoundary: ErrorBoundary?.default,
            ...(await getConfig(true))
          };
        }
      });
    }
  }

  return reactRoute;
}
`;

  return code;
}
