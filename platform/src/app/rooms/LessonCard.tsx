import { useLocation } from 'wouter';
import type { Lesson, LibraryEntry } from '@core/types';
import { useApp } from '../appStore';
import { useT, useText } from '../i18n';
import { Button } from '../ui/Button';
import { entryHref } from './PositionList';

const COLOURS = ['bg-fun-1', 'bg-fun-4', 'bg-fun-3', 'bg-fun-2'];

/** A lesson: its colour, title, what it is about, progress, Start / Continue / Start over, and its board when it has one. */
export function LessonCard({ lesson: l, index, board }: { lesson: Lesson; index: number; board?: LibraryEntry | undefined }) {
  const t = useT(); const tx = useText();
  const [, navigate] = useLocation();
  const p = useApp((s) => s.player)?.progress[l.id];
  const at = p ? l.steps.findIndex((s) => s.id === p.reachedStep) + 1 : 0;
  const status = p?.done ? `${t('finished')} ✓` : p && at > 0 ? t('stepOf', { n: at, total: l.steps.length }) : '';
  const href = board ? entryHref(board) : null;
  return (
    <article aria-label={l.title} className="flex flex-col gap-2 rounded-card bg-card p-4 shadow-card">
      <div className={`h-2 w-16 rounded-full ${COLOURS[index % COLOURS.length]}`} aria-hidden="true" />
      <h3 className="text-lg font-black">{l.title}</h3>
      <p className="text-ink-soft">{tx(l.about)}</p>
      {status && <p className="font-bold text-good">{status}</p>}
      <div className="mt-auto flex flex-wrap gap-2">
        {p?.done
          ? <Button tone="quiet" onPress={() => navigate(`/lesson/${l.id}/${l.steps[0]!.id}`)}>{t('startOver')}</Button>
          : <Button onPress={() => navigate(`/lesson/${l.id}`)}>{p ? t('continue') : t('start')}</Button>}
        {href && <Button tone="quiet" onPress={() => navigate(href)}>{t('boardOfGame')}</Button>}
      </div>
    </article>
  );
}
