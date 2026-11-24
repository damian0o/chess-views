import { describe, expect, test } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileContent } from '../../src/content/compile';
import { loadGame } from '@core/chess/rules';
import type { Lesson, PositionSource } from '@core/types';
// The proof of concept's own resolver, so positions are compared with what the live site shows.
// @ts-expect-error plain JavaScript module of the proof of concept
import { resolveSteps, resolveMoments } from '../../../lessons.js';

const ROOT = fileURLToPath(new URL('../../content', import.meta.url));
const POC = JSON.parse(readFileSync(new URL('../../../positions.json', import.meta.url), 'utf8')) as {
  positions: { id: string }[];
  lessons: { id: string; moments?: { id: string }[]; steps: { ask?: { choices?: string[]; answer?: number; tap?: string[] }; recall?: boolean; blocks?: boolean; moment?: string }[] }[];
};
const out = compileContent(ROOT);
const fenOf = (src: PositionSource | { kind: string; fen?: string; pgn?: string; ply?: number }) => loadGame(src as PositionSource).fen();
const walk = (d: string): string[] => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });

describe('converted content', () => {
  test('compiles without errors', () => expect(out.errors).toEqual([]));

  test('English lessons match the proof of concept step by step', () => {
    for (const poc of POC.lessons) {
      const L = out.lessons.en.find((l: Lesson) => l.id === poc.id);
      expect(L, poc.id).toBeDefined();
      const steps = resolveSteps(poc, POC.positions) as { source: PositionSource }[];
      expect(L!.steps.length, poc.id).toBe(poc.steps.length);
      L!.steps.forEach((s, i) => {
        const raw = poc.steps[i]!;
        const pocFen = raw.recall ? fenOf((resolveMoments(poc, POC.positions) as { id: string; source: PositionSource }[]).find((m) => m.id === raw.moment)!.source) : fenOf(steps[i]!.source);
        expect(fenOf(s.scene.position), `${poc.id} step ${i + 1}`).toBe(pocFen);
        const q = s.question;
        if (raw.recall) expect(q).toMatchObject({ kind: 'recall', answer: 'yes' });
        else if (raw.ask?.tap) expect(q).toMatchObject({ kind: 'tap', squares: raw.ask.tap });
        else if (raw.ask?.choices && raw.blocks && raw.moment && raw.ask.choices.join() === 'Yes,No') expect(q).toMatchObject({ kind: 'recall', answer: raw.ask.answer === 0 ? 'yes' : 'no' });
        else if (raw.ask?.choices) expect(q).toMatchObject({ kind: 'choice', choices: raw.ask.choices, answer: raw.ask.answer });
        else expect(q, `${poc.id} step ${i + 1}`).toBeUndefined();
      });
      expect(L!.moments.map((m) => m.id)).toEqual((poc.moments ?? []).map((m) => m.id));
    }
  });

  test('Polish has the same lessons, step ids, positions and answers', () => {
    expect(out.lessons.pl.map((l) => l.id).sort()).toEqual(out.lessons.en.map((l) => l.id).sort());
    for (const L of out.lessons.en) {
      const P = out.lessons.pl.find((l) => l.id === L.id)!;
      expect(P.steps.map((s) => [s.id, s.scene.position, s.question && JSON.stringify({ ...s.question, prompt: 0, right: 0, choices: 0 })]))
        .toEqual(L.steps.map((s) => [s.id, s.scene.position, s.question && JSON.stringify({ ...s.question, prompt: 0, right: 0, choices: 0 })]));
    }
  });

  test('every Polish lesson file is marked as a draft for review', () => {
    for (const f of walk(join(ROOT, 'pl')).filter((p) => p.endsWith('.md'))) {
      const lines = readFileSync(f, 'utf8').split('\n');
      const close = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
      expect(lines[close + 1], f).toBe('<!-- draft: review -->');
    }
  });

  test('no step text still tells the child to open a view', () => {
    for (const L of [...out.lessons.en, ...out.lessons.pl]) for (const s of L.steps) expect(s.explain.kids, `${L.id}/${s.id}`).not.toMatch(/(Open|Otwórz) \*\*/);
  });

  test('the step-id table covers every lesson in proof-of-concept order', () => {
    const table = JSON.parse(readFileSync(join(ROOT, 'poc-step-ids.json'), 'utf8')) as Record<string, string[]>;
    expect(table['scholars-mate']).toHaveLength(25);
    for (const L of out.lessons.en) expect(table[L.id]).toEqual(L.steps.map((s) => s.id));
  });

  test('the library has all 25 entries in both languages', () => {
    expect(out.library.en).toHaveLength(25);
    expect(out.library.pl).toHaveLength(25);
    expect(out.library.pl.map((e) => e.id)).toEqual(POC.positions.map((p) => p.id));
  });
});
