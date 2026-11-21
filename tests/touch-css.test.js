import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('interactive areas opt out of text selection with the WebKit prefix (iOS Safari ignores the unprefixed property)', () => {
  const rule = html.match(/\n\s*(main[^{]*)\{([^}]*)\}/);
  assert.ok(rule, 'a rule starting with the main selector');
  const [, selector, body] = rule;
  for (const sel of ['main', '.tabs', '.status', '.player']) assert.ok(selector.includes(sel), `${sel} in "${selector.trim()}"`);
  assert.match(body, /-webkit-user-select:\s*none/);
  assert.match(body, /(^|[^-])user-select:\s*none/);
  assert.match(body, /-webkit-touch-callout:\s*none/);
});
