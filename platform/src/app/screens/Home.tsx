import { useLocation } from 'wouter';
import type { Lesson } from '@core/types';
import { useApp } from '../appStore';
import { useT, useText } from '../i18n';
import { Button } from '../ui/Button';
import { TopBar } from '../ui/TopBar';

const GROUPS = [['pattern', 'groupPattern'], ['strategy', 'groupStrategy'], ['game', 'groupGame']] as const;
const COLOURS = ['bg-fun-1', 'bg-fun-4', 'bg-fun-3', 'bg-fun-2'];

/** Lessons grouped by what they teach, with progress; then Recognise. */
export function Home() {
  const t = useT(); const tx = useText();
  const [, navigate] = useLocation();
  const player = useApp((s) => s.player);
  const lessons = useApp((s) => s.lessonList)();
  const unlocked = useApp((s) => s.recogniseUnlocked)();

  const card = (l: Lesson, i: number) => {
    const p = player?.progress[l.id];
    const at = p ? l.steps.findIndex((s) => s.id === p.reachedStep) + 1 : 0;
    const status = p?.done ? `${t('finished')} ✓` : p && at > 0 ? t('stepOf', { n: at, total: l.steps.length }) : '';
    return (
      <article key={l.id} aria-label={l.title} className="flex flex-col gap-2 rounded-card bg-card p-4 shadow-card">
        <div className={`h-2 w-16 rounded-full ${COLOURS[i % COLOURS.length]}`} aria-hidden="true" />
        <h3 className="text-lg font-black">{l.title}</h3>
        <p className="text-ink-soft">{tx(l.about)}</p>
        {status && <p className="font-bold text-good">{status}</p>}
        <div className="mt-auto flex gap-2">
          {p?.done
            ? <Button tone="quiet" onPress={() => navigate(`/lesson/${l.id}/${l.steps[0]!.id}`)}>{t('startOver')}</Button>
            : <Button onPress={() => navigate(`/lesson/${l.id}`)}>{p ? t('continue') : t('start')}</Button>}
        </div>
      </article>
    );
  };

  return (
    <>
      <TopBar title={player?.name ? `${t('home')} · ${player.name}` : t('home')} />
      <main className="mx-auto flex max-w-5xl flex-col gap-8 p-4">
        {GROUPS.map(([kind, label]) => {
          const list = lessons.filter((l) => l.group.kind === kind);
          if (!list.length) return null;
          return (
            <section key={kind} className="flex flex-col gap-3">
              <h2 className="text-2xl font-black">{t(label)}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{list.map(card)}</div>
            </section>
          );
        })}
        <article aria-label={t('freeBoard')} className="flex flex-col gap-2 rounded-card bg-accent-2 p-5 text-accent-2-ink shadow-card">
          <h2 className="text-2xl font-black">{t('freeBoard')}</h2>
          <p>{t('freeBoardAbout')}</p>
          <div><Button tone="quiet" onPress={() => navigate('/board')}>{t('start')}</Button></div>
        </article>
        <article aria-label={t('recognise')} className="flex flex-col gap-2 rounded-card bg-accent p-5 text-accent-ink shadow-card">
          <h2 className="text-2xl font-black">{t('recognise')}</h2>
          <p>{unlocked ? t('recogniseAbout') : t('recogniseLocked')}</p>
          <div>
            <Button tone="secondary" isDisabled={!unlocked}
              onPress={() => navigate(`/recognise/${Math.floor(Math.random() * 2 ** 31)}/1`)}>{t('start')}</Button>
          </div>
        </article>
      </main>
    </>
  );
}
