import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import dedent from 'dedent';

import type { ElegantRouterFile } from '../core';
import { ensureFile } from '../shared/fs';
import type { ElegantReactRouterOption } from '../types';

import { createPrefixCommentOfGenFile } from './comment';

function getImportsCode(files: ElegantRouterFile[], options: ElegantReactRouterOption) {
  const preCode = createPrefixCommentOfGenFile();

  let importCode = ``;

  let exportLayoutCode = `export const layouts: Record<string, () => Promise<any>> = {`;

  let exportPages = `export const pages: Record<string, () => Promise<any>> = {`;

  let exportError = `export const errors: Record<string, () => Promise<any>> = {`;

  // 通用的文件导入处理函数
  function handleFileImport(routeName: string, importPath: string, code: string) {
    const isLazy = options.lazyImport(routeName);
    const key = `"${routeName}"`;

    if (isLazy) {
      // eslint-disable-next-line no-param-reassign
      code += `\n  ${key}: () => import("${importPath}"),`;
    } else {
      const importKey = getImportKey(routeName);
      importCode += `import ${importKey} from "${importPath}";\n`;
      // eslint-disable-next-line no-param-reassign
      code += `\n  ${key}${key === importKey ? '' : `: ${importKey}`},`;
    }

    return code;
  }

  files.forEach(file => {
    const { importAliasPath, routeName } = file;

    if (importAliasPath?.endsWith('layout.tsx')) {
      exportLayoutCode = handleFileImport(routeName, importAliasPath, exportLayoutCode);
    } else if (importAliasPath?.endsWith('error.tsx')) {
      exportError = handleFileImport(routeName, importAliasPath, exportError);
    } else if (!importAliasPath?.endsWith('loading.tsx')) {
      exportPages = handleFileImport(routeName, importAliasPath || '', exportPages);
    }
  });

  importCode += '\n';
  exportLayoutCode += '\n};\n';
  exportPages += '\n};\n';
  exportError += '\n};\n';

  return dedent`${preCode}\n\n${importCode}${exportLayoutCode}\n${exportPages}\n${exportError}`;
}

function getImportKey(name: string) {
  const NUM_REG = /^\d+$/;
  const SHORT_WITH_NUM_OR_CHAR_REG = /-[0-9|a-zA-Z]/g;

  let key = name;

  if (NUM_REG.test(name)) {
    key = `_${name}`;
  }

  key = key.replace(SHORT_WITH_NUM_OR_CHAR_REG, match => {
    let remain = match.replace('-', '').toUpperCase();
    if (NUM_REG.test(remain)) {
      remain = `_${remain}`;
    }
    return remain;
  });

  return key;
}

export async function genImportsFile(files: ElegantRouterFile[], options: ElegantReactRouterOption) {
  if (files.length === 0) return;

  const importsPath = path.posix.join(options.cwd, options.importsDir);

  await ensureFile(importsPath);

  const code = getImportsCode(files, options);

  await writeFile(importsPath, code);
}
