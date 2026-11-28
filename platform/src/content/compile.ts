/**
 * The content compiler: every lesson file of every locale and the library, parsed, resolved,
 * replayed with the rules adapter and checked; then the locales are compared (same lessons, steps,
 * positions and answers). Every problem is a ContentError with the file and the line.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { loadGame, ChessError } from '@core/chess/rules';
import {
  ANSWER_MAX, FAMILIES, LOCALES, ROOMS, LessonSchema, LibraryEntrySchema, StepSchema, PositionSourceSchema,
  type AgedText, type BoardLook, type Lesson, type LibraryEntry, type Locale, type Moment, type PositionSource, type Question, type Step,
} from '@core/types';
import { parseLesson, type RawLesson, type RawQuestion, type RawStep } from './parse';
import { resolvePosition, sceneOf, lookOf, asList, type LibraryPositions } from './resolve';
import { compareLocales } from './check';

export interface ContentError { file: string; line: number; message: string }
export interface Compiled { lessons: Record<Locale, Lesson[]>; library: Record<Locale, LibraryEntry[]>; errors: ContentError[] }

/** Where each compiled lesson and step came from, for errors found after compiling (the locale comparison). */
export interface Origin { file: string; line: number; steps: Map<string, { line: number; questionLine?: number }> }

const aged = (v: unknown): AgedText | undefined => {
  if (typeof v === 'string' && v.trim()) return { kids: v.trim() };
  if (v && typeof v === 'object') return v as AgedText;
  return undefined;
};

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).sort().flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : name.endsWith('.md') ? [p] : [];
  });
}

const zodMessage = (issues: { path: PropertyKey[]; message: string }[]) => {
  const i = issues[0];
  return i ? `${i.path.map(String).join('.') || 'value'}: ${i.message}` : 'invalid';
};

/** Replays positions; a PGN that does not replay is reported at its first use only, not at every step that reuses it. */
function replayer() {
  const failedPgn = new Set<string>();
  return (src: PositionSource): { error: string | null; first: boolean } => {
    try { loadGame(src); return { error: null, first: true }; } catch (e) {
      const msg = e instanceof ChessError ? e.message : String(e);
      if (src.kind === 'pgn' && /does not replay/.test(msg)) {
        const first = !failedPgn.has(src.pgn);
        failedPgn.add(src.pgn);
        return { error: msg, first };
      }
      return { error: msg, first: true };
    }
  };
}

/** The line of `<marker>` in a YAML text (1-based), or 1. */
const STEP_KEYS = ['scene', 'fen', 'pgn', 'ply', 'pos', 'same', 'focus', 'flip', 'locked', 'moment', 'solve', 'playTo', 'ages'];
const QUESTION_KEYS = ['recall', 'answer', 'tap'];
const POSITION_KEYS = ['fen', 'pgn', 'pos', 'same'];

/** A step's schema failure in words a lesson writer understands, naming the bad value where there is one. */
function stepMessage(issues: { path: PropertyKey[]; message: string }[], candidate: unknown): string {
  const path = issues[0]?.path ?? [];
  const value = path.reduce<unknown>((v, k) => (v && typeof v === 'object' ? (v as Record<PropertyKey, unknown>)[k] : undefined), candidate);
  const [a, b] = path;
  if (a === 'scene' && b === 'focus') return `"${String(value)}" is not a square (a1 to h8)`;
  if (a === 'scene' && b === 'locked') return `unknown option "${String(value)}"`;
  if (a === 'audience') return `unknown age "${String(value)}" (use kids, teens or adults)`;
  return zodMessage(issues);
}

const lineIn = (text: string, re: RegExp) => { const i = text.split('\n').findIndex((l) => re.test(l)); return i < 0 ? 1 : i + 1; };
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&');

function readYaml(file: string, errors: ContentError[]): { text: string; data: unknown } | null {
  if (!existsSync(file)) return null;
  const text = readFileSync(file, 'utf8');
  try { return { text, data: parseYaml(text) }; }
  catch (e) { errors.push({ file, line: 1, message: `not valid YAML: ${(e as Error).message.split('\n')[0]}` }); return null; }
}

