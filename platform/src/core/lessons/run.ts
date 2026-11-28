/**
 * A lesson in progress, as an immutable value. The UI reports what happened (the viewer's ply, an
 * answer, an option toggled) and gets a new run back. Gates: a hidden move must be revealed (a ply past
 * the step's), then the question must be answered, then a playTo step must be played up to its move. Steps outside the profile's audience are skipped.
 */
import type { BoardLook, Lesson, OptionId, Profile, Square, Step } from '../types';
import { lessonOptions, unlockedOptions } from './unlock';
import { isBlocks } from '../scene';
import { OPTIONS, optionStates, toggle, turnOff, type OptionState } from '../look';

export type Gate = { kind: 'reveal' | 'answer' | 'play' };
export type LessonEvent =
  | { kind: 'toggle'; option: OptionId }
  | { kind: 'ply'; ply: number }
  | { kind: 'answer'; value: number | Square };

export interface LessonRun {
  lesson: Lesson; step: Step; index: number; total: number;
  gate: Gate | null; done: boolean;
  answered: boolean; lastAnswer: 'right' | 'wrong' | null; wrong: (number | Square)[];
  ply: number;
  /** What the board shows now: the step's look, then the child's changes. */
  look: BoardLook;
  /** Whether the board is turned (the step's flip, then the child's). */
  flip: boolean;
  /** The picker's buttons: the lesson's options, each on or off, locked or blocked. Square names stay with the app. */
  options: OptionState[];
  /** A blocks question is open: the picker cannot be used. */
  frozen: boolean;
  report(e: LessonEvent): LessonRun;
  /** The same run with an up-to-date profile (after progress unlocked more layers). */
  withProfile(profile: Profile): LessonRun;
  next(): LessonRun;
  back(): LessonRun;
}

interface State { lesson: Lesson; profile: Profile; steps: Step[]; index: number; revealed: boolean; answered: boolean; lastAnswer: 'right' | 'wrong' | null; wrong: (number | Square)[]; ply: number; played: boolean; look: BoardLook; flip: boolean }

const plyOf = (s: Step) => (s.scene.position.kind === 'pgn' ? s.scene.position.ply : 0);

function isRight(step: Step, value: number | Square): boolean {
  const q = step.question;
  if (!q) return false;
  if (q.kind === 'choice') return value === q.answer;
  if (q.kind === 'tap') return typeof value === 'string' && (q.squares as string[]).includes(value);
  return value === (q.answer === 'yes' ? 0 : 1);       // recall: 0 = Yes, 1 = No
}

/** While a question is open: no locked options, no engine, and no pieces on a blocks board. */
function whileOpen(step: Step, look: BoardLook): BoardLook {
  if (!step.question && !step.solve) return look;
  let out = turnOff(look, 'engine');
  if (!step.question) return out;
  for (const id of step.scene.locked ?? []) out = turnOff(out, id);
  if (isBlocks(step) && out.pieces === 'pieces') out = { ...out, pieces: step.scene.look.pieces === 'pieces' ? 'blocks' : step.scene.look.pieces };
  return out;
}

function fresh(base: Omit<State, 'revealed' | 'answered' | 'lastAnswer' | 'wrong' | 'ply' | 'played' | 'look' | 'flip'>): State {
  const step = base.steps[base.index]!;
  return { ...base, revealed: false, answered: false, lastAnswer: null, wrong: [], ply: plyOf(step), played: false, look: whileOpen(step, step.scene.look), flip: !!step.scene.flip };
}

/** A right answer on a blocks board: pieces back, the child's drawings kept, an empty group takes the step's own. */
function afterAnswer(step: Step, look: BoardLook): BoardLook {
  if (!isBlocks(step)) {
    let out = look;
    for (const id of step.scene.locked ?? []) if (!out.diamond) out = fill(out, id, step);
    return out;
  }
  const own = step.scene.look;
  const out: BoardLook = { ...look, pieces: 'pieces' };
  if (out.diamond) return out;
  return { ...out, ...(out.moves ? {} : own.moves ? { moves: own.moves } : {}), ...(out.strategy ? {} : own.strategy ? { strategy: own.strategy } : {}) };
}

/** A locked option of the step comes back after the answer when its group is empty. */
function fill(look: BoardLook, id: OptionId, step: Step): BoardLook {
  const own = step.scene.look;
  if (OPTIONS[id].group === 'moves' && !look.moves && own.moves === id) return { ...look, moves: id };
  if (OPTIONS[id].group === 'strategy' && !look.strategy && own.strategy === id) return { ...look, strategy: id };
  return look;
}

