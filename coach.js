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

// ---------- grading a guess ----------

const round2 = (x) => Math.round(x * 100) / 100;
const round1 = (x) => Math.round(x * 10) / 10;

/**
 * How a guessed move compares with the best move. Both scores are from the mover's point of view,
 * from the same search. Returns { label, loss } with loss in pawns (best minus guess).
 */
export function grade(best, guess) {
  const loss = round2(pawns(best) - pawns(guess));
  const bestMates = best.mate !== undefined && best.mate > 0;
  const guessMates = guess.mate !== undefined && guess.mate > 0;
  const guessGetsMated = guess.mate !== undefined && guess.mate < 0;
  if (bestMates && guessMates) return { label: 'Best!', loss };
  if (bestMates) return { label: `You missed a mate in ${best.mate}`, loss };
  if (guessGetsMated) return { label: `Oops, that allows mate in ${Math.abs(guess.mate)}`, loss };
  if (loss <= 0) return { label: 'Best!', loss: 0 };
  if (loss <= 0.2) return { label: 'Just as good', loss };
  if (loss <= 0.5) return { label: 'Good', loss };
  if (loss <= 1.5) return { label: 'Okay, but there was better', loss };
  return { label: 'Oops, that loses something', loss };
}

// ---------- evaluation in words ----------

/** One short sentence for a score seen from White's side. */
export function evalWords(white) {
  if (white.mate !== undefined && white.mate !== 0) {
    return `${white.mate > 0 ? 'White' : 'Black'} mates in ${Math.abs(white.mate)}`;
  }
  const s = pawns(white);
  const side = s > 0 ? 'White' : 'Black';
  const a = Math.abs(s);
  if (a >= 3) return `${side} is winning`;
  if (a >= 1.2) return `${side} is better`;
  if (a >= 0.4) return `${side} is a little better`;
  return 'Equal';
}

/** The number for the parent: +0.6, -1.2, 0.0, #3, -#2. */
export function evalNumber(white) {
  if (white.mate !== undefined && white.mate !== 0) return `${white.mate < 0 ? '-' : ''}#${Math.abs(white.mate)}`;
  const s = (white.cp || 0) / 100;
  const r = round1(s);
  if (r === 0) return '0.0';
  return `${r > 0 ? '+' : '-'}${Math.abs(r).toFixed(1)}`;
}

/** White's share of the bar, 0..100. */
export function barPercent(white) {
  if (white.mate !== undefined && white.mate !== 0) return white.mate > 0 ? 100 : 0;
  return round1(50 + 50 * Math.tanh(pawns(white) / 4));
}

/** Up to three moves within half a pawn of the best (the first move of a sorted analysis). */
export function arrowMoves(moves) {
  if (!moves.length) return [];
  const top = pawns(moves[0]);
  return moves.filter((m) => top - pawns(m) <= 0.5).slice(0, 3);
}

// ---------- small helpers for the view ----------

export const uciOf = (m) => `${m.from}${m.to}${m.promotion || ''}`;

/** In a problem the solver is the side to move at the start; only their plies are guessed against the stored key. */
export const isSolverPly = (startFen, turn) => startFen.split(/\s+/)[1] === turn;
