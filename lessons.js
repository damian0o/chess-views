// Pure rules for lessons: step text markup, the on-device progress record, resolving steps,
// which views a lesson has opened, and what still blocks "Next". No DOM.

// ---------- step text ----------

/** `**bold**` runs in a step's text → [{ text, strong }]; nothing else is interpreted. */
export function sayParts(say) {
  const out = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0, m;
  while ((m = re.exec(say))) {
    if (m.index > last) out.push({ text: say.slice(last, m.index), strong: false });
    out.push({ text: m[1], strong: true });
    last = m.index + m[0].length;
  }
  if (last < say.length) out.push({ text: say.slice(last), strong: false });
  return out;
}

// ---------- progress on the device ----------

export const PROGRESS_KEY = 'chess-views:lessons';

/**
 * Progress per lesson in a Storage-like object (the page passes localStorage).
 * Every call is wrapped: a missing, throwing or corrupt storage behaves as empty and writes are dropped.
 * `set` never lowers the step reached and never clears `done`; `reset` forgets the lesson.
 */
export function progressStore(storage) {
  const read = () => {
    try {
      const raw = storage && storage.getItem(PROGRESS_KEY);
      const data = raw ? JSON.parse(raw) : {};
      return data && typeof data === 'object' ? data : {};
    } catch { return {}; }
  };
  const write = (data) => { try { storage.setItem(PROGRESS_KEY, JSON.stringify(data)); } catch { /* storage unavailable: progress is session-only */ } };
  return {
    get(id) { const r = read()[id]; return r && Number.isInteger(r.step) ? { step: r.step, done: !!r.done } : null; },
    set(id, { step, done }) {
      const data = read();
      const prev = data[id] || { step: 0, done: false };
      data[id] = { step: Math.max(prev.step, step), done: prev.done || !!done };
      write(data);
    },
    reset(id) { const data = read(); delete data[id]; write(data); },
    all() { return read(); },
  };
}

// ---------- steps ----------

export const VIEW_TITLES = { board: 'Board', territory: 'Territory', reach: 'Reach', roads: 'Roads', kings: 'King houses', engine: 'Engine', diamond: 'Diamond', shapes: 'Shapes', knight: 'Knight' };
export const ALL_VIEWS = Object.keys(VIEW_TITLES);

/**
 * Turn a lesson's raw steps into concrete ones:
 * { index, source: {kind:'fen', fen} | {kind:'pgn', pgn, ply}, view, sq, solve, task, flip, shapesGate, say }.
 * `same: true` copies only the previous step's position (a step `ply` overrides); `pos` goes through
 * the library and never takes the entry's view. Throws on a missing entry.
 */
/** A `fen` / `pgn`+`ply` / `pos` field set → a source, or null when it has none of them. Throws on a missing entry. */
function directSource(raw, positions, where) {
  if (raw.fen) return { kind: 'fen', fen: raw.fen };
  if (raw.pgn) return { kind: 'pgn', pgn: raw.pgn, ply: raw.ply };
  if (raw.pos) {
    const entry = (positions || []).find((p) => p.id === raw.pos);
    if (!entry) throw new Error(`${where}: no library entry "${raw.pos}"`);
    return entry.fen ? { kind: 'fen', fen: entry.fen } : { kind: 'pgn', pgn: entry.pgn, ply: raw.ply ?? entry.ply };
  }
  return null;
}

/** A lesson's moments with their boards: [{ id, name, source, looksLike }]. */
export function resolveMoments(lesson, positions) {
  return (lesson.moments || []).map((m, i) => ({
    id: m.id, name: m.name, looksLike: m.looksLike || [],
    source: directSource(m, positions, `lesson ${lesson.id} moment ${i + 1}`),
  }));
}

