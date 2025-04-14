import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { ElegantReactRouterOption } from '@/types';

export async function genPageFile(addPath: string, options: ElegantReactRouterOption) {
  const { cwd, pageDir } = options;

  const pageFilePath = path.posix.join(cwd, `${pageDir}/${addPath}`);

  const code = getPageCode(addPath);

  await writeFile(pageFilePath, code, 'utf8');
}

function getPageCode(addPath: string) {
  const pageName = getPageName(addPath);

  const code = `
const ${pageName} = () => {
  return <div>${pageName}</div>;
};


export default ${pageName};
  `;

  return code;
}

function getPageName(addPath: string) {
  // 找到最后一个 `/` 的位置
  const pageName = addPath.endsWith('layout.tsx') ? 'Layout' : 'Component';

  return pageName;
}
