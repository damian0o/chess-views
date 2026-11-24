import type { Fen } from '../types';
import { normaliseFen, validatePlacement } from './board';
import { PLACEMENT_RE } from './internal';

export type ParsedInput =
  | { kind: 'unknown' }
  | { kind: 'invalid'; reason: string }
  | { kind: 'fen'; fen: Fen }
  | { kind: 'pgn'; pgn: string }
  | { kind: 'lichess-game'; gameId: string; ply?: number };

// Lichess paths that are exactly 8 letters and would otherwise look like a game id.
const RESERVED_PATHS = new Set(['analysis', 'training', 'practice', 'streamer', 'insights', 'settings', 'openings', 'password']);
const GAME_URL_RE = /^(?:https?:\/\/)?(?:www\.)?lichess\.org\/([A-Za-z0-9]{8})(?:[A-Za-z0-9]{4})?(?:\/(?:white|black))?\/?(?:#(\d+))?$/i;

/** Works out what the user pasted: a FEN, a PGN, a lichess analysis or game link, or nothing usable. */
export function parseInput(text: string | null | undefined): ParsedInput {
  const s = (text || '').trim();
  if (!s) return { kind: 'unknown' };

  const analysis = s.match(/lichess\.org\/analysis\/(?:standard\/)?([^?#\s]+)/i);
  if (analysis) {
    let fen: string;
    try { fen = decodeURIComponent(analysis[1] ?? '').replace(/_/g, ' '); } catch { return { kind: 'unknown' }; }
    const placement = fen.trim().split(/\s+/)[0] ?? '';
    if (PLACEMENT_RE.test(placement)) {
      const reason = validatePlacement(placement);
      return reason ? { kind: 'invalid', reason } : { kind: 'fen', fen: normaliseFen(fen) };
    }
    return { kind: 'unknown' };
  }

  if (/\[Event\s/.test(s) || /(^|\s)1\.\s*[a-hNBRQKO]/.test(s)) return { kind: 'pgn', pgn: s };

  const game = s.match(GAME_URL_RE);
  const gameId = game?.[1];
  if (game && gameId !== undefined && !RESERVED_PATHS.has(gameId.toLowerCase())) {
    const out: ParsedInput = { kind: 'lichess-game', gameId };
    if (game[2] !== undefined) out.ply = Number(game[2]);
    return out;
  }

  const first = s.split(/\s+/)[0] ?? '';
  if (PLACEMENT_RE.test(first)) {
    const reason = validatePlacement(first);
    return reason ? { kind: 'invalid', reason } : { kind: 'fen', fen: normaliseFen(s) };
  }

  return { kind: 'unknown' };
}
