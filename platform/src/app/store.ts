/**
 * The app's state over the core: the players on this device, the current player, the running lesson
 * or Recognise round, and a toast. Every change to progress is saved through the ProfileStore.
 * No chess or lesson rule lives here: actions call the core.
 */
import { createStore } from 'zustand/vanilla';
import type { AgeBand, Avatar, Lesson, LessonId, LibraryEntry, Locale, Profile } from '@core/types';
import { createLocalProfileStore, defaultProfile, type ProfileSummary, type StorageLike } from '@core/storage/index';
import { startLesson, type LessonEvent, type LessonRun } from '@core/lessons/run';
import { recordStep, finishLesson, resumeStepId } from '@core/lessons/progress';
import { buildRound, roundUnlocked, type Round } from '@core/recognition';
import { t, type MessageKey } from '@core/i18n/index';
import { openSession, sessionFromParams, stepTo, type Session } from '@core/session';
import { parseInput } from '@core/analysis';
import { START_FEN } from '@core/chess/rules';
import { viewOf } from './views';

/** The player last chosen on this device, so a reload keeps them signed in. */
const CURRENT_KEY = 'chess-views:current-player';
export const ROUND_LESSON_ID = 'recognise';

export interface AppState {
  players: ProfileSummary[];
  player: Profile | null;
  run: LessonRun | null;
  round: Round | null;
  toast: string | null;
  /** Where Settings' Back returns to: the screen the ⚙ button was pressed on (memory only). */
  returnTo: string | null;
  /** The list the free board was last opened from (a room, or null for home): its ◀ goes back there. */
  boardFrom: string | null;
  /** The free board's position and settings. */
  session: Session | null;
  openBoard(params: URLSearchParams): void;
  loadBoardText(text: string): Promise<MessageKey | null>;
  setPly(ply: number): void;
  stepPly(by: number): void;
  setView(view: string): void;
  toggleFlip(): void;
  loadPlayers(): Promise<void>;
  restore(): Promise<void>;
  addPlayer(opts: { name?: string; age?: AgeBand; locale?: Locale; avatar?: Avatar }): Promise<void>;
  pickPlayer(id: string): Promise<void>;
  updatePlayer(patch: Partial<Omit<Profile, 'id' | 'version'>>): Promise<void>;
  removePlayer(id: string): Promise<void>;
  openLesson(id: string, stepId?: string): Promise<void>;
  openRound(seed: number, stepIndex?: number): Promise<void>;
  report(e: LessonEvent): void;
  next(): Promise<void>;
  back(): Promise<void>;
  leave(): void;
  dismissToast(): void;
  lessonList(): Lesson[];
  libraryList(): LibraryEntry[];
  recogniseUnlocked(): boolean;
  exportPlayer(): Promise<Blob | null>;
  importPlayer(file: Blob): Promise<void>;
}

export interface StoreDeps {
  storage: StorageLike | undefined;
  /** Ignore a second Next/Back within this many ms of a step change (a double tap). Default 300. */
  minStepMs?: number;
  now?: () => number;
  /** For lichess imports (tests pass a fake). */
  fetch?: typeof fetch;
  /** How long a lichess download may take (ms). */
  fetchTimeoutMs?: number;
  lessons: Record<Locale, Lesson[]>;
  library: Record<Locale, LibraryEntry[]>;
  pocStepIds: Record<string, string[]>;
}

const memoryStorage = (): StorageLike => { const d: Record<string, string> = {}; return { getItem: (k) => d[k] ?? null, setItem: (k, v) => { d[k] = v; }, removeItem: (k) => { delete d[k]; } }; };

