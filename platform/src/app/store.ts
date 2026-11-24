/**
 * The app's state over the core: the players on this device, the current player, the running lesson
 * or Recognise round, and a toast. Every change to progress is saved through the ProfileStore.
 * No chess or lesson rule lives here: actions call the core.
 */
import { createStore } from 'zustand/vanilla';
import type { AgeBand, Avatar, Lesson, LessonId, LibraryEntry, Locale, Profile } from '@core/types';
import { createLocalProfileStore, defaultProfile, migratePocProgress, type ProfileSummary, type StorageLike } from '@core/storage/index';
import { startLesson, type LessonEvent, type LessonRun } from '@core/lessons/run';
import { recordStep, finishLesson, resumeStepId } from '@core/lessons/progress';
import { buildRound, type Round } from '@core/recognition';
import { t } from '@core/i18n/index';

export const POC_KEY = 'chess-views:lessons';
const MIGRATED_KEY = 'chess-views:poc-migrated';
export const ROUND_LESSON_ID = 'recognise';

export interface AppState {
  players: ProfileSummary[];
  player: Profile | null;
  run: LessonRun | null;
  round: Round | null;
  toast: string | null;
  loadPlayers(): Promise<void>;
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
}

export interface StoreDeps {
  storage: StorageLike | undefined;
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

  return createStore<AppState>()((set, get) => {
    const say = (key: Parameters<typeof t>[1]) => set({ toast: t(get().player?.locale ?? 'pl', key) });
    const savePlayer = async (p: Profile) => { await profiles.save(p); set({ player: p, players: await profiles.list() }); };

    return {
      players: [], player: null, run: null, round: null, toast: null,

      async loadPlayers() { set({ players: await profiles.list() }); },

      async addPlayer(opts) {
        let p = defaultProfile(opts);
        const raw = read(POC_KEY);
        if (raw && !read(MIGRATED_KEY) && (await profiles.list()).length === 0) {
          try { p = { ...p, progress: migratePocProgress(JSON.parse(raw), deps.pocStepIds) }; } catch { /* unreadable: start fresh */ }
          write(MIGRATED_KEY, '1');
        }
        await savePlayer(p);
      },

      async pickPlayer(id) {
        const p = await profiles.load(id);
        set({ player: p, run: null, round: null });
      },

      async updatePlayer(patch) {
        const p = get().player;
        if (!p) return;
        await savePlayer({ ...p, ...patch, theme: { ...p.theme, ...(patch.theme ?? {}) } });
      },

      async removePlayer(id) {
        await profiles.remove(id);
        const players = await profiles.list();
        set({ players, ...(get().player?.id === id ? { player: null, run: null, round: null } : {}) });
      },

      async openLesson(id, stepId) {
        const player = get().player;
        const lesson = lessonsOf(player).find((l) => l.id === id);
        if (!player || !lesson) { set({ run: null, round: null }); say('lessonNotHere'); return; }
        const run = startLesson(lesson, player, stepId ?? resumeStepId(player, lesson));
        set({ run, round: null });
        await savePlayer(recordStep(player, run));
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
        if (!run || !player || run.gate) return;
        if (run.done) {
          set({ run: null, round: null });
          if (round) { say('roundFinished'); return; }
          await savePlayer(finishLesson(player, run.lesson));
          say('lessonFinished');
          return;
        }
        const nextRun = run.next();
        set({ run: nextRun });
        if (!round) await savePlayer(recordStep(player, nextRun));
      },

      async back() { const run = get().run; if (run) set({ run: run.back() }); },
      leave() { set({ run: null, round: null }); },
      dismissToast() { set({ toast: null }); },
    };
  });
}

export type AppStore = ReturnType<typeof createAppStore>;
