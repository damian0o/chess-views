import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { expectedStamps, stampedHtml, ASSETS } from '../scripts/stamp.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('index.html links analysis.js and pieces.css with a ?v= stamp matching their current content (run: node scripts/stamp.js)', () => {
  const stamps = expectedStamps();
  for (const file of ASSETS) {
    const m = html.match(new RegExp(`${file.replace('.', '\\.')}\\?v=([0-9a-f]+)`));
    assert.ok(m, `${file} is linked with ?v=; expected ?v=${stamps[file]}`);
    assert.equal(m[1], stamps[file], `${file} stamp is stale; run node scripts/stamp.js`);
  }
});

test('stampedHtml rewrites plain and already-stamped links', () => {
  const out = stampedHtml(`<link href="pieces.css"> import * as A from './analysis.js?v=deadbeef';`, { 'pieces.css': 'aaaa1111', 'analysis.js': 'bbbb2222' });
  assert.equal(out, `<link href="pieces.css?v=aaaa1111"> import * as A from './analysis.js?v=bbbb2222';`);
});
