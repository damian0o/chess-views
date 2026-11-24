import { expect, test } from 'vitest';
import { ESLint } from 'eslint';
import { fileURLToPath } from 'node:url';

const cwd = fileURLToPath(new URL('..', import.meta.url));
const lint = async (path: string, code: string) => {
  const eslint = new ESLint({ cwd });
  const [res] = await eslint.lintText(code, { filePath: `${cwd}/${path}` });
  return (res?.messages ?? []).filter((m) => m.ruleId === 'no-restricted-imports');
};

test('core may not import React', async () => {
  expect(await lint('src/core/x.ts', "import React from 'react';\nexport const x = React;\n")).toHaveLength(1);
});

test('core may not import content', async () => {
  expect(await lint('src/core/y.ts', "import { z } from '../content/z';\nexport const y = z;\n")).toHaveLength(1);
});

test('content may import core', async () => {
  expect(await lint('src/content/a.ts', "import { CORE_VERSION } from '@core/index';\nexport const a = CORE_VERSION;\n")).toHaveLength(0);
});
