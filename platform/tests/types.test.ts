import { describe, expect, test } from 'vitest';
import {
  SquareSchema, PositionSourceSchema, AgedTextSchema, QuestionSchema, StepSchema, ProfileSchema, SceneSchema,
  LAYER_KINDS, AGE_BANDS, LOCALES,
} from '@core/types';

const ok = (s: { safeParse: (v: unknown) => { success: boolean } }, v: unknown) => s.safeParse(v).success;
const scene = { position: { kind: 'fen', fen: '8/8/8/8/8/8/8/K6k w - - 0 1' }, base: 'board', layers: ['pieces'] };

describe('types', () => {
  test('Square accepts a1..h8 and rejects i9, A1, empty', () => {
    expect(['a1', 'h8', 'e4'].every((q) => ok(SquareSchema, q))).toBe(true);
    expect(['i9', 'A1', '', 'a0', 'a9'].some((q) => ok(SquareSchema, q))).toBe(false);
  });
  test('PositionSource: pgn needs an integer ply of 0 or more', () => {
    expect(ok(PositionSourceSchema, { kind: 'pgn', pgn: '1. e4', ply: 1 })).toBe(true);
    expect(ok(PositionSourceSchema, { kind: 'pgn', pgn: '1. e4', ply: -1 })).toBe(false);
    expect(ok(PositionSourceSchema, { kind: 'pgn', pgn: '1. e4', ply: 1.5 })).toBe(false);
    expect(ok(PositionSourceSchema, { kind: 'pgn', pgn: '1. e4' })).toBe(false);
  });
  test('AgedText needs kids', () => {
    expect(ok(AgedTextSchema, { kids: 'a' })).toBe(true);
    expect(ok(AgedTextSchema, { adults: 'a' })).toBe(false);
    expect(ok(AgedTextSchema, { kids: '' })).toBe(false);
  });
  test('Question choice: 2-4 choices, answer in range', () => {
    const q = (choices: string[], answer: number) => ({ kind: 'choice', prompt: { kids: 'q' }, choices, answer });
    expect(ok(QuestionSchema, q(['a', 'b'], 1))).toBe(true);
    expect(ok(QuestionSchema, q(['a', 'b'], 2))).toBe(false);
    expect(ok(QuestionSchema, q(['a'], 0))).toBe(false);
    expect(ok(QuestionSchema, q(['a', 'b', 'c', 'd', 'e'], 0))).toBe(false);
    expect(ok(QuestionSchema, q(['x'.repeat(40), 'b'], 0))).toBe(true);
    expect(ok(QuestionSchema, q(['x'.repeat(41), 'b'], 0))).toBe(false);
  });
  test('Question tap: one or more valid squares', () => {
    expect(ok(QuestionSchema, { kind: 'tap', prompt: { kids: 'q' }, squares: ['f7'] })).toBe(true);
    expect(ok(QuestionSchema, { kind: 'tap', prompt: { kids: 'q' }, squares: [] })).toBe(false);
    expect(ok(QuestionSchema, { kind: 'tap', prompt: { kids: 'q' }, squares: ['z9'] })).toBe(false);
  });
  test('Step id matches the slug pattern', () => {
    expect(ok(StepSchema, { id: 'attack-houses', scene, explain: { kids: 'x' } })).toBe(true);
    expect(ok(StepSchema, { id: 'Step 1', scene, explain: { kids: 'x' } })).toBe(false);
  });
  test('Profile: version 2, locale pl|en, age kids|teens|adults', () => {
    const p = { version: 2, avatar: 'violet', id: 'p1', age: 'kids', experience: 'basic', locale: 'pl', theme: { family: 'kids', mode: 'system' }, pieceStyle: 'images', progress: {}, unlockedLayers: ['pieces'] };
    expect(ok(ProfileSchema, p)).toBe(true);
    expect(ok(ProfileSchema, { ...p, version: 1 })).toBe(false);
    expect(ok(ProfileSchema, { ...p, locale: 'de' })).toBe(false);
    expect(ok(ProfileSchema, { ...p, age: 'toddler' })).toBe(false);
  });
  test('Scene.layers only LAYER_KINDS', () => {
    expect(ok(SceneSchema, scene)).toBe(true);
    expect(ok(SceneSchema, { ...scene, layers: ['nope'] })).toBe(false);
    expect(LAYER_KINDS).toContain('roads'); expect(AGE_BANDS).toEqual(['kids', 'teens', 'adults']); expect(LOCALES).toEqual(['pl', 'en']);
  });
});
