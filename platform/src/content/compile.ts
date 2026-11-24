/**
 * The content compiler: every lesson file of every locale and the library, parsed, resolved,
 * replayed with the rules adapter and checked; then the locales are compared (same lessons, steps,
 * positions and answers). Every problem is a ContentError with the file and the line.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { loadGame, ChessError } from '@core/chess/rules';
import {
  LOCALES, LessonSchema, LibraryEntrySchema, StepSchema, PositionSourceSchema,
  type AgedText, type Lesson, type LibraryEntry, type Locale, type Moment, type PositionSource, type Question, type Step,
} from '@core/types';
import { parseLesson, type RawLesson, type RawQuestion, type RawStep } from './parse';
import { resolvePosition, sceneOf, asList, type LibraryPositions } from './resolve';
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

function compileLibrary(root: string, errors: ContentError[]): { positions: LibraryPositions; entries: Record<Locale, LibraryEntry[]> } {
  const positions: LibraryPositions = new Map();
  const entries = Object.fromEntries(LOCALES.map((l) => [l, [] as LibraryEntry[]])) as Record<Locale, LibraryEntry[]>;
  const file = join(root, 'library.yaml');
  if (!existsSync(file)) return { positions, entries };
  const shared = (parseYaml(readFileSync(file, 'utf8')) ?? []) as { id: string; tags: string[]; source: unknown; scene?: unknown }[];
  shared.forEach((e, i) => {
    const src = PositionSourceSchema.safeParse(e.source);
    if (!src.success) { errors.push({ file, line: i + 1, message: `${e.id}: ${zodMessage(src.error.issues)}` }); return; }
    positions.set(e.id, src.data);
  });
  for (const locale of LOCALES) {
    const wfile = join(root, locale, 'library.yaml');
    const words = existsSync(wfile) ? ((parseYaml(readFileSync(wfile, 'utf8')) ?? {}) as Record<string, { name?: string; note?: unknown }>) : {};
    for (const e of shared) {
      const w = words[e.id];
      if (!w) { errors.push({ file: wfile, line: 1, message: `no name and note for library entry "${e.id}"` }); continue; }
      const parsed = LibraryEntrySchema.safeParse({ id: e.id, tags: e.tags, name: w.name, note: aged(w.note), source: positions.get(e.id), ...(e.scene ? { scene: e.scene } : {}) });
      if (parsed.success) entries[locale].push(parsed.data);
      else errors.push({ file: wfile, line: 1, message: `${e.id}: ${zodMessage(parsed.error.issues)}` });
    }
  }
  return { positions, entries };
}

function compileQuestion(q: RawQuestion, momentIds: Set<string>, file: string, errors: ContentError[]): Question | null {
  const prompt = q.prompt as AgedText;
  const right = Object.keys(q.right).length ? { right: q.right as AgedText } : {};
  const bad = (message: string) => { errors.push({ file, line: q.line, message }); return null; };
  if (q.attrs.recall !== undefined) {
    const moment = String(q.attrs.recall);
    if (!momentIds.has(moment)) return bad(`no moment "${moment}"`);
    const answer = q.attrs.answer === true || q.attrs.answer === 'yes' ? 'yes' : q.attrs.answer === false || q.attrs.answer === 'no' ? 'no' : null;
    if (!answer) return bad('a recall question needs answer: yes or no');
    return { kind: 'recall', moment: moment as never, answer, ...right };
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
    const recall = s.question?.attrs.recall;
    const recallYes = recall !== undefined && (s.question?.attrs.answer === true || s.question?.attrs.answer === 'yes') ? String(recall) : null;
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
    const ages = asList(s.attrs.ages);
    const candidate = {
      id: s.id,
      scene: sceneOf(s.attrs, position, recall !== undefined),
      explain: s.explain,
      ...(s.attrs.moment !== undefined ? { moment: String(s.attrs.moment) } : {}),
      ...(s.attrs.solve !== undefined ? { solve: { task: aged(s.attrs.solve) } } : {}),
      ...(question ? { question } : {}),
      ...(ages.length ? { audience: { ages } } : {}),
    };
    if (candidate.moment !== undefined && !momentIds.has(candidate.moment)) { err(`no moment "${candidate.moment}"`); continue; }
    const parsed = StepSchema.safeParse(candidate);
    if (!parsed.success) {
      const onQuestion = parsed.error.issues[0]?.path[0] === 'question';
      err(zodMessage(parsed.error.issues), onQuestion && s.question ? s.question.line : s.line);
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
    if (`${game}: ${name}`.length > 32) errors.push({ file, line, message: `the round answer "${game}: ${name}" is longer than 32 characters` });
    moments.push({ id: id as never, name, board, ...(mm.looksLike ? { looksLike: asList(mm.looksLike) as never } : {}) });
  }

  if (errors.length > before) return { lesson: null, origin };
  const parsed = LessonSchema.safeParse({
    id: m.id, group: m.group, title: m.title, about: aged(m.about), ...(m.game ? { game: m.game } : {}),
    experience: m.experience ?? 'basic', moments, steps,
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
      files[locale].set(id, path);
      const { lesson, origin } = compileLesson(raw, positions, replay, errors);
      origins[locale].set(id, origin);
      if (lesson) lessons[locale].push(lesson); else broken.add(id);
    }
  }
  errors.push(...compareLocales(lessons, origins, files, broken));
  return { lessons, library: entries, errors };
}