function compileLibrary(root: string, errors: ContentError[]): { positions: LibraryPositions; entries: Record<Locale, LibraryEntry[]> } {
  const positions: LibraryPositions = new Map();
  const entries = Object.fromEntries(LOCALES.map((l) => [l, [] as LibraryEntry[]])) as Record<Locale, LibraryEntry[]>;
  const file = join(root, 'library.yaml');
  const read = readYaml(file, errors);
  if (!read) return { positions, entries };
  if (!Array.isArray(read.data)) { errors.push({ file, line: 1, message: 'library.yaml must be a list of entries (- id: …)' }); return { positions, entries }; }
  const shared: { id: string; tags: string[]; look?: BoardLook; room: unknown; family?: unknown }[] = [];
  for (const raw of read.data as Record<string, unknown>[]) {
    const id = String(raw?.id ?? '');
    const line = lineIn(read.text, new RegExp(`^-\\s+id:\\s*${esc(id)}\\s*$`));
    if (positions.has(id) || shared.some((e) => e.id === id)) { errors.push({ file, line, message: `library id "${id}" is used twice` }); continue; }
    const src = PositionSourceSchema.safeParse(raw?.source);
    if (!src.success) { errors.push({ file, line, message: `${id}: ${zodMessage(src.error.issues)}` }); continue; }
    try { loadGame(src.data); } catch (e) { errors.push({ file, line, message: `${id}: ${(e as Error).message}` }); continue; }
    if (raw.room === undefined) { errors.push({ file, line, message: `${id}: needs a room (one of ${ROOMS.join(', ')})` }); continue; }
    if (!(ROOMS as readonly unknown[]).includes(raw.room)) { errors.push({ file, line, message: `${id}: unknown room "${String(raw.room)}" (use ${ROOMS.join(', ')})` }); continue; }
    const badFamily = asList(raw.family).find((f) => !(FAMILIES as readonly string[]).includes(f));
    if (badFamily !== undefined) { errors.push({ file, line, message: `${id}: unknown family "${badFamily}" (known: ${FAMILIES.join(', ')})` }); continue; }
    const look = raw.scene !== undefined ? lookOf(String(raw.scene)) : undefined;
    if (typeof look === 'string') { errors.push({ file, line, message: `${id}: ${look}` }); continue; }
    positions.set(id, src.data);
    shared.push({ id, tags: raw.tags as string[], ...(look ? { look } : {}), room: raw.room, ...(raw.family !== undefined ? { family: asList(raw.family) } : {}) });
  }
  for (const locale of LOCALES) {
    const wfile = join(root, locale, 'library.yaml');
    const wread = readYaml(wfile, errors);
    const words = (wread && wread.data && typeof wread.data === 'object' && !Array.isArray(wread.data) ? wread.data : {}) as Record<string, { name?: string; note?: unknown }>;
    if (wread && words !== wread.data) errors.push({ file: wfile, line: 1, message: 'the library words must be a map: <id>: { name, note }' });
    for (const id of Object.keys(words)) {
      if (!positions.has(id) && !shared.some((e) => e.id === id)) errors.push({ file: wfile, line: lineIn(wread!.text, new RegExp(`^${esc(id)}:`)), message: `words for "${id}", which is not in library.yaml` });
    }
    for (const e of shared) {
      const w = words[e.id];
      if (!w) { errors.push({ file: wfile, line: 1, message: `no name and note for library entry "${e.id}"` }); continue; }
      const parsed = LibraryEntrySchema.safeParse({ id: e.id, tags: e.tags, name: w.name, note: aged(w.note), source: positions.get(e.id), ...(e.look ? { look: e.look } : {}), room: e.room, ...(e.family ? { family: e.family } : {}) });
      if (parsed.success) entries[locale].push(parsed.data);
      else errors.push({ file: wfile, line: wread ? lineIn(wread.text, new RegExp(`^${esc(e.id)}:`)) : 1, message: `${e.id}: ${zodMessage(parsed.error.issues)}` });
    }
  }
  return { positions, entries };
}

function compileQuestion(q: RawQuestion, momentIds: Set<string>, file: string, errors: ContentError[]): Question | null {
  const prompt = q.prompt as AgedText;
  const right = Object.keys(q.right).length ? { right: q.right as AgedText } : {};
  const bad = (message: string) => { errors.push({ file, line: q.line, message }); return null; };
  if ((q.attrs.recall !== undefined || q.attrs.tap !== undefined) && q.choices.length) return bad('choices (- …) belong only to a choice question');
  if (q.attrs.recall !== undefined) {
    const moment = String(q.attrs.recall);
    if (!momentIds.has(moment)) return bad(`no moment "${moment}"`);
    const answer = q.attrs.answer === true || q.attrs.answer === 'yes' ? 'yes' : q.attrs.answer === false || q.attrs.answer === 'no' ? 'no' : null;
    if (!answer) return bad('a recall question needs answer: yes or no');
    return { kind: 'recall', ...(prompt.kids ? { prompt } : {}), moment: moment as never, answer, ...right };
  }
  if (q.attrs.tap !== undefined) return { kind: 'tap', prompt, squares: asList(q.attrs.tap) as never, ...right };
  const rights = q.choices.filter((c) => c.right).length;
  if (rights !== 1) return bad(`a choice question needs exactly one right choice (- [x]), found ${rights}`);
  return { kind: 'choice', prompt, choices: q.choices.map((c) => c.text), answer: q.choices.findIndex((c) => c.right), ...right };
}

