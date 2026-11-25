import { useMemo } from 'react';
import { useLocation } from 'wouter';
import { buildRooms, lastOpenLesson } from '@core/rooms';
import { useApp } from '../appStore';
import { useT } from '../i18n';
import { Button } from '../ui/Button';
import { TopBar } from '../ui/TopBar';
import { LessonCard } from '../rooms/LessonCard';
import { ROOM_ABOUT, ROOM_NAME } from '../rooms/names';

const COLOURS = ['bg-fun-1', 'bg-fun-4', 'bg-fun-3', 'bg-fun-2'];

/** Home: Continue (the lesson opened last), one card per room, then the free board and Recognise. */
export function Home() {
  const t = useT();
  const [, navigate] = useLocation();
  const player = useApp((s) => s.player);
  const lessons = useApp((s) => s.lessonList)();
  const library = useApp((s) => s.libraryList)();
  const unlocked = useApp((s) => s.recogniseUnlocked)();
  const rooms = useMemo(() => buildRooms(lessons, library), [lessons, library]);
  const last = player ? lastOpenLesson(player, lessons) : null;

  return (
    <>
      <TopBar title={player?.name ? `${t('home')} · ${player.name}` : t('home')} />
      <main className="mx-auto flex max-w-5xl flex-col gap-6 p-4">
        {last && (
          <section aria-label={t('continue')} role="article" className="flex flex-col gap-3">
            <h2 className="text-2xl font-black">{t('continue')}</h2>
            <LessonCard lesson={last} index={0} />
          </section>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {rooms.map((r, i) => (
            <article key={r.id} aria-label={t(ROOM_NAME[r.id])} className="flex flex-col gap-2 rounded-card bg-card p-5 shadow-card">
              <div className={`h-2 w-16 rounded-full ${COLOURS[i % COLOURS.length]}`} aria-hidden="true" />
              <h2 className="text-2xl font-black">{t(ROOM_NAME[r.id])}</h2>
              <p className="text-ink-soft">{t(ROOM_ABOUT[r.id])}</p>
              <p className="font-bold">{t('roomCount', { lessons: r.lessons.length, positions: r.positions.length + r.boardOf.size })}</p>
              <div className="mt-auto"><Button onPress={() => navigate(`/room/${r.id}`)}>{t('open')}</Button></div>
            </article>
          ))}
        </div>
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
