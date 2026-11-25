import { describe, expect, test } from 'vitest';
import { buildRooms, familiesIn, familyView, lastOpenLesson, roomOfLesson } from '@core/rooms';
import { defaultProfile } from '@core/storage/index';
import type { Lesson, LessonId, LibraryEntry } from '@core/types';

const step = { id: 's1', scene: { position: { kind: 'fen' as const, fen: '8/8/8/8/8/8/8/K6k w - - 0 1' as never }, base: 'board' as const, layers: ['pieces' as const] }, explain: { kids: 'x' } };
const lesson = (id: string, kind: 'pattern' | 'game' | 'strategy', group: string, extra: Partial<Lesson> = {}): Lesson =>
  ({ id: id as LessonId, group: { kind, id: group }, title: id, about: { kids: 'x' }, experience: 'basic', moments: [], steps: [step, { ...step, id: 's2' }], ...extra } as Lesson);
const entry = (id: string, room: LibraryEntry['room'], family?: LibraryEntry['family']): LibraryEntry =>
  ({ id, name: id, tags: ['t'], note: { kids: 'x' }, source: step.scene.position, room, ...(family ? { family } : {}) });

const LESSONS = [
  lesson('eyes', 'pattern', 'f7-attack'), lesson('scholar', 'pattern', 'f7-attack'),
  lesson('legal', 'game', 'legal', { library: 'legal-1750', family: ['f7-attack'] }), lesson('opera', 'game', 'opera', { library: 'opera-game' }),
];
const LIBRARY = [
  entry('threat', 'patterns', ['f7-attack']), entry('fork', 'patterns'), entry('legal-1750', 'games', ['f7-attack']),
  entry('opera-game', 'games'), entry('lucena', 'endgames'),
];

describe('rooms', () => {
  test('a lesson\'s room follows its kind', () => {
    expect([roomOfLesson(LESSONS[0]!), roomOfLesson(LESSONS[2]!), roomOfLesson(lesson('x', 'strategy', 'plan'))]).toEqual(['patterns', 'games', 'openings']);
  });
  test('rooms come in order, empty ones left out; a game\'s board sits on its lesson, not as its own card', () => {
    const rooms = buildRooms(LESSONS, LIBRARY);
    expect(rooms.map((r) => r.id)).toEqual(['patterns', 'games', 'endgames']);
    const games = rooms.find((r) => r.id === 'games')!;
    expect(games.lessons.map((l) => l.id)).toEqual(['legal', 'opera']);
    expect(games.positions).toEqual([]);
    expect(games.boardOf.get('legal' as LessonId)?.id).toBe('legal-1750');
    expect(rooms[0]!.positions.map((p) => p.id)).toEqual(['threat', 'fork']);
  });
  test('families in a room: a pattern lesson\'s family is its group; others list theirs', () => {
    const rooms = buildRooms(LESSONS, LIBRARY);
    expect(familiesIn(rooms.find((r) => r.id === 'patterns')!)).toEqual(['f7-attack']);
    expect(familiesIn(rooms.find((r) => r.id === 'games')!)).toEqual(['f7-attack']);
    expect(familiesIn(rooms.find((r) => r.id === 'endgames')!)).toEqual([]);
  });
  test('a family filters the room, and lists what else belongs to it in other rooms', () => {
    const rooms = buildRooms(LESSONS, LIBRARY);
    const v = familyView(rooms, 'patterns', 'f7-attack');
    expect(v.lessons.map((l) => l.id)).toEqual(['eyes', 'scholar']);
    expect(v.positions.map((p) => p.id)).toEqual(['threat']);
    expect(v.elsewhere).toEqual([{ room: 'games', kind: 'lesson', id: 'legal' }]);
    const none = familyView(rooms, 'patterns', null);
    expect([none.lessons.length, none.positions.length, none.elsewhere.length]).toEqual([2, 2, 0]);
  });
  test('Kontynuuj: the lesson last opened, when it is not finished', () => {
    const p = { ...defaultProfile(), lastLesson: 'scholar', progress: { scholar: { reachedStep: 's2', done: false } } };
    expect(lastOpenLesson(p, LESSONS)?.id).toBe('scholar');
    expect(lastOpenLesson({ ...p, progress: { scholar: { reachedStep: 's2', done: true } } }, LESSONS)).toBeNull();
    expect(lastOpenLesson({ ...p, lastLesson: 'gone' }, LESSONS)).toBeNull();
    expect(lastOpenLesson(defaultProfile(), LESSONS)).toBeNull();
  });
});
