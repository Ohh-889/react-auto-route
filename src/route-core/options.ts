import type { ElegantRouterOption } from '../core';
import type { ElegantReactRouterOption } from '../types';

/**
 * create the plugin options
 *
 * @param options the plugin options
 */
export function createPluginOptions(erOptions: ElegantRouterOption, options?: Partial<ElegantReactRouterOption>) {
  const DTS_DIR = 'src/types/elegant-router.d.ts';
  const IMPORT_DIR = 'src/router/elegant/imports.ts';
  const CONST_DIR = 'src/router/elegant/routes.ts';
  const ROUTE_MAP_DIR = 'src/router/elegant/routeMap.ts';
  const TRANSFORM_DIR = 'src/router/elegant/transform.ts';
  const CUSTOM_ROUTES_MAP: Record<string, string> = {
    'not-found': '*',
    root: '/'
  };

  const opts: ElegantReactRouterOption = {
    constDir: CONST_DIR,
    customRoutes: {
      map: {},
      names: []
    },
    dtsDir: DTS_DIR,
    importsDir: IMPORT_DIR,
    layoutLazyImport: _name => true,
    lazyImport: _name => true,
    onRouteMetaGen: name => ({
      title: name
    }),
    routeMapDir: ROUTE_MAP_DIR,
    transformDir: TRANSFORM_DIR,
    ...erOptions,
    ...options
  };

  opts.customRoutes.map = {
    ...CUSTOM_ROUTES_MAP,
    ...opts.customRoutes.map
  };

  return opts;
}
