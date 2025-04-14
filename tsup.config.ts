// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  dts: true,

  entry: ['src/index.ts'],

  external: ['vite', 'react-router-dom'],

  format: ['esm', 'cjs'],
  outExtension(ctx) {
    if (ctx.format === 'esm') {
      return { dts: '.d.ts', js: '.mjs' };
    }
    return { dts: '.d.cts', js: '.cjs' };
  },
  sourcemap: true,
  splitting: false,
  target: 'es2020'
});