const optionsOfStep = (step: Step): OptionId[] => {
  const l = step.scene.look;
  return [l.pieces, l.moves, l.strategy, l.diamond ? 'diamond' : undefined, l.engine ? 'engine' : undefined].filter((x): x is OptionId => !!x);
};

function make(s: State): LessonRun {
  const step = s.steps[s.index]!;
  // The hidden move stays revealed once the viewer has gone past it, even after stepping back.
  const gate: Gate | null = step.solve && !s.revealed ? { kind: 'reveal' }
    : step.question && !s.answered ? { kind: 'answer' }
    : step.playTo !== undefined && !s.played ? { kind: 'play' } : null;
  const last = s.index === s.steps.length - 1;
  const unlocked = unlockedOptions(s.profile, [s.lesson]);
  const own = new Set<OptionId>([...optionsOfStep(step)]);
  const busy = gate?.kind === 'answer' || gate?.kind === 'reveal';
  const open = (id: OptionId) => OPTIONS[id].always || unlocked.has(id) || own.has(id);
  // While a question or task is open: no engine, no step-locked option, and no drawing the step does not show
  // itself (it could give the answer away). These show disabled, not 🔒: the child has them, just not now.
  const drawing = (id: OptionId) => OPTIONS[id].group === 'moves' || OPTIONS[id].group === 'strategy';
  const ownDrawing = (id: OptionId) => step.scene.look.moves === id || step.scene.look.strategy === id;
  const heldBack = (id: OptionId) => busy && (id === 'engine' || (step.scene.locked ?? []).includes(id) || (drawing(id) && !ownDrawing(id)));
  const usable = (id: OptionId) => open(id) && !heldBack(id);
  const frozen = isBlocks(step) && !!step.question && !s.answered;
  const options = optionStates(s.look, { flip: s.flip, names: false }, lessonOptions(s.lesson), open)
    .map((o) => (heldBack(o.id) && !o.locked ? { ...o, blocked: true } : o));
  const run: LessonRun = {
    lesson: s.lesson, step, index: s.index, total: s.steps.length, gate, done: last && !gate,
    answered: s.answered, lastAnswer: s.lastAnswer, wrong: s.wrong.slice(), ply: s.ply,
    look: s.look, flip: s.flip, options, frozen,
    withProfile: (profile) => make({ ...s, profile }),
    report(e) {
      if (e.kind === 'ply') return make({ ...s, ply: e.ply, revealed: s.revealed || e.ply > plyOf(step), played: s.played || (step.playTo !== undefined && e.ply >= step.playTo) });
      if (e.kind === 'toggle') {
        const shown = options.find((o) => o.id === e.option);
        if (frozen || !shown || shown.blocked || !usable(e.option)) return run;
        if (e.option === 'flip') return make({ ...s, flip: !s.flip });
        if (e.option === 'names') return run;
        const look = toggle(s.look, e.option);
        return make({ ...s, look: busy ? whileOpen(step, look) : look });
      }
      if (s.answered || !step.question || gate?.kind === 'reveal') return run;   // reveal the hidden move first
      return isRight(step, e.value)
        ? make({ ...s, answered: true, lastAnswer: 'right', look: afterAnswer(step, s.look) })
        : make({ ...s, lastAnswer: 'wrong', wrong: s.wrong.includes(e.value) ? s.wrong : [...s.wrong, e.value] });
    },
    next: () => (gate || last ? run : make(fresh({ ...s, index: s.index + 1 }))),
    back: () => (s.index === 0 ? run : make(fresh({ ...s, index: s.index - 1 }))),
  };
  return run;
}

/** The lesson for this profile, at step `at` if given; null when none of its steps is for this profile. */
export function startLesson(lesson: Lesson, profile: Profile, at?: string): LessonRun | null {
  const steps = lesson.steps.filter((st) => {
    const a = st.audience;
    return (!a?.ages || a.ages.includes(profile.age)) && (!a?.experience || a.experience.includes(profile.experience));
  });
  if (!steps.length) return null;
  const found = at ? steps.findIndex((st) => st.id === at) : -1;
  return make(fresh({ lesson, profile, steps, index: Math.max(0, found) }));
}
