/**
 * Rooms: the home screen's topics, each holding its guided lessons and its library positions.
 * A game lesson that names its library board shows it on its own card, so the game appears once.
 */
import { FAMILIES, ROOMS, type Family, type Lesson, type LessonId, type LibraryEntry, type Profile, type Room } from './types';

export interface RoomView { id: Room; lessons: Lesson[]; positions: LibraryEntry[]; boardOf: Map<LessonId, LibraryEntry> }
export type Elsewhere = { room: Room; kind: 'lesson' | 'position'; id: string };

const KIND_ROOM: Record<Lesson['group']['kind'], Room> = { pattern: 'patterns', game: 'games', strategy: 'openings' };
export const roomOfLesson = (l: Lesson): Room => KIND_ROOM[l.group.kind];

export function familiesOfLesson(l: Lesson): Family[] {
  const own = l.group.kind === 'pattern' && (FAMILIES as readonly string[]).includes(l.group.id) ? [l.group.id as Family] : [];
  return [...new Set([...own, ...(l.family ?? [])])];
}

/** The rooms in order, empty ones left out. */
export function buildRooms(lessons: Lesson[], library: LibraryEntry[]): RoomView[] {
  const linked = new Set(lessons.map((l) => l.library).filter(Boolean));
  return ROOMS.map((id) => {
    const ls = lessons.filter((l) => roomOfLesson(l) === id);
    const boardOf = new Map<LessonId, LibraryEntry>();
    for (const l of ls) { const e = l.library ? library.find((x) => x.id === l.library) : undefined; if (e) boardOf.set(l.id, e); }
    return { id, lessons: ls, positions: library.filter((e) => e.room === id && !linked.has(e.id)), boardOf };
  }).filter((r) => r.lessons.length || r.positions.length);
}

const inFamily = (f: Family) => ({
  lesson: (l: Lesson) => familiesOfLesson(l).includes(f),
  position: (e: LibraryEntry) => (e.family ?? []).includes(f),
});

/** The families that have something in this room, in the order of FAMILIES. */
export function familiesIn(room: RoomView): Family[] {
  return FAMILIES.filter((f) => room.lessons.some(inFamily(f).lesson) || room.positions.some(inFamily(f).position)
    || [...room.boardOf.values()].some(inFamily(f).position));
}

/** A room filtered by a family (or not), and the family's lessons and positions in the other rooms. */
export function familyView(rooms: RoomView[], room: Room, family: Family | null): { lessons: Lesson[]; positions: LibraryEntry[]; elsewhere: Elsewhere[] } {
  const here = rooms.find((r) => r.id === room);
  if (!here) return { lessons: [], positions: [], elsewhere: [] };
  if (!family) return { lessons: here.lessons, positions: here.positions, elsewhere: [] };
  const f = inFamily(family);
  const elsewhere: Elsewhere[] = rooms.filter((r) => r.id !== room).flatMap((r) => [
    ...r.lessons.filter((l) => f.lesson(l) || (r.boardOf.get(l.id) && f.position(r.boardOf.get(l.id)!))).map((l) => ({ room: r.id, kind: 'lesson' as const, id: l.id as string })),
    ...r.positions.filter(f.position).map((e) => ({ room: r.id, kind: 'position' as const, id: e.id })),
  ]);
  return { lessons: here.lessons.filter((l) => f.lesson(l) || (here.boardOf.get(l.id) && f.position(here.boardOf.get(l.id)!))), positions: here.positions.filter(f.position), elsewhere };
}

/** The lesson opened last, if it still exists and is not finished. */
export function lastOpenLesson(p: Profile, lessons: Lesson[]): Lesson | null {
  const l = p.lastLesson ? lessons.find((x) => x.id === p.lastLesson) : undefined;
  return l && !p.progress[l.id]?.done ? l : null;
}
