import type { Fen } from '../types';

/** A score from the side to move: centipawns, or mate in N (negative: the side to move gets mated). */
export type Score = { cp: number } | { mate: number };
export interface EngineMove { uci: string; from: string; to: string; promotion?: string }
export interface AnalysisLine { move: EngineMove; score: Score; pv: string[] }
export interface Analysis { depth: number; lines: AnalysisLine[] }
export interface EngineInfo { name: string }
export type Level = 'easy' | 'medium' | 'hard';
export interface AnalyseOptions { depth?: number; multipv?: number; movetimeMs?: number }

/** Any engine behind one interface: the Stockfish WASM worker now, other adapters later. */
export interface EngineService {
  ready(): Promise<EngineInfo>;
  analyse(fen: Fen, opts?: AnalyseOptions, signal?: AbortSignal, onProgress?: (a: Analysis) => void): Promise<Analysis>;
  bestMove(fen: Fen, opts: { level: Level }, signal?: AbortSignal): Promise<EngineMove | null>;
  dispose(): void;
}
