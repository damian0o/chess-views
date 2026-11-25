import { describe, expect, test } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assembleSite, POC_FILES } from '../scripts/assemble-site';
import { forwardOldLink } from '../src/app/forward';

const REPO = join(process.cwd(), '..');
const sha = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');

describe('assemble-site', () => {
  test('copies the app to the root and the POC to poc/', () => {
    const app = mkdtempSync(join(tmpdir(), 'cv-app-'));
    writeFileSync(join(app, 'index.html'), '<!doctype html><title>new</title>');
    mkdirSync(join(app, 'assets')); writeFileSync(join(app, 'assets', 'a.js'), 'x');
    const out = join(mkdtempSync(join(tmpdir(), 'cv-site-')), 'site');
    assembleSite({ repoRoot: REPO, appDist: app, out });
    expect(readFileSync(join(out, 'index.html'), 'utf8')).toContain('new');
    expect(existsSync(join(out, 'assets', 'a.js'))).toBe(true);
    for (const f of POC_FILES) expect(existsSync(join(out, 'poc', f)), f).toBe(true);
    expect(sha(join(out, 'poc', 'engine', 'stockfish-19-lite-single.wasm'))).toBe('ee4f115bdb2d32cadf96cada104a05b5ec257d7ad6f57582190b49bc71f096de');
    expect(existsSync(join(out, '.nojekyll'))).toBe(true);
  });
});

describe('forwardOldLink', () => {
  const ids = { 'scholars-mate': ['s01-board', 's02-houses'] };
  const run = (hash: string) => {
    const calls: { replace?: string; hash?: string } = {};
    const done = forwardOldLink(hash, ids, { replace: (u) => { calls.replace = u; }, setHash: (h) => { calls.hash = h; }, setUrl: (u) => { calls.hash = `url ${u}`; } });
    return { done, ...calls };
  };
  test('an old position link opens the free board with the same settings', () => {
    expect(run('#fen=8%2F8+w+-+-+0+1&view=roads')).toEqual({ done: false, hash: '#/board?fen=8%2F8+w+-+-+0+1&view=roads' });   // the position stays in the hash
  });
  test('an old link the app cannot open goes to ./poc/ with the same hash', () => {
    expect(run('#lesson=recognise&seed=1')).toEqual({ done: true, replace: './poc/#lesson=recognise&seed=1' });
  });
  test('an old lesson link becomes the new address', () => {
    expect(run('#lesson=scholars-mate&step=2')).toEqual({ done: false, hash: '#/lesson/scholars-mate/s02-houses' });
  });
  test('new addresses are left alone', () => {
    expect(run('#/home')).toEqual({ done: false });
    expect(run('')).toEqual({ done: false });
  });
});

describe('forwarding while the app is open', () => {
  test('watchOldLinks forwards an old link typed into a running tab', async () => {
    const { watchOldLinks } = await import('../src/app/forward');
    const listeners: (() => void)[] = [];
    let hash = '#/home';
    const calls: string[] = [];
    watchOldLinks({ 'scholars-mate': ['s01-board'] }, {
      get hash() { return hash; },
      onHashChange: (fn) => listeners.push(fn),
      replace: (u) => calls.push(`replace ${u}`),
      setHash: (h) => calls.push(`hash ${h}`),
      setUrl: (u) => calls.push(`url ${u}`),
    });
    hash = '#lesson=recognise&seed=2'; listeners.forEach((f) => f());
    hash = '#lesson=scholars-mate&step=1'; listeners.forEach((f) => f());
    expect(calls).toEqual(['replace ./poc/#lesson=recognise&seed=2', 'hash #/lesson/scholars-mate/s01-board']);
  });
});

describe('engine files in the site', () => {
  test('assemble-site copies engine/ to the root with the pinned wasm hash', () => {
    const app = mkdtempSync(join(tmpdir(), 'cv-app-'));
    writeFileSync(join(app, 'index.html'), 'x');
    const out = join(mkdtempSync(join(tmpdir(), 'cv-site-')), 'site');
    assembleSite({ repoRoot: REPO, appDist: app, out });
    expect(sha(join(out, 'engine', 'stockfish-19-lite-single.wasm'))).toBe('ee4f115bdb2d32cadf96cada104a05b5ec257d7ad6f57582190b49bc71f096de');
    expect(sha(join(out, 'engine', 'stockfish-19-lite-single.js'))).toBe('ccb130d7ff29408531c47d859a49f91d59d4f482d05a53eb1a3231a4f624c91a');
    expect(existsSync(join(out, 'engine', 'COPYING.txt'))).toBe(true);
  });
});