function compileLesson(raw: RawLesson, library: LibraryPositions, replay: ReturnType<typeof replayer>, errors: ContentError[]): { lesson: Lesson | null; origin: Origin } {
  const file = raw.file;
  const origin: Origin = { file, line: 1, steps: new Map() };
  const before = errors.length;
  const m = raw.meta;
  const lessonPgn = typeof m.pgn === 'string' ? m.pgn : null;
  const momentsRaw = (m.moments ?? {}) as Record<string, Record<string, unknown>>;
  const momentIds = new Set(Object.keys(momentsRaw));
  const momentBoards = new Map<string, PositionSource>();
  for (const [id, mm] of Object.entries(momentsRaw)) {
    const p = resolvePosition(mm, { lessonPgn, previous: null, library, momentBoard: () => null }, null);
    if (typeof p !== 'string') momentBoards.set(id, p);
  }

  const steps: Step[] = [];
  let previous: PositionSource | null = null;
  const ids = new Set<string>();
  for (const s of raw.steps as RawStep[]) {
    const where = { line: s.line, ...(s.question ? { questionLine: s.question.line } : {}) };
    origin.steps.set(s.id, where);
    const err = (message: string, line = s.line) => errors.push({ file, line, message });
    if (ids.has(s.id)) { err(`step id "${s.id}" is used twice`); continue; }
    ids.add(s.id);
    const unknown = Object.keys(s.attrs).find((k) => !STEP_KEYS.includes(k));
    if (unknown) { err(`unknown attribute "${unknown}" (a step takes ${STEP_KEYS.join(', ')})`); continue; }
    const qUnknown = s.question ? Object.keys(s.question.attrs).find((k) => !QUESTION_KEYS.includes(k)) : undefined;
    if (qUnknown) { err(`unknown attribute "${qUnknown}" (a question takes ${QUESTION_KEYS.join(', ')})`, s.question!.line); continue; }
    const given = POSITION_KEYS.filter((k) => s.attrs[k] !== undefined && s.attrs[k] !== false);
    if (given.length > 1) { err(`a step has only one position: use one of ${POSITION_KEYS.join(', ')} (this one has ${given.join(' and ')})`); continue; }
    const recall = s.question?.attrs.recall;
    const recallYes = recall !== undefined && (s.question?.attrs.answer === true || s.question?.attrs.answer === 'yes') ? String(recall) : null;
    const own = [...given, ...(s.attrs.ply !== undefined ? ['ply'] : [])];
    if (recallYes !== null && own.length) { err(`a recall question with answer yes shows its moment's board: remove the step's own position (${own.join(', ')})`); continue; }
    if (recallYes !== null && !momentIds.has(recallYes)) { err(`no moment "${recallYes}"`, s.question!.line); continue; }
    const position = resolvePosition(s.attrs, { lessonPgn, previous, library, momentBoard: (id) => momentBoards.get(id) ?? null }, recallYes);
    if (typeof position === 'string') { err(position); continue; }
    const r = replay(position);
    if (r.error) { if (r.first) err(r.error); previous = position; continue; }
    previous = position;
    const question = s.question ? compileQuestion(s.question, momentIds, file, errors) : null;
    if (s.question && !question) continue;
    if (s.attrs.solve !== undefined) {
      if (position.kind !== 'pgn') { err('a solve step needs a pgn position'); continue; }
      const len = loadGame({ ...position, ply: 0 }).length;
      if (position.ply >= len) { err(`a solve step needs a move after ply ${position.ply}`); continue; }
    }
    if (s.attrs.playTo !== undefined) {
      const to = Number(s.attrs.playTo);
      if (position.kind !== 'pgn') { err('a playTo step needs a pgn position'); continue; }
      const len = loadGame({ ...position, ply: 0 }).length;
      if (!Number.isInteger(to) || to <= position.ply || to > len) { err(`playTo ${String(s.attrs.playTo)} must be a move after ply ${position.ply} and at most ${len}`); continue; }
    }
    const ages = asList(s.attrs.ages);
    const candidate = {
      id: s.id,
      scene: sceneOf(s.attrs, position, recall !== undefined),
      explain: s.explain,
      ...(s.attrs.moment !== undefined ? { moment: String(s.attrs.moment) } : {}),
      ...(s.attrs.solve !== undefined ? { solve: { task: aged(s.attrs.solve) } } : {}),
      ...(s.attrs.playTo !== undefined ? { playTo: Number(s.attrs.playTo) } : {}),
      ...(question ? { question } : {}),
      ...(ages.length ? { audience: { ages } } : {}),
    };
    if (typeof candidate.scene === 'string') { err(candidate.scene); continue; }
    if (candidate.moment !== undefined && !momentIds.has(candidate.moment)) { err(`no moment "${candidate.moment}"`); continue; }
    if (recall !== undefined && candidate.scene.look.pieces === 'pieces') { err('a recall step is a blocks board: its scene must not show pieces (use scene: blocks)'); continue; }
    const parsed = StepSchema.safeParse(candidate);
    if (!parsed.success) {
      const onQuestion = parsed.error.issues[0]?.path[0] === 'question';
      err(stepMessage(parsed.error.issues, candidate), onQuestion && s.question ? s.question.line : s.line);
      continue;
    }
    steps.push(parsed.data);
  }

  const moments: Moment[] = [];
  for (const [id, mm] of Object.entries(momentsRaw)) {
    const line = raw.metaLine(id);
    const board = momentBoards.get(id);
    if (!board) { const p = resolvePosition(mm, { lessonPgn, previous: null, library, momentBoard: () => null }, null); errors.push({ file, line, message: `moment ${id}: ${typeof p === 'string' ? p : 'no board'}` }); continue; }
    const r = replay(board);
    if (r.error) { if (r.first) errors.push({ file, line, message: `moment ${id}: ${r.error}` }); continue; }
    const name = String(mm.name ?? '');
    const game = typeof m.game === 'string' ? m.game : String(m.title ?? '');
    if (`${game}: ${name}`.length > ANSWER_MAX) errors.push({ file, line, message: `the round answer "${game}: ${name}" is longer than ${ANSWER_MAX} characters` });
    moments.push({ id: id as never, name, board, ...(mm.looksLike ? { looksLike: asList(mm.looksLike) as never } : {}) });
  }

  if (m.library !== undefined && !library.has(String(m.library))) errors.push({ file, line: raw.metaLine('library'), message: `no library entry "${String(m.library)}" for this lesson's board` });
  const badFamily = asList(m.family).find((f) => !(FAMILIES as readonly string[]).includes(f));
  if (badFamily !== undefined) errors.push({ file, line: raw.metaLine('family'), message: `unknown family "${badFamily}" (known: ${FAMILIES.join(', ')})` });
  if (errors.length > before) return { lesson: null, origin };
  const parsed = LessonSchema.safeParse({
    id: m.id, group: m.group, title: m.title, about: aged(m.about), ...(m.game ? { game: m.game } : {}),
    experience: m.experience ?? 'basic', moments, steps,
    ...(m.library !== undefined ? { library: String(m.library) } : {}), ...(m.family !== undefined ? { family: asList(m.family) } : {}),
  });
  if (!parsed.success) { errors.push({ file, line: 1, message: zodMessage(parsed.error.issues) }); return { lesson: null, origin }; }
  return { lesson: parsed.data, origin };
}

