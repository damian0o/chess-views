// Pure rules for the Engine view and the evaluation line: reading Stockfish's `info` lines,
// converting scores, grading a guess, and turning numbers into words. No DOM, no engine.

// ---------- reading the engine ----------

/** One `info … multipv N … score … pv …` line → { depth, multipv, cp?|mate?, pv }; null for any other line. */
export function parseInfo(line) {
  if (!line.startsWith('info ')) return null;
  const depth = /\bdepth (\d+)/.exec(line);
  const multipv = /\bmultipv (\d+)/.exec(line);
  const score = /\bscore (cp|mate) (-?\d+)/.exec(line);
  const pv = /\bpv (.+)$/.exec(line);
  if (!depth || !multipv || !score) return null;
  const out = { depth: Number(depth[1]), multipv: Number(multipv[1]) };
  out[score[1]] = Number(score[2]);
  out.pv = pv ? pv[1].trim().split(/\s+/) : [];
  return out;
}

/** The deepest line per multipv slot, in slot order: { depth, moves: [{ uci, cp?|mate?, pv }] }. */
export function analysisFromLines(lines) {
  const bySlot = new Map();
  let depth = 0;
  for (const line of lines) {
    const info = parseInfo(line);
    if (!info || !info.pv.length) continue;
    const prev = bySlot.get(info.multipv);
    if (!prev || info.depth >= prev.depth) bySlot.set(info.multipv, info);
    if (info.depth > depth) depth = info.depth;
  }
  const moves = [...bySlot.keys()].sort((a, b) => a - b).map((k) => {
    const { pv, cp, mate } = bySlot.get(k);
    const m = { uci: pv[0], pv };
    if (cp !== undefined) m.cp = cp;
    if (mate !== undefined) m.mate = mate;
    return m;
  });
  return { depth, moves };
}

/** A score as pawns for ordering: centipawns / 100, or ±(100 − N) for a mate in N. */
export function pawns(score) {
  if (score.mate !== undefined) return Math.sign(score.mate) * (100 - Math.abs(score.mate));
  return (score.cp || 0) / 100;
}

/** Stockfish scores are from the side to move; flip them to White's point of view. */
export function toWhite(score, turn) {
  if (turn !== 'b') return { ...score };
  const out = {};
  if (score.cp !== undefined) out.cp = -score.cp;
  if (score.mate !== undefined) out.mate = -score.mate;
  return out;
}