export function createAppStore(deps: StoreDeps) {
  const storage = deps.storage ?? memoryStorage();
  const profiles = createLocalProfileStore(storage);
  const read = (k: string) => { try { return storage.getItem(k); } catch { return null; } };
  const write = (k: string, v: string) => { try { storage.setItem(k, v); } catch { /* storage unavailable */ } };
  const lessonsOf = (p: Profile | null) => deps.lessons[p?.locale ?? 'pl'] ?? [];

  const now = deps.now ?? (() => Date.now());
  const minStep = deps.minStepMs ?? 300;
  let lastMove = -Infinity;
  /** True when a step change happened too recently (a double tap): the press is ignored. */
  const tooSoon = () => { const t0 = now(); if (t0 - lastMove < minStep) return true; lastMove = t0; return false; };

  return createStore<AppState>()((set, get) => {
    const say = (key: Parameters<typeof t>[1]) => set({ toast: t(get().player?.locale ?? 'pl', key) });
    // A failed save (storage full or blocked) is said once, until a save works again; play goes on in memory.
    let saveFailing = false;
    const savePlayer = async (p: Profile) => {
      try { await profiles.save(p); saveFailing = false; } catch { if (!saveFailing) say('saveFailed'); saveFailing = true; }
      write(CURRENT_KEY, p.id);
      const listed = await profiles.list();
      const players = listed.some((x) => x.id === p.id) ? listed : [...listed, { id: p.id, ...(p.name ? { name: p.name } : {}), age: p.age, avatar: p.avatar }];
      set({ player: p, players });
    };

    return {
      players: [], player: null, run: null, round: null, toast: null, returnTo: null, boardFrom: null, session: null,

      openBoard(params) {
        const pos = params.get('pos');
        if (pos !== null && !params.has('fen') && !params.has('pgn')) {
          // An old #pos link: a library entry by id, in its own view unless the link says otherwise.
          const entry = deps.library[get().player?.locale ?? 'pl']?.find((e) => e.id === pos);
          const view = params.get('view') ?? (entry ? viewOf(entry.scene?.layers ?? ['pieces']).id : 'board');
          const solve = !!entry?.tags.includes('problem') || params.get('solve') === '1';
          const s = entry ? openSession(entry.source, { view, flip: params.get('flip') === '1', solve, ...(params.has('ply') ? { ply: Number(params.get('ply')) } : {}) }) : null;
          if (!s || 'error' in s) { say('posNotFound'); set({ session: openSession({ kind: 'fen', fen: START_FEN }, { view }) as Session }); return; }
          set({ session: s });
          return;
        }
        const s = sessionFromParams(params);
        if (s && 'error' in s) say(s.error);
        const ok = s && !('error' in s) ? s : null;
        set({ session: ok ?? (openSession({ kind: 'fen', fen: START_FEN }, { view: params.get('view') ?? 'board' }) as Session) });
      },

      async loadBoardText(text) {
        const view = get().session?.view ?? 'board';
        const flip = get().session?.flip ?? false;
        const parsed = parseInput(text);
        if (parsed.kind === 'lichess-game') {
          const doFetch = deps.fetch ?? globalThis.fetch.bind(globalThis);
          let pgn: string;
          try {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), deps.fetchTimeoutMs ?? 15_000);
            const res = await doFetch(`https://lichess.org/game/export/${parsed.gameId}?clocks=false&evals=false`, { headers: { Accept: 'application/x-chess-pgn' }, signal: ctrl.signal }).finally(() => clearTimeout(timer));
            if (!res.ok) return 'loadLichessFailed';
            pgn = await res.text();
          } catch { return 'loadLichessFailed'; }
          const s = openSession({ kind: 'pgn', pgn, ply: parsed.ply ?? Number.MAX_SAFE_INTEGER }, { view, flip });
          if ('error' in s) return 'loadLichessFailed';
          set({ session: stepTo(s, parsed.ply ?? s.game.length) });
          return null;
        }
        const s = openSession(text, { view, flip });
        if ('error' in s) return s.error;
        set({ session: s });
        return null;
      },

      setPly(ply) { const s = get().session; if (s) set({ session: stepTo(s, ply) }); },
      stepPly(by) { const s = get().session; if (s) set({ session: stepTo(s, s.ply + by) }); },
      setView(view) { const s = get().session; if (s) set({ session: { ...s, view } }); },
      toggleFlip() { const s = get().session; if (s) set({ session: { ...s, flip: !s.flip } }); },

      async loadPlayers() { set({ players: await profiles.list() }); },

      async restore() {
        const id = read(CURRENT_KEY);
        const p = id ? await profiles.load(id) : null;
        set({ players: await profiles.list(), player: p });
      },

      async addPlayer(opts) {
        // Every new player starts at zero; the old app's progress stays with the old app (/poc/).
        await savePlayer(defaultProfile(opts));
      },

      async pickPlayer(id) {
        const p = await profiles.load(id);
        if (p) write(CURRENT_KEY, p.id);
        set({ player: p, run: null, round: null });
      },

      async updatePlayer(patch) {
        const p = get().player;
        if (!p) return;
        const next = { ...p, ...patch, theme: { ...p.theme, ...(patch.theme ?? {}) } };
        const { run, round } = get();
        const changesLesson = next.locale !== p.locale || next.age !== p.age || next.experience !== p.experience;
        if (run && changesLesson) {
          // The open lesson continues at the same step in the new language and age; a round is left.
          const lesson = round ? null : lessonsOf(next).find((l) => l.id === run.lesson.id);
          set({ run: lesson ? startLesson(lesson, next, run.step.id) : null, ...(round ? { round: null } : {}) });
        }
        await savePlayer(next);
      },

      async removePlayer(id) {
        await profiles.remove(id);
        if (read(CURRENT_KEY) === id) { try { storage.removeItem(CURRENT_KEY); } catch { /* storage unavailable */ } }
        const players = await profiles.list();
        set({ players, ...(get().player?.id === id ? { player: null, run: null, round: null } : {}) });
      },

      async openLesson(id, stepId) {
        const player = get().player;
        const lesson = lessonsOf(player).find((l) => l.id === id);
        if (!player || !lesson) { set({ run: null, round: null }); say('lessonNotHere'); return; }
        const run = startLesson(lesson, player, stepId ?? resumeStepId(player, lesson));
        if (!run) { set({ run: null, round: null }); say('lessonNotHere'); return; }   // no step for this age
        const saved = { ...recordStep(player, run), lastLesson: lesson.id };
        set({ run: run.withProfile(saved), round: null });
        await savePlayer(saved);
      },

      async openRound(seed, stepIndex = 1) {
        const player = get().player;
        if (!player) { say('lessonNotHere'); return; }
        const lessons = lessonsOf(player);
        const done = new Set(Object.entries(player.progress).filter(([, r]) => r.done).map(([k]) => k as LessonId));
        const round = buildRound(lessons, done, seed, { locale: player.locale });
        if (!round || stepIndex < 1 || stepIndex > round.steps.length) { set({ run: null, round: null }); say('lessonNotHere'); return; }
        const pseudo: Lesson = {
          id: ROUND_LESSON_ID as LessonId, group: { kind: 'pattern', id: ROUND_LESSON_ID }, title: t(player.locale, 'recognise'),
          about: { kids: t(player.locale, 'recogniseAbout') }, experience: 'basic', moments: [], steps: round.steps,
        };
        set({ round, run: startLesson(pseudo, player, round.steps[stepIndex - 1]!.id) });
      },

      report(e) { const run = get().run; if (run) set({ run: run.report(e) }); },

      async next() {
        const { run, player, round } = get();
        if (!run || !player || run.gate || tooSoon()) return;
        if (run.done) {
          set({ run: null, round: null });
          if (round) { say('roundFinished'); return; }
          await savePlayer(finishLesson(player, run.lesson));
          say('lessonFinished');
          return;
        }
        const nextRun = run.next();
        if (round) { set({ run: nextRun }); return; }
        const saved = recordStep(player, nextRun);
        set({ run: nextRun.withProfile(saved) });
        await savePlayer(saved);
      },

      async back() { const run = get().run; if (run && !tooSoon()) set({ run: run.back() }); },
      leave() { set({ run: null, round: null }); },
      dismissToast() { set({ toast: null }); },

      lessonList() { return lessonsOf(get().player); },
      libraryList() { return deps.library[get().player?.locale ?? 'pl'] ?? []; },
      recogniseUnlocked() {
        const p = get().player;
        if (!p) return false;
        const done = new Set(Object.entries(p.progress).filter(([, r]) => r.done).map(([k]) => k as LessonId));
        return roundUnlocked(lessonsOf(p), done);
      },
      async exportPlayer() { const p = get().player; return p ? profiles.export(p.id) : null; },
      async importPlayer(file) {
        try { await profiles.import(file); set({ players: await profiles.list() }); say('imported'); }
        catch { say('importFailed'); }
      },
    };
  });
}

export type AppStore = ReturnType<typeof createAppStore>;
