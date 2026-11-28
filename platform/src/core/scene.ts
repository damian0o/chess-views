/** A step's scene made concrete: the position, its moves (unless hidden) and the analysis each layer needs. */
import type { BoardLook, Fen, Square, Step } from './types';
import { turnOff } from './look';
import { loadGame, type Move } from './chess/rules';
import { analyse, type LayerData } from './analysis/index';

export interface ResolvedScene {
  fen: Fen; moves: Move[]; ply: number;
  look: BoardLook; data: LayerData;
  focus: Square[]; hideMoves: boolean; flip: boolean;
}

/** A step whose scene shows no pieces (blocks or hidden), or whose question is a recall, is a blocks board. */
export const isBlocks = (step: Step): boolean => step.scene.look.pieces !== 'pieces' || step.question?.kind === 'recall';

/** A recall step written with pieces still opens on blocks. */
const openPieces = (step: Step): BoardLook['pieces'] => (step.scene.look.pieces === 'pieces' ? 'blocks' : step.scene.look.pieces);

/**
 * The look shown is the child's choice (`look`, from the lesson run) or the step's own. While the step's
 * question is open its locked options are off, and a blocks board never shows pieces. A blocks board
 * hides its moves (they would name the game) until its pieces are shown. An answered blocks question
 * shows its pieces when the caller gives no choice of its own.
 */
export function sceneFor(step: Step, { answered, look: chosen }: { answered: boolean; look?: BoardLook }): ResolvedScene {
  const game = loadGame(step.scene.position);
  const open = !!step.question && !answered;
  const blocks = isBlocks(step);
  let look = chosen ?? step.scene.look;
  if (open) for (const id of step.scene.locked ?? []) look = turnOff(look, id);
  if (blocks && open && look.pieces === 'pieces') look = { ...look, pieces: openPieces(step) };
  if (blocks && step.question && answered && !chosen) look = { ...look, pieces: 'pieces' };
  const hide = blocks ? look.pieces !== 'pieces' : !!step.scene.hideMoves;
  const fen = game.fen();
  return {
    fen, ply: game.ply, moves: hide ? [] : game.moves(),
    look, data: analyse(fen, look),
    focus: step.scene.focus ?? [], hideMoves: hide, flip: !!step.scene.flip,
  };
}

/** The scene of a lesson run as it stands: one answer for the run and the screen. */
export function sceneOfRun(run: { step: Step; answered: boolean; look: BoardLook; flip?: boolean; ply?: number }): ResolvedScene {
  const pos = run.step.scene.position;
  // A game position follows the viewer's ply (▶ on a "find the move" step shows the move).
  let step = run.step;
  if (pos.kind === 'pgn' && run.ply !== undefined && run.ply !== pos.ply) {
    const ply = Math.max(0, Math.min(run.ply, loadGame({ ...pos, ply: 0 }).length));
    step = { ...run.step, scene: { ...run.step.scene, position: { ...pos, ply } } };
  }
  const scene = sceneFor(step, { answered: run.answered, look: run.look });
  return run.flip === undefined ? scene : { ...scene, flip: run.flip };
}