export function compileContent(root: string): Compiled {
  const errors: ContentError[] = [];
  const { positions, entries } = compileLibrary(root, errors);
  const lessons = Object.fromEntries(LOCALES.map((l) => [l, [] as Lesson[]])) as Record<Locale, Lesson[]>;
  const origins = Object.fromEntries(LOCALES.map((l) => [l, new Map<string, Origin>()])) as Record<Locale, Map<string, Origin>>;
  const broken = new Set<string>();   // lesson ids with errors in any locale: not compared
  const files = Object.fromEntries(LOCALES.map((l) => [l, new Map<string, string>()])) as Record<Locale, Map<string, string>>;
  for (const locale of LOCALES) {
    const replay = replayer();
    for (const path of walk(join(root, locale))) {
      const { lesson: raw, errors: pe } = parseLesson(path, readFileSync(path, 'utf8'));
      errors.push(...pe);
      const id = raw ? String(raw.meta.id ?? '') : '';
      if (!raw || pe.length) { broken.add(id); continue; }
      const first = files[locale].get(id);
      if (first !== undefined) { errors.push({ file: path, line: 1, message: `lesson id "${id}" is used twice (also in ${relative(root, first)})` }); broken.add(id); continue; }
      files[locale].set(id, path);
      const { lesson, origin } = compileLesson(raw, positions, replay, errors);
      origins[locale].set(id, origin);
      if (lesson) lessons[locale].push(lesson); else broken.add(id);
    }
  }
  // A looksLike names another moment as <lesson id>/<moment id>; it must exist in the same language.
  for (const locale of LOCALES) {
    const known = new Set(lessons[locale].flatMap((l) => l.moments.map((m) => `${l.id}/${m.id}`)));
    for (const l of lessons[locale]) for (const m of l.moments) for (const ref of m.looksLike ?? []) {
      if (known.has(ref)) continue;
      const file = files[locale].get(l.id)!;
      errors.push({ file, line: lineIn(readFileSync(file, 'utf8'), new RegExp(esc(ref))), message: `moment ${m.id}: looksLike "${ref}" is not a moment of any lesson (use <lesson id>/<moment id>)` });
    }
  }
  errors.push(...compareLocales(lessons, origins, files, broken));
  return { lessons, library: entries, errors };
}
