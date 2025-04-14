// eslint-disable-next-line import/no-duplicates
import type * as babelCore from '@babel/core';
// eslint-disable-next-line import/no-duplicates
import type { ParserOptions, TransformOptions } from '@babel/core';
import { createFilter } from 'vite';
import type { BuildOptions, Plugin, PluginOption, ResolvedConfig, UserConfig } from 'vite';

import type {
  ElegantRouterFile,
  ElegantRouterNamePathEntry,
  ElegantRouterNamePathMap,
  ElegantRouterOption,
  ElegantRouterTree
} from './core';
import {
  addClassComponentRefreshWrapper,
  addRefreshWrapper,
  preambleCode,
  runtimeCode,
  runtimePublicPath
} from './refresh/fast-refresh';
import ElegantReactRouter from './route-core';
import type { ElegantConstRoute, ElegantReactRouterOption, RouteMeta } from './types';

// lazy load babel since it's not used during build if plugins are not used
let babel: typeof babelCore | undefined;
async function loadBabel() {
  if (!babel) {
    babel = await import('@babel/core');
  }
  return babel;
}

export interface Options {
  /** Babel configuration applied in both dev and prod. */
  babel?: BabelOptions | ((id: string, options: { ssr?: boolean }) => BabelOptions);
  exclude?: string | RegExp | Array<string | RegExp>;
  include?: string | RegExp | Array<string | RegExp>;
  /**
   * Control where the JSX factory is imported from. https://esbuild.github.io/api/#jsx-import-source
   *
   * @default 'react'
   */
  jsxImportSource?: string;
  /**
   * Note: Skipping React import with classic runtime is not supported from v4
   *
   * @default 'automatic'
   */
  jsxRuntime?: 'automatic' | 'classic';
}

export type BabelOptions = Omit<
  TransformOptions,
  'ast' | 'filename' | 'inputSourceMap' | 'root' | 'sourceFileName' | 'sourceMaps'
>;

/** The object type used by the `options` passed to plugins with an `api.reactBabel` method. */
export interface ReactBabelOptions extends BabelOptions {
  overrides: Extract<BabelOptions['overrides'], any[]>;
  parserOpts: ParserOptions & {
    plugins: Extract<ParserOptions['plugins'], any[]>;
  };
  plugins: Extract<BabelOptions['plugins'], any[]>;
  presets: Extract<BabelOptions['presets'], any[]>;
}

type ReactBabelHook = (babelConfig: ReactBabelOptions, context: ReactBabelHookContext, config: ResolvedConfig) => void;

type ReactBabelHookContext = { id: string; ssr: boolean };

export type ViteReactPluginApi = {
  /** Manipulate the Babel options of `@vitejs/plugin-react` */
  reactBabel?: ReactBabelHook;
};

const reactCompRE = /extends\s+(?:React\.)?(?:Pure)?Component/;
const refreshContentRE = /\$Refresh(?:Reg|Sig)\$\(/;
const defaultIncludeRE = /\.[tj]sx?$/;
const tsRE = /\.tsx?$/;

export type {
  ElegantConstRoute,
  ElegantReactRouterOption,
  ElegantRouterFile,
  ElegantRouterNamePathEntry,
  ElegantRouterNamePathMap,
  ElegantRouterOption,
  ElegantRouterTree,
  RouteMeta
};

viteReact.preambleCode = preambleCode;

const silenceUseClientWarning = (userConfig: UserConfig): BuildOptions => ({
  rollupOptions: {
    onwarn(warning, defaultHandler) {
      if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && warning.message.includes('use client')) {
        return;
      }
      // https://github.com/vitejs/vite/issues/15012
      if (
        warning.code === 'SOURCEMAP_ERROR' &&
        warning.message.includes('resolve original location') &&
        warning.pos === 0
      ) {
        return;
      }
      if (userConfig.build?.rollupOptions?.onwarn) {
        userConfig.build.rollupOptions.onwarn(warning, defaultHandler);
      } else {
        defaultHandler(warning);
      }
    }
  }
});

const loadedPlugin = new Map<string, any>();
function loadPlugin(path: string): any {
  const cached = loadedPlugin.get(path);
  if (cached) return cached;

  const promise = import(path).then(module => {
    const value = module.default || module;
    loadedPlugin.set(path, value);
    return value;
  });
  loadedPlugin.set(path, promise);
  return promise;
}