export function resolveSteps(lesson, positions) {
  const out = [];
  const moments = resolveMoments(lesson, positions);
  lesson.steps.forEach((raw, i) => {
    const where = `lesson ${lesson.id} step ${i + 1}`;
    const moment = raw.moment !== undefined ? moments.find((m) => m.id === raw.moment) : null;
    if (raw.moment !== undefined && !moment) throw new Error(`${where}: no moment "${raw.moment}"`);
    let source = directSource(raw, positions, where);
    if (source) { /* given on the step */ }
    else if (raw.recall) source = { ...moment.source };
    else if (raw.same) {
      if (!out.length) throw new Error(`${where}: "same" on the first step`);
      source = { ...out[out.length - 1].source };
      if (raw.ply !== undefined && source.kind === 'pgn') source.ply = raw.ply;
    } else throw new Error(`${where}: no position`);
    const a = raw.ask;
    out.push({
      index: i + 1, source, view: raw.view, sq: raw.sq || null,
      solve: !!raw.solve, task: raw.solve ? raw.task || null : null,
      flip: !!raw.flip, shapesGate: !!(raw.shapes && raw.shapes.gate), say: raw.say || '',
      moment: moment ? { id: moment.id, name: moment.name } : null,
      ask: a ? { q: a.q, choices: a.choices || null, answer: a.choices ? a.answer : null, tap: a.tap || null, right: a.right || 'Right!' } : null,
      blocks: !!(raw.blocks || raw.recall),
    });
  });
  return out;
}

/** The views a lesson has introduced by step `index` (1-based); every view once the lesson is done. */
export function openViews(steps, index, done) {
  if (done) return new Set(ALL_VIEWS);
  return new Set(steps.slice(0, index).map((s) => s.view));
}

/** What still blocks Next on a step, or null: the view, the hidden move, the question, then the Shapes reveal. */
export function nextGate(step, now) {
  if (now.tab !== step.view) return { kind: 'view', text: `Open ${VIEW_TITLES[step.view] || step.view} first` };
  if (step.solve && step.source.kind === 'pgn' && !(now.ply > step.source.ply)) return { kind: 'reveal', text: 'Press ▶ first' };
  if (step.ask && !now.answered) return { kind: 'answer', text: 'Answer first' };
  if (step.shapesGate && !step.ask && !now.shapesReveal) return { kind: 'shapes', text: 'Press Reveal pieces first' };
  return null;
}

/** Is `value` (a choice index, or a tapped square) the right answer to `ask`? */
export function checkAnswer(ask, value) {
  if (typeof value === 'number') return Array.isArray(ask.choices) && ask.answer === value;
  return Array.isArray(ask.tap) && ask.tap.includes(value);
}

// ---------- validating a lesson ----------

const SQUARE = /^[a-h][1-8]$/;
const SLUG = /^[a-z0-9-]+$/;
const POSITION_KEYS = ['fen', 'pgn', 'pos', 'same'];

/**
 * Everything wrong with one lesson, as readable lines ("<id> step <n>: …" or "<id>: …"); [] when valid.
 * `Chess` is passed in (chess.js 1.0.0) so this module stays free of imports; every PGN is replayed.
 */
