import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { buildRooms, familiesIn, familyView } from '@core/rooms';
import { ROOMS, type Family, type Room } from '@core/types';
import { useApp, useAppStore } from '../appStore';
import { useT } from '../i18n';
import { Button } from '../ui/Button';
import { TopBar } from '../ui/TopBar';
import { LessonCard } from './LessonCard';
import { PositionList, entryHref } from './PositionList';
import { ROOM_NAME } from './names';

/** #/room/<id>: a room's lessons, then its positions; family chips filter both and list the family elsewhere. */
export function RoomScreen({ id }: { id: string }) {
  const t = useT();
  const [, navigate] = useLocation();
  const lessons = useApp((s) => s.lessonList)();
  const library = useApp((s) => s.libraryList)();
  const rooms = useMemo(() => buildRooms(lessons, library), [lessons, library]);
  const [family, setFamily] = useState<Family | null>(null);
  const store = useAppStore();
  useEffect(() => { store.setState({ boardFrom: `/room/${id}` }); }, [store, id]);   // a board opened from here comes back here
  const room = rooms.find((r) => r.id === id);
  if (!(ROOMS as readonly string[]).includes(id) || !room) return <><TopBar title={t('home')} /><main className="p-4"><p>{t('nothingFound')}</p></main></>;
  const view = familyView(rooms, id as Room, family);
  const families = familiesIn(room);
  const familyNames = JSON.parse(t('familyNames')) as Record<string, string>;
  const nameOf = (r: Room, kind: 'lesson' | 'position', ref: string) => kind === 'lesson'
    ? lessons.find((l) => l.id === ref)?.title ?? ref
    : library.find((e) => e.id === ref)?.name ?? ref;
  const openElsewhere = (kind: 'lesson' | 'position', ref: string) => {
    if (kind === 'lesson') { navigate(`/lesson/${ref}`); return; }
    const e = library.find((x) => x.id === ref);
    const href = e ? entryHref(e) : null;
    if (href) navigate(href);
  };

  return (
    <>
      <TopBar title={t(ROOM_NAME[room.id])} />
      <main className="mx-auto flex max-w-6xl flex-col gap-6 p-4">
        {families.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {families.map((f) => (
              <button key={f} type="button" aria-pressed={family === f} onClick={() => setFamily(family === f ? null : f)}
                className={`rounded-full px-4 py-2 font-bold ring-2 ring-ink/15 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${family === f ? 'bg-accent text-accent-ink' : 'bg-card'}`}>
                {familyNames[f] ?? f}
              </button>
            ))}
          </div>
        )}
        {view.lessons.length > 0 && (
          <section aria-label={t('roomLessons')} className="flex flex-col gap-3">
            <h2 className="text-2xl font-black">{t('roomLessons')}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {view.lessons.map((l, i) => <LessonCard key={l.id} lesson={l} index={i} board={room.boardOf.get(l.id)} />)}
            </div>
          </section>
        )}
        {view.positions.length > 0 && (
          <section aria-label={t('roomPositions')} className="flex flex-col gap-3">
            <h2 className="text-2xl font-black">{t('roomPositions')}</h2>
            <PositionList key={family ?? ''} entries={view.positions} />
          </section>
        )}
        {view.elsewhere.length > 0 && (
          <section aria-label={t('elsewhere')} className="flex flex-col gap-3">
            <h2 className="text-xl font-black">{t('elsewhere')}</h2>
            <div className="flex flex-wrap gap-2">
              {view.elsewhere.map((x) => (
                <Button key={`${x.kind}:${x.id}`} tone="quiet" onPress={() => openElsewhere(x.kind, x.id)}>
                  <span>{nameOf(x.room, x.kind, x.id)}</span> <span className="font-normal text-ink-soft">· {t(ROOM_NAME[x.room])}</span>
                </Button>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
