import type { Analysis, EngineMove, Score } from './types';

export interface InfoLine { depth: number; multipv: number; score: Score; pv: string[] }

export const moveOf = (uci: string): EngineMove =>
  ({ uci, from: uci.slice(0, 2), to: uci.slice(2, 4), ...(uci.length > 4 ? { promotion: uci.slice(4) } : {}) });

/** One `info … multipv N … score … pv …` line, or null for any other line. */
export function parseInfo(line: string): InfoLine | null {
  if (!line.startsWith('info ')) return null;
  const depth = /\bdepth (\d+)/.exec(line);
  const multipv = /\bmultipv (\d+)/.exec(line);
  const score = /\bscore (cp|mate) (-?\d+)/.exec(line);
  const pv = /\bpv (.+)$/.exec(line);
  if (!depth || !multipv || !score) return null;
  const value = Number(score[2]);
  return { depth: Number(depth[1]), multipv: Number(multipv[1]), score: score[1] === 'cp' ? { cp: value } : { mate: value }, pv: pv ? pv[1]!.trim().split(/\s+/) : [] };
}

/** The deepest line per multipv slot, in slot order. */
export function analysisFromLines(lines: string[]): Analysis {
  const bySlot = new Map<number, InfoLine>();
  let depth = 0;
  for (const line of lines) {
    const info = parseInfo(line);
    if (!info || !info.pv.length) continue;
    const prev = bySlot.get(info.multipv);
    if (!prev || info.depth >= prev.depth) bySlot.set(info.multipv, info);
    depth = Math.max(depth, info.depth);
  }
  const out = [...bySlot.keys()].sort((a, b) => a - b).map((k) => {
    const { pv, score } = bySlot.get(k)!;
    return { move: moveOf(pv[0]!), score, pv };
  });
  return { depth, lines: out };
}
