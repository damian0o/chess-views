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
 * The layers shown are the child's choice (`layersOn`, from the lesson run) or the step's own. While the
 * step's question is open its locked layers are removed, and a blocks board never shows pieces. A blocks
 * board hides its moves (they would name the game) until its pieces are shown. An answered blocks
 * question shows its pieces when the caller gives no choice of its own.
 */
export function sceneFor(step: Step, { answered, layersOn }: { answered: boolean; layersOn?: LayerKind[] }): ResolvedScene {
  const game = loadGame(step.scene.position);
  const open = !!step.question && !answered;
  const blocks = isBlocks(step);
  let layers = (layersOn ?? step.scene.layers).slice();
  if (open && step.scene.lockedLayers) layers = layers.filter((l) => !step.scene.lockedLayers!.includes(l));
  if (blocks && open) layers = layers.filter((l) => l !== 'pieces');
  if (blocks && step.question && answered && !layersOn && !layers.includes('pieces')) layers = [...layers, 'pieces'];
  const hide = blocks ? !layers.includes('pieces') : !!step.scene.hideMoves;
  const fen = game.fen();
  return {
    fen, ply: game.ply, moves: hide ? [] : game.moves(),
    layers, data: analyse(fen, layers),
    focus: step.scene.focus ?? [], hideMoves: hide, flip: !!step.scene.flip,
  };
}

/** The scene of a lesson run as it stands: one answer for the run and the screen. */
export function sceneOfRun(run: { step: Step; answered: boolean; layersOn: LayerKind[] }): ResolvedScene {
  return sceneFor(run.step, { answered: run.answered, layersOn: run.layersOn });
}
