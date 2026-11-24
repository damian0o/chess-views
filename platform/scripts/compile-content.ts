/** npm run content — compile platform/content into dist/content/<locale>/{lessons,library}.json, or print file:line errors and exit 1. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { LOCALES } from '../src/core/types';
import { compileContent } from '../src/content/compile';

const [root = 'content', out = 'dist/content'] = process.argv.slice(2);
const result = compileContent(root);
if (result.errors.length) {
  for (const e of result.errors) process.stderr.write(`${relative(process.cwd(), e.file) || e.file}:${e.line}: ${e.message}\n`);
  process.stderr.write(`${result.errors.length} content error(s)\n`);
  process.exit(1);
}
for (const locale of LOCALES) {
  const dir = join(out, locale);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'lessons.json'), JSON.stringify(result.lessons[locale], null, 2));
  writeFileSync(join(dir, 'library.json'), JSON.stringify(result.library[locale], null, 2));
}
process.stdout.write(`content: ${LOCALES.map((l) => `${l} ${result.lessons[l].length} lessons, ${result.library[l].length} positions`).join('; ')}\n`);