function createBabelOptions(rawOptions?: BabelOptions) {
  const babelOptions = {
    babelrc: false,
    configFile: false,
    ...rawOptions
  } as ReactBabelOptions;

  babelOptions.plugins ||= [];
  babelOptions.presets ||= [];
  babelOptions.overrides ||= [];
  babelOptions.parserOpts ||= {} as any;
  babelOptions.parserOpts.plugins ||= [];

  return babelOptions;
}

function defined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

function getReactCompilerPlugin(plugins: ReactBabelOptions['plugins']) {
  return plugins.find(
    p => p === 'babel-plugin-react-compiler' || (Array.isArray(p) && p[0] === 'babel-plugin-react-compiler')
  );
}

type ReactCompilerRuntimeModule =
  | 'react/compiler-runtime' // from react namespace
  | 'react-compiler-runtime'; // npm package
function getReactCompilerRuntimeModule(plugin: babelCore.PluginItem): ReactCompilerRuntimeModule {
  let moduleName: ReactCompilerRuntimeModule = 'react/compiler-runtime';
  if (Array.isArray(plugin)) {
    if (plugin[1]?.target === '17' || plugin[1]?.target === '18') {
      moduleName = 'react-compiler-runtime';
    } else if (typeof plugin[1]?.runtimeModule === 'string') {
      // backward compatibility from (#374), can be removed in next major
      moduleName = plugin[1]?.runtimeModule;
    }
  }
  return moduleName;
}

