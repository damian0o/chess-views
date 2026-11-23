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