export function validateLesson(lesson, positions, Chess) {
  const out = [];
  const id = lesson.id;
  const plies = new Map();   // pgn text → number of moves, or -1 when it does not replay
  const replay = (pgn) => {
    if (!plies.has(pgn)) {
      try { const c = new Chess(); c.loadPgn(pgn); plies.set(pgn, c.history().length); } catch { plies.set(pgn, -1); }
    }
    return plies.get(pgn);
  };
  // A position field set → an error string or null. `allowSame` for steps only.
  const checkPosition = (raw, allowSame) => {
    const keys = POSITION_KEYS.filter((k) => k in raw && (k !== 'same' || allowSame));
    if (keys.length !== 1) return 'needs exactly one position (fen, pgn+ply, pos' + (allowSame ? ' or same' : '') + ')';
    let pgn = null, ply = raw.ply;
    if (raw.pos) {
      const entry = (positions || []).find((p) => p.id === raw.pos);
      if (!entry) return `no library entry "${raw.pos}"`;
      if (entry.pgn) { pgn = entry.pgn; ply = raw.ply ?? entry.ply; }
    } else if (raw.pgn) pgn = raw.pgn;
    if (pgn !== null) {
      if (!Number.isInteger(ply) || ply < 0) return 'a pgn needs an integer ply of 0 or more';
      const n = replay(pgn);
      if (n < 0) return 'the pgn does not replay';
      if (ply > n) return `ply ${ply} is beyond the game's ${n} moves`;
    }
    return null;
  };

  const moments = lesson.moments;
  const momentIds = new Set();
  if (moments !== undefined) {
    if (!Array.isArray(moments) || moments.length < 2 || moments.length > 4) out.push(`${id}: moments needs 2 to 4 entries`);
    if (!lesson.game) out.push(`${id}: moments need a game name`);
    (Array.isArray(moments) ? moments : []).forEach((m, i) => {
      const where = `${id} moment ${i + 1}`;
      if (!SLUG.test(m.id || '') || momentIds.has(m.id)) out.push(`${where}: needs a unique id`);
      momentIds.add(m.id);
      if (!m.name) out.push(`${where}: needs a name`);
      const p = checkPosition(m, false);
      if (p) out.push(`${where}: ${p}`);
      for (const k of m.looksLike || []) if (!/^[a-z0-9-]+\/[a-z0-9-]+$/.test(k)) out.push(`${where}: looksLike "${k}" is not lesson/moment`);
    });
  }

  let prevPgn = null, prevPly = null;
  lesson.steps.forEach((s, i) => {
    const where = `${id} step ${i + 1}`;
    const bad = (msg) => out.push(`${where}: ${msg}`);
    if (!ALL_VIEWS.includes(s.view)) bad(`unknown view ${s.view}`);
    if (s.sq && !SQUARE.test(s.sq)) bad(`bad square ${s.sq}`);
    if (typeof s.say !== 'string' || !s.say.length || s.say.length > 220) bad('say must be 1 to 220 characters');
    if (s.shapes && s.view !== 'shapes') bad('shapes options only on Shapes');
    if (s.moment !== undefined && !momentIds.has(s.moment)) bad(`no moment "${s.moment}"`);
    if (s.recall) {
      if (s.moment === undefined) bad('a recall step needs a moment');
      if (POSITION_KEYS.some((k) => k in s)) bad('a recall step shows its moment\'s board, not its own position');
      const a = s.ask;
      if (!a || JSON.stringify(a.choices) !== '["Yes","No"]' || a.answer !== 0) bad('a recall step asks Yes/No with Yes right');
    } else {
      if (i === 0 && s.same) bad('same is never first');
      const p = checkPosition(s, true);
      if (p) bad(p);
    }
    if ((s.blocks || s.recall) && (s.view !== 'shapes' || !s.ask)) bad('a blocks step is a question on Shapes');
    if (s.ask !== undefined) {
      const a = s.ask;
      if (typeof a.q !== 'string' || !a.q.length || a.q.length > 80) bad('a question is 1 to 80 characters');
      const hasChoices = 'choices' in a, hasTap = 'tap' in a;
      if (hasChoices === hasTap) bad('a question has choices or tap, not both');
      else if (hasChoices) {
        if (!Array.isArray(a.choices) || a.choices.length < 2 || a.choices.length > 4) bad('2 to 4 choices');
        else if (a.choices.some((c) => typeof c !== 'string' || !c.length || c.length > 32)) bad('each choice is 1 to 32 characters');
        else if (!Number.isInteger(a.answer) || a.answer < 0 || a.answer >= a.choices.length) bad('the answer is not one of the choices');
      } else if (!Array.isArray(a.tap) || !a.tap.length || a.tap.some((q) => !SQUARE.test(q))) bad('tap needs one or more squares');
      if (a.right !== undefined && (typeof a.right !== 'string' || a.right.length > 120)) bad('right is at most 120 characters');
    }
    // the hidden-move rule: a solve step needs a pgn with a move after its ply
    if (s.pgn) { prevPgn = s.pgn; prevPly = s.ply; } else if (s.same && s.ply !== undefined) prevPly = s.ply;
    else if (s.pos) { const e = (positions || []).find((p) => p.id === s.pos); prevPgn = e && e.pgn ? e.pgn : null; prevPly = e ? s.ply ?? e.ply : null; }
    else if (s.fen || s.recall) { prevPgn = null; }
    if (s.solve) {
      if (!s.task) bad('solve needs a task');
      if (!prevPgn) bad('solve needs a pgn');
      else if (!(replay(prevPgn) > prevPly)) bad(`solve needs a move after ply ${prevPly}`);
    }
  });
  return out;
}

