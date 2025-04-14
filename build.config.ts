import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  clean: true,
  declaration: true,
  entries: ['src/index'],
  externals: ['vite', 'react-router'],
  rollup: {
    emitCJS: true,
    esbuild: {
      minify: true
    },

    inlineDependencies: true
  }
});
