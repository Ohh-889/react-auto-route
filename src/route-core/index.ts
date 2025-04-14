import type { ViteDevServer } from 'vite';

import ElegantRouter from '../core';
import type { ElegantReactRouterOption } from '../types';

import { genConstFile } from './const';
import { genDtsFile } from './dts';
import { genImportsFile } from './imports';
import { log } from './log';
import { createPluginOptions } from './options';
import { genPageFile } from './page';
import { genRouteMapFile } from './routeMap';
import { genTransformFile } from './transform';

export default class ElegantReactRouter {
  options: ElegantReactRouterOption;

  elegantRouter: ElegantRouter;

  viteServer?: ViteDevServer;

  constructor(options: Partial<ElegantReactRouterOption> = {}) {
    this.elegantRouter = new ElegantRouter(options);

    this.options = createPluginOptions(this.elegantRouter.options, options);

    this.generate();
  }

  setupFSWatcher() {
    this.elegantRouter.setupFSWatcher(async (action, path) => {
      log('The pages changed, regenerating the dts file and routes...', 'info', this.options.log);

      if (action === 'add') {
        log(`The ${path} file has been added, regenerating the dts file and routes...`, 'info', this.options.log);

        genPageFile(path, this.options);
      }

      await this.generate();
      log('The dts file and routes have been regenerated successfully', 'success', this.options.log);

      this.reloadViteServer();
    });
  }

  stopFSWatcher() {
    this.elegantRouter.stopFSWatcher();
  }

  reloadViteServer() {
    this.viteServer?.ws?.send({ path: '*', type: 'full-reload' });
  }

  setViteServer(server: ViteDevServer) {
    this.viteServer = server;
  }

  async generate() {
    const { entries, files, trees } = this.elegantRouter;

    genTransformFile(this.options);

    await genDtsFile(files, entries, this.options);

    await genImportsFile(files, this.options);

    await genRouteMapFile(files, this.options, entries);

    await genConstFile(trees, this.options);
  }
}
