import type { RouteObject } from 'react-router-dom';

import type { ElegantRouterNamePathEntry, ElegantRouterOption } from '../core';

export interface ElegantReactRouterOption extends ElegantRouterOption {
  /**
   * the directory of the route const
   *
   * @default 'src/router/elegant/routes.ts'
   */
  constDir: string;
  /**
   * define custom routes, which's route only generate the route declaration
   *
   * the name path map of custom route or the names, if only provide the names, it will generate path by the route name
   *
   * @example
   *   ```ts
   *   const customRoutes = {
   *   map: {},
   *   names: ['custom_multi_first']
   *   }
   *   ```
   *   the route name "custom_multi_first" will generate the following route map
   *   ```ts
   *   const routeMap = {
   *   custom: '/custom',
   *   custom_multi: '/custom/multi',
   *   custom_multi_first: '/custom/multi/first',
   *   }
   *   ```
   *
   * @default
   * ```ts
   * const customRoutes = {
   *   map: {
   *     root: '/', // the root route
   *     notFound: '/:pathMatch(.*)*' // the 404 route
   *   },
   *   names: []
   * }
   * ```
   */
  customRoutes: {
    map?: Record<string, string>;
    names?: string[];
  };
  /**
   * the declaration file directory of the generated routes
   *
   * @default 'src/typings/elegant-router.d.ts'
   */
  dtsDir: string;
  /**
   * the directory of the imports of routes
   *
   * @default 'src/router/elegant/imports.ts'
   */
  importsDir: string;
  /**
   * whether the route is lazy import
   *
   * @default _name => false
   * @param layoutName the layout name
   */
  layoutLazyImport(layoutName: string): boolean;
  /**
   * whether the route is lazy import
   *
   * @example
   *   - the direct import
   *   ```ts
   *   import Home from './views/home/index.vue';
   *   ```
   *   - the lazy import
   *   ```ts
   *   const Home = import('./views/home/index.vue');
   *   ```
   *
   * @default _name => true
   * @param routeName route name
   */
  lazyImport(routeName: string): boolean;
  /**
   * the route meta generator
   *
   * @default
   * ```ts
   *  const onRouteMetaGen = (routeName: string) => ({
   *    title: routeName
   *  })
   * ```
   * @param routeName the route name
   */
  onRouteMetaGen(routeName: string): Record<string, unknown>;
  routeInfoByFile?: boolean;
  routeInfoFileName?: string;
  /**
   * the directory of the route map
   *
   * @default 'src/router/elegant/routeMap.ts'
   */
  routeMapDir: string;
  /**
   * the directory of the routes transform function
   *
   * Converts the route definitions of the generated conventions into routes for the vue-router.
   *
   * @default 'src/router/elegant/transform.ts'
   */
  transformDir: string;
}

export type CustomRouteConfig = {
  entries: ElegantRouterNamePathEntry[];
  firstLevelRoutes: string[];
  lastLevelRoutes: string[];
};

export type RouteMeta = Record<string | number, unknown>;

/** elegant const route */
export type ElegantConstRoute = Omit<RouteObject, 'children' | 'id' | 'path'> & {
  children?: ElegantConstRoute[];
  matchedFiles: (string | null)[];
  name: string;
  path?: string | null;
};

export type RouteConstExport = {
  generatedRoutes: ElegantConstRoute[];
};