// ---------- recognition rounds ----------

export const ROUND_ID = 'recognise';
export const ROUND_SIZE = 8;
export const MIN_USABLE = 4;

/** A small seeded random source (mulberry32): the same seed always gives the same sequence. */
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const shuffle = (list, rand) => {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
};

/** Every moment of a finished lesson that has moments: { key, lessonId, momentId, label, source, looksLike }. */
function finishedMoments(lessons, positions, doneIds) {
  const out = [];
  for (const lesson of lessons) {
    if (!doneIds.has(lesson.id) || !Array.isArray(lesson.moments) || !lesson.moments.length) continue;
    for (const m of resolveMoments(lesson, positions)) {
      out.push({ key: `${lesson.id}/${m.id}`, lessonId: lesson.id, momentId: m.id, label: `${lesson.game}: ${m.name}`, source: m.source, looksLike: m.looksLike });
    }
  }
  return out;
}

/** May `a` and `b` stand side by side as answers? Not the same moment, and neither lists the other in looksLike. */
const allowedPair = (a, b) => a.key !== b.key && !a.looksLike.includes(b.key) && !b.looksLike.includes(a.key);

/**
 * Up to 3 wrong answers for `m`, taken in `order`, each allowed beside `m` and beside every other one taken.
 * When that greedy pass finds fewer than 2, any allowed pair is used; [] when there is none.
 */
function pickWrong(m, order) {
  const cands = order.filter((o) => allowedPair(m, o));
  const taken = [];
  for (const o of cands) if (taken.length < 3 && taken.every((t) => allowedPair(t, o))) taken.push(o);
  if (taken.length >= 2) return taken;
  for (let i = 0; i < cands.length; i++) for (let j = i + 1; j < cands.length; j++) if (allowedPair(cands[i], cands[j])) return [cands[i], cands[j]];
  return [];
}

/** Finished moments that can be asked: each has at least 2 wrong answers that are allowed beside it and beside each other. */
export function usableMoments(lessons, positions, doneIds) {
  const all = finishedMoments(lessons, positions, doneIds);
  return all.filter((m) => pickWrong(m, all).length >= 2);
}

/** A round can start once two lessons with moments are finished and at least MIN_USABLE moments can be asked. */
export function roundUnlocked(lessons, positions, doneIds) {
  const finished = lessons.filter((l) => doneIds.has(l.id) && Array.isArray(l.moments) && l.moments.length);
  return finished.length >= 2 && usableMoments(lessons, positions, doneIds).length >= MIN_USABLE;
}

/**
 * A seeded "Recognise" round: up to ROUND_SIZE boards, each a blocks question "Which game, which moment?"
 * with the right label and 2-3 allowed wrong ones (other moments of the same game first). Null when locked.
 * Steps have the same shape as resolveSteps output.
 */
export function buildRound(lessons, positions, doneIds, seed) {
  if (!roundUnlocked(lessons, positions, doneIds)) return null;
  const rand = seeded(seed);
  const all = finishedMoments(lessons, positions, doneIds);
  const usable = usableMoments(lessons, positions, doneIds);
  const picked = shuffle(usable, rand).slice(0, ROUND_SIZE);
  const n = picked.length;
  const steps = picked.map((m, i) => {
    const same = shuffle(all.filter((o) => o.lessonId === m.lessonId), rand);
    const other = shuffle(all.filter((o) => o.lessonId !== m.lessonId), rand);
    const wrong = pickWrong(m, [...same, ...other]);
    const choices = shuffle([m.label, ...wrong.map((o) => o.label)], rand);
    return {
      index: i + 1, source: { ...m.source }, view: 'shapes', sq: null, solve: false, task: null, flip: false, shapesGate: false,
      say: `Open **Shapes**. Board ${i + 1} of ${n}. Which game, which moment? Answer, then press Reveal pieces if you want to check.`,
      moment: null, blocks: true,
      ask: { q: 'Which game, which moment?', choices, answer: choices.indexOf(m.label), tap: null, right: 'Right!' },
    };
  });
  return { id: ROUND_ID, name: 'Recognise', steps };
}
