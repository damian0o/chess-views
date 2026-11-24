import { describe, expect, test } from 'vitest';
import { usableMoments, roundUnlocked, buildRound, ROUND_SIZE, MIN_USABLE } from '@core/recognition';
import type { Lesson, LessonId, Fen } from '@core/types';

const fenN = (n: number) => `8/8/8/8/8/8/${n}P${7 - n}/K6k w - - 0 1`.replace(/0P/, 'P').replace(/P0/, 'P') as Fen;
const step = { id: 's1', scene: { position: { kind: 'fen' as const, fen: fenN(0) }, base: 'board' as const, layers: ['pieces' as const] }, explain: { kids: 'x' } };
type Extra = Record<string, { looksLike?: string[] }>;
const mk = (id: string, game: string, ids: string[], extra: Extra = {}): Lesson => ({
  id: id as LessonId, group: { kind: 'game', id: 'g' }, title: game, about: { kids: 'x' }, game, experience: 'basic',
  steps: [step],
  moments: ids.map((m, i) => ({ id: m, name: `the ${m}`, board: { kind: 'fen', fen: fenN(i % 7) }, ...(extra[m] ?? {}) })),
} as Lesson);
const plain: Lesson = { id: 'plain' as LessonId, group: { kind: 'pattern', id: 'p' }, title: 'Plain', about: { kids: 'x' }, experience: 'basic', moments: [], steps: [step] } as Lesson;
const RL = [mk('ga', 'Game A', ['start', 'trick', 'mate']), mk('gb', 'Game B', ['start', 'mate'], { mate: { looksLike: ['ga/mate'] } }), mk('gc', 'Game C', ['hunt', 'mate']), plain];
const done = (...ids: string[]) => new Set(ids as LessonId[]);
const keys = (list: { key: string }[]) => list.map((m) => m.key).sort();
const choiceQ = (s: Lesson['steps'][number]) => { const q = s.question; if (!q || q.kind !== 'choice') throw new Error('not a choice'); return q; };
const rightOf = (s: Lesson['steps'][number]) => { const q = choiceQ(s); return q.choices[q.answer]; };

describe('recognition', () => {
  test('round constants', () => { expect(ROUND_SIZE).toBe(8); expect(MIN_USABLE).toBe(4); });

  test('usableMoments: unfinished lessons never count', () => {
    const u = usableMoments(RL, done('ga', 'gc'));
    expect(u.every((m) => ['ga', 'gc'].includes(m.lessonId))).toBe(true);
    expect(keys(u)).toEqual(['ga/mate', 'ga/start', 'ga/trick', 'gc/hunt', 'gc/mate']);
    expect(u.find((m) => m.key === 'ga/trick')?.label).toBe('Game A: the trick');
  });

  test('usableMoments: lessons without moments never count', () => {
    expect(usableMoments(RL, done('ga', 'gc', 'plain')).every((m) => m.lessonId !== 'plain')).toBe(true);
  });

  test('usableMoments: a moment whose only others are looksLike is not usable', () => {
    const two = [mk('x', 'X', ['a', 'b'], { a: { looksLike: ['y/a', 'y/b'] } }), mk('y', 'Y', ['a', 'b'], { b: { looksLike: ['x/b'] } })];
    const u = keys(usableMoments(two, done('x', 'y')));
    for (const k of ['x/a', 'y/b', 'x/b', 'y/a']) expect(u).not.toContain(k);
    const u3 = keys(usableMoments([...two, mk('z', 'Z', ['a', 'b'])], done('x', 'y', 'z')));
    expect(u3).toContain('x/a'); expect(u3).toContain('x/b');
  });

  test('roundUnlocked: needs two finished lessons and four usable moments', () => {
    expect(roundUnlocked(RL, done('ga'))).toBe(false);
    expect(roundUnlocked(RL, done('ga', 'plain'))).toBe(false);
    expect(roundUnlocked(RL, done('ga', 'gc'))).toBe(true);
    const tiny = [mk('p', 'P', ['a', 'b']), mk('q', 'Q', ['a', 'b'], { a: { looksLike: ['p/a', 'p/b'] }, b: { looksLike: ['p/a', 'p/b'] } })];
    expect(roundUnlocked(tiny, done('p', 'q'))).toBe(false);
  });

  test('buildRound: the same seed gives the same round, another seed another order', () => {
    const d = done('ga', 'gb', 'gc');
    expect(buildRound(RL, d, 42)).toEqual(buildRound(RL, d, 42));
    const orders = new Set([1, 2, 3, 4, 5, 6].map((seed) => JSON.stringify(buildRound(RL, d, seed)?.steps.map(rightOf))));
    expect(orders.size).toBeGreaterThan(1);
  });

  test('buildRound: every question has 3 or 4 distinct choices, the right one included, no looksLike pair together', () => {
    const d = done('ga', 'gb', 'gc');
    for (let seed = 0; seed < 30; seed++) {
      const r = buildRound(RL, d, seed);
      if (!r) throw new Error('locked');
      expect(r.seed).toBe(seed);
      expect(r.steps.length).toBe(Math.min(ROUND_SIZE, usableMoments(RL, d).length));
      const rights = r.steps.map(rightOf);
      expect(new Set(rights).size).toBe(rights.length);
      r.steps.forEach((s, i) => {
        const q = choiceQ(s);
        expect(q.choices.length).toBeGreaterThanOrEqual(3); expect(q.choices.length).toBeLessThanOrEqual(4);
        expect(new Set(q.choices).size).toBe(q.choices.length);
        expect(q.choices.includes('Game A: the mate') && q.choices.includes('Game B: the mate')).toBe(false);
        expect(s.scene.layers).not.toContain('pieces');                 // blocks only
        expect(s.scene.hideMoves).toBe(true);
        expect(s.id).toBe(`round-${i + 1}`);
        expect(q.prompt.kids).toBe('Which game, which moment?');
        expect(s.explain.kids).toMatch(new RegExp(`Board ${i + 1} of ${r.steps.length}`));
      });
    }
  });

  test('buildRound: same-lesson moments are offered first as wrong answers', () => {
    const r = buildRound(RL, done('ga', 'gb', 'gc'), 7);
    const s = r?.steps.find((x) => rightOf(x) === 'Game A: the start');
    expect(s && choiceQ(s).choices).toEqual(expect.arrayContaining(['Game A: the trick', 'Game A: the mate']));
  });

  test('buildRound: returns null when locked', () => {
    expect(buildRound(RL, done('ga'), 1)).toBeNull();
  });

  test('buildRound: the prompt follows the locale; labels come from the lessons', () => {
    const plL = [mk('ga', 'Partia A', ['start', 'trick', 'mate']), mk('gc', 'Partia C', ['hunt', 'mate'])];
    const r = buildRound(plL, done('ga', 'gc'), 3, { locale: 'pl' });
    const q = r && choiceQ(r.steps[0]!);
    expect(q?.prompt.kids).toBe('Która partia, który moment?');
    expect(q?.choices.every((c) => c.startsWith('Partia '))).toBe(true);
    expect(r?.steps[0]?.explain.kids).toMatch(/^Plansza 1 z /);
  });
});
