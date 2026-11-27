import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Input, Label, TextField } from 'react-aria-components';
import { AVATARS, type AgeBand, type Locale } from '@core/types';
import { useApp } from '../appStore';
import { useT } from '../i18n';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { Choice } from '../ui/Choice';

/** "Kto gra?": the players on this device, and adding one. */
export function Players({ next = '/home' }: { next?: string }) {
  const t = useT();
  const [, navigate] = useLocation();
  const players = useApp((s) => s.players);
  const load = useApp((s) => s.loadPlayers);
  const pick = useApp((s) => s.pickPlayer);
  const add = useApp((s) => s.addPlayer);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [age, setAge] = useState<AgeBand>('kids');
  const [locale, setLocale] = useState<Locale>('pl');
  useEffect(() => { void load(); }, [load]);

  const ageLabel = (a: AgeBand) => t(a === 'kids' ? 'age8to12' : a === 'teens' ? 'age12to16' : 'ageAdult');
  const save = async () => {
    await add({ name: name.trim(), age, locale, avatar: AVATARS[players.length % AVATARS.length]! });
    navigate(next);
  };

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col items-center gap-6 p-6">
      <h1 className="text-4xl font-black">{t('whoPlays')}</h1>
      <ul className="flex flex-wrap justify-center gap-4">
        {players.map((p) => (
          <li key={p.id}>
            <Button tone="quiet" className="flex-col !rounded-card p-4" onPress={async () => { await pick(p.id); navigate(next); }}>
              <Avatar color={p.avatar} name={p.name} />
              <span className="text-lg">{p.name ?? '?'}</span>
              <span className="text-sm text-ink-soft">{ageLabel(p.age)}</span>
            </Button>
          </li>
        ))}
        <li>
          <Button tone="secondary" className="h-full flex-col !rounded-card p-4" onPress={() => setAdding(true)}>
            <span aria-hidden="true" className="text-4xl">＋</span>{t('addPlayer')}
          </Button>
        </li>
      </ul>
      {adding && (
        <form className="flex w-full flex-col gap-4 rounded-card bg-card p-5 shadow-card" onSubmit={(e) => { e.preventDefault(); void save(); }}>
          <TextField value={name} onChange={setName} isRequired className="flex flex-col gap-1">
            <Label className="font-bold">{t('playerName')}</Label>
            <Input className="rounded-control bg-surface px-4 py-3 text-lg ring-2 ring-ink/15" />
          </TextField>
          <Choice label={t('ageBand')} value={age} onChange={setAge}
            options={(['kids', 'teens', 'adults'] as const).map((a) => ({ value: a, label: ageLabel(a) }))} />
          <Choice label={t('language')} value={locale} onChange={setLocale}
            options={[{ value: 'pl', label: t('langPl') }, { value: 'en', label: t('langEn') }]} />
          <div className="flex gap-3">
            <Button type="submit" isDisabled={!name.trim()}>{t('save')}</Button>
            <Button tone="quiet" onPress={() => setAdding(false)}>{t('cancel')}</Button>
          </div>
        </form>
      )}
    </main>
  );
}
