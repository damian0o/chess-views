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
export function resolveSteps(lesson, positions) {
  const out = [];
  lesson.steps.forEach((raw, i) => {
    const where = `lesson ${lesson.id} step ${i + 1}`;
    let source;
    if (raw.fen) source = { kind: 'fen', fen: raw.fen };
    else if (raw.pgn) source = { kind: 'pgn', pgn: raw.pgn, ply: raw.ply };
    else if (raw.pos) {
      const entry = (positions || []).find((p) => p.id === raw.pos);
      if (!entry) throw new Error(`${where}: no library entry "${raw.pos}"`);
      source = entry.fen ? { kind: 'fen', fen: entry.fen } : { kind: 'pgn', pgn: entry.pgn, ply: raw.ply ?? entry.ply };
    } else if (raw.same) {
      if (!out.length) throw new Error(`${where}: "same" on the first step`);
      source = { ...out[out.length - 1].source };
      if (raw.ply !== undefined && source.kind === 'pgn') source.ply = raw.ply;
    } else throw new Error(`${where}: no position`);
    out.push({
      index: i + 1, source, view: raw.view, sq: raw.sq || null,
      solve: !!raw.solve, task: raw.solve ? raw.task || null : null,
      flip: !!raw.flip, shapesGate: !!(raw.shapes && raw.shapes.gate), say: raw.say || '',
    });
  });
  return out;
}

/** The views a lesson has introduced by step `index` (1-based); every view once the lesson is done. */
export function openViews(steps, index, done) {
  if (done) return new Set(ALL_VIEWS);
  return new Set(steps.slice(0, index).map((s) => s.view));
}

/** What still blocks Next on a step, or null: the view first, then the hidden move, then the Shapes reveal. */
export function nextGate(step, now) {
  if (now.tab !== step.view) return { kind: 'view', text: `Open ${VIEW_TITLES[step.view] || step.view} first` };
  if (step.solve && step.source.kind === 'pgn' && !(now.ply > step.source.ply)) return { kind: 'reveal', text: 'Press ▶ first' };
  if (step.shapesGate && !now.shapesReveal) return { kind: 'shapes', text: 'Press Reveal pieces first' };
  return null;
}
