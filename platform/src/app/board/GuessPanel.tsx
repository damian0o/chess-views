import type { AnalysisState } from './useAnalysis';
import type { Fen } from '@core/types';
import type { EngineMove } from '@core/engine/types';
import { grade } from '@core/engine/coach';
import { loadGame } from '@core/chess/rules';
import { formatSan } from '@core/chess/san';
import type { MessageKey } from '@core/i18n/index';
import { usePlayer, useT } from '../i18n';
import { Button } from '../ui/Button';

export interface Guess { move: EngineMove; san: string }

/** The guess's grade against the engine's best (from the same analysis), the best move, and Show / Guess again. */
export function GuessPanel({ fen, analysis, hint, guess, revealed, onReveal, onAgain }: {
  fen: Fen; analysis: AnalysisState; hint: MessageKey | null; guess: Guess | null; revealed: boolean; onReveal: () => void; onAgain: () => void;
}) {
  const t = useT();
  const locale = usePlayer()?.locale ?? 'pl';
  if (!guess) return <p aria-live="polite" className="font-bold">{t(hint ?? 'guessHint')}</p>;
  const mine = formatSan(guess.san, locale);
  if (analysis.kind === 'none' || analysis.kind === 'failed' || analysis.kind === 'dead' || analysis.kind === 'slow') return <p aria-live="polite" className="font-bold">{t('guessNoEval')}</p>;
  if (analysis.kind !== 'done') return <p aria-live="polite" className="font-bold text-ink-soft">{t('engineThinking')}</p>;
  const lines = analysis.analysis.lines;
  const best = lines[0];
  const line = lines.find((l) => l.move.uci === guess.move.uci);
  const bestSan = best ? (loadGame({ kind: 'fen', fen }).legalMoves(fen).find((m) => `${m.from}${m.to}${m.promotion ?? ''}` === best.move.uci)?.san ?? best.move.uci) : '';
  const label = best && line ? (() => { const g = grade(best.score, line.score); return t(g.label, g.params); })() : t('guessNotTop');
  return (
    <div aria-live="polite" className="flex flex-col gap-2">
      <p className="text-lg font-black">{t('guessYour', { san: mine, label })}</p>
      {best && (!line || line !== best) && <p className="font-bold">{t('guessBest', { san: formatSan(bestSan, locale) })}</p>}
      <div className="flex gap-2">
        {!revealed && <Button tone="quiet" onPress={onReveal}>{t('show')}</Button>}
        <Button onPress={onAgain}>{t('guessAgain')}</Button>
      </div>
    </div>
  );
}