export default function viteReact(opts: Options & Partial<ElegantReactRouterOption> = {}): PluginOption[] {
  // Provide default values for Rollup compat.
  let devBase = '/';
  const filter = createFilter(opts.include ?? defaultIncludeRE, opts.exclude);
  const jsxImportSource = opts.jsxImportSource ?? 'react';
  const jsxImportRuntime = `${jsxImportSource}/jsx-runtime`;
  const jsxImportDevRuntime = `${jsxImportSource}/jsx-dev-runtime`;
  let isProduction = true;
  // eslint-disable-next-line n/prefer-global/process
  let projectRoot = process.cwd();
  let skipFastRefresh = false;
  let runPluginOverrides: ((options: ReactBabelOptions, context: ReactBabelHookContext) => void) | undefined;
  let staticBabelOptions: ReactBabelOptions | undefined;

  // Support patterns like:
  // - import * as React from 'react';
  // - import React from 'react';
  // - import React, {useEffect} from 'react';
  const importReactRE = /\bimport\s+(?:\*\s+as\s+)?React\b/;

  const ctx = new ElegantReactRouter(opts);

  const autoRoutePlugin: Plugin = {
    apply: 'serve',
    configResolved() {
      ctx.setupFSWatcher();
    },
    configureServer(server) {
      ctx.setViteServer(server);
    },
    enforce: 'pre',
    name: 'react-auto-route'
  };

  const viteBabel: Plugin = {
    config() {
      if (opts.jsxRuntime === 'classic') {
        return {
          esbuild: {
            jsx: 'transform'
          }
        };
      }
      return {
        esbuild: {
          jsx: 'automatic',
          jsxImportSource: opts.jsxImportSource
        },
        optimizeDeps: { esbuildOptions: { jsx: 'automatic' } }
      };
    },
    configResolved(config) {
      devBase = config.base;
      projectRoot = config.root;
      isProduction = config.isProduction;
      skipFastRefresh = isProduction || config.command === 'build' || config.server.hmr === false;

      if ('jsxPure' in opts) {
        config.logger.warnOnce(
          '[@vitejs/plugin-react] jsxPure was removed. You can configure esbuild.jsxSideEffects directly.'
        );
      }

      const hooks: ReactBabelHook[] = config.plugins.map(plugin => plugin.api?.reactBabel).filter(defined);

      if (hooks.length > 0) {
        runPluginOverrides = (babelOptions, context) => {
          hooks.forEach(hook => hook(babelOptions, context, config));
        };
      } else if (typeof opts.babel !== 'function') {
        // Because hooks and the callback option can mutate the Babel options
        // we only create static option in this case and re-create them
        // each time otherwise
        staticBabelOptions = createBabelOptions(opts.babel);
      }
    },
    enforce: 'pre',
    name: 'vite:react-babel',
    // eslint-disable-next-line complexity
    async transform(code, id, options) {
      if (id.includes('/node_modules/')) return;

      const [filepath] = id.split('?');
      if (!filter(filepath)) return;

      const ssr = options?.ssr === true;
      const babelOptions = (() => {
        if (staticBabelOptions) return staticBabelOptions;
        const newBabelOptions = createBabelOptions(
          typeof opts.babel === 'function' ? opts.babel(id, { ssr }) : opts.babel
        );
        runPluginOverrides?.(newBabelOptions, { id, ssr });
        return newBabelOptions;
      })();
      const plugins = [...babelOptions.plugins];

      const isJSX = filepath.endsWith('x');
      const useFastRefresh =
        !skipFastRefresh &&
        !ssr &&
        (isJSX ||
          (opts.jsxRuntime === 'classic'
            ? importReactRE.test(code)
            : code.includes(jsxImportDevRuntime) || code.includes(jsxImportRuntime)));
      if (useFastRefresh) {
        plugins.push([await loadPlugin('react-refresh/babel'), { skipEnvCheck: true }]);
      }

      if (opts.jsxRuntime === 'classic' && isJSX) {
        if (!isProduction) {
          // These development plugins are only needed for the classic runtime.
          plugins.push(
            await loadPlugin('@babel/plugin-transform-react-jsx-self'),
            await loadPlugin('@babel/plugin-transform-react-jsx-source')
          );
        }
      }

      // Avoid parsing if no special transformation is needed
      if (!plugins.length && !babelOptions.presets.length && !babelOptions.configFile && !babelOptions.babelrc) {
        return;
      }

      const parserPlugins = [...babelOptions.parserOpts.plugins];

      if (!filepath.endsWith('.ts')) {
        parserPlugins.push('jsx');
      }

      if (tsRE.test(filepath)) {
        parserPlugins.push('typescript');
      }

      const babel = await loadBabel();
      const result = await babel.transformAsync(code, {
        ...babelOptions,
        filename: id,
        generatorOpts: {
          ...babelOptions.generatorOpts,
          decoratorsBeforeExport: true,
          // import attributes parsing available without plugin since 7.26
          importAttributesKeyword: 'with'
        },
        parserOpts: {
          ...babelOptions.parserOpts,
          allowAwaitOutsideFunction: true,
          plugins: parserPlugins,
          sourceType: 'module'
        },
        plugins,
        // Required for esbuild.jsxDev to provide correct line numbers
        // This creates issues the react compiler because the re-order is too important
        // People should use @babel/plugin-transform-react-jsx-development to get back good line numbers
        retainLines:
          getReactCompilerPlugin(plugins) != null ? false : !isProduction && isJSX && opts.jsxRuntime !== 'classic',
        root: projectRoot,
        sourceFileName: filepath,
        sourceMaps: true
      });

      if (result) {
        let code = result.code!;
        if (useFastRefresh) {
          if (refreshContentRE.test(code)) {
            code = addRefreshWrapper(code, id);
          } else if (reactCompRE.test(code)) {
            code = addClassComponentRefreshWrapper(code, id);
          }
        }
        return { code, map: result.map };
      }
    }
  };

  const dependencies = ['react', 'react-dom', jsxImportDevRuntime, jsxImportRuntime];
  const staticBabelPlugins = typeof opts.babel === 'object' ? (opts.babel?.plugins ?? []) : [];
  const reactCompilerPlugin = getReactCompilerPlugin(staticBabelPlugins);
  if (reactCompilerPlugin) {
    const reactCompilerRuntimeModule = getReactCompilerRuntimeModule(reactCompilerPlugin);
    dependencies.push(reactCompilerRuntimeModule);
  }

  const viteReactRefresh: Plugin = {
    config: userConfig => ({
      build: silenceUseClientWarning(userConfig),
      optimizeDeps: {
        include: dependencies
      },
      resolve: {
        dedupe: ['react', 'react-dom']
      }
    }),
    enforce: 'pre',
    // eslint-disable-next-line consistent-return
    load(id) {
      if (id === runtimePublicPath) {
        return runtimeCode;
      }
    },
    name: 'vite:react-refresh',
    // eslint-disable-next-line consistent-return
    resolveId(id) {
      if (id === runtimePublicPath) {
        return id;
      }
    },
    // eslint-disable-next-line consistent-return
    transformIndexHtml() {
      if (!skipFastRefresh)
        return [
          {
            attrs: { type: 'module' },
            children: preambleCode.replace(`__BASE__`, devBase),
            tag: 'script'
          }
        ];
    }
  };

  return [autoRoutePlugin, viteBabel, viteReactRefresh];
}
