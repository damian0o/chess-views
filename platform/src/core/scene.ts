/** A step's scene made concrete: the position, its moves (unless hidden) and the analysis each layer needs. */
import type { Fen, LayerKind, Square, Step } from './types';
import { loadGame, type Move } from './chess/rules';
import { analyse, type LayerData } from './analysis/index';

export interface ResolvedScene {
  fen: Fen; moves: Move[]; ply: number;
  layers: LayerKind[]; data: LayerData;
  focus: Square[]; hideMoves: boolean; flip: boolean;
}

/** A step whose scene shows no pieces, or whose question is a recall, is a blocks board. */
export const isBlocks = (step: Step): boolean => !step.scene.layers.includes('pieces') || step.question?.kind === 'recall';

/**
 * While the step's question is open its locked layers are removed, and a blocks board has no moves and
 * hides the move list (the moves would name the game). Once answered, a blocks board gains its pieces back.
 */
export function sceneFor(step: Step, { answered }: { answered: boolean }): ResolvedScene {
  const game = loadGame(step.scene.position);
  const open = !!step.question && !answered;
  const blocks = isBlocks(step);
  let layers = step.scene.layers.slice();
  if (open && step.scene.lockedLayers) layers = layers.filter((l) => !step.scene.lockedLayers!.includes(l));
  if (blocks && !open && !layers.includes('pieces')) layers = [...layers, 'pieces'];
  const hide = blocks ? open : !!step.scene.hideMoves;
  const fen = game.fen();
  return {
    fen, ply: game.ply, moves: hide ? [] : game.moves(),
    layers, data: analyse(fen, layers),
    focus: step.scene.focus ?? [], hideMoves: hide, flip: !!step.scene.flip,
  };
}
