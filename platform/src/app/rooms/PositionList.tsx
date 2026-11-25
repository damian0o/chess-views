import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Input, Label, SearchField } from 'react-aria-components';
import { openSession, sessionParams, sessionScene } from '@core/session';
import type { LibraryEntry } from '@core/types';
import { useT, useText } from '../i18n';
import { Board } from '../board/Board';
import { Button } from '../ui/Button';
import { viewOf } from '../views';

const viewFor = (e: LibraryEntry) => viewOf(e.scene?.layers ?? ['pieces']).id;

/** The free-board address that opens a library position in its own view (a problem hides its later moves). */
export function entryHref(e: LibraryEntry): string | null {
  const s = openSession(e.source, { view: viewFor(e), solve: e.tags.includes('problem') });
  return 'error' in s ? null : `/board?${sessionParams(s).toString()}`;
}

/** Library positions: search, tag chips, and cards that open the position in the free board. */
export function PositionList({ entries }: { entries: LibraryEntry[] }) {
  const t = useT(); const tx = useText();
  const [, navigate] = useLocation();
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const tags = useMemo(() => [...new Set(entries.flatMap((e) => e.tags))], [entries]);
  const names = JSON.parse(t('tagNames')) as Record<string, string>;
  const tagName = (g: string) => names[g] ?? g;
  const q = query.trim().toLowerCase();
  const shown = entries.filter((e) => (!tag || e.tags.includes(tag)) && (!q || `${e.id} ${e.name} ${tx(e.note)} ${e.tags.map(tagName).join(' ')} ${e.tags.join(' ')}`.toLowerCase().includes(q)));
  if (!entries.length) return null;
  return (
    <div className="flex flex-col gap-4">
      {entries.length > 4 && (
        <SearchField value={query} onChange={setQuery} className="flex flex-col gap-1">
          <Label className="font-bold">{t('search')}</Label>
          <Input className="rounded-control bg-card px-4 py-3 text-lg ring-2 ring-ink/15" />
        </SearchField>
      )}
      {tags.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((g) => (
            <button key={g} type="button" aria-pressed={tag === g} onClick={() => setTag(tag === g ? null : g)}
              className={`rounded-full px-4 py-2 font-bold ring-2 ring-ink/15 ${tag === g ? 'bg-accent text-accent-ink' : 'bg-card'}`}>{tagName(g)}</button>
          ))}
        </div>
      )}
      {!shown.length && <p className="text-ink-soft">{t('nothingFound')}</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((e) => {
          const s = openSession(e.source, { view: viewFor(e) });
          const href = entryHref(e);
          return (
            <article key={e.id} aria-label={e.name} className="flex flex-col gap-2 rounded-card bg-card p-4 shadow-card">
              <h3 className="text-lg font-black">{e.name}</h3>
              {!('error' in s) && <div aria-hidden="true" inert className="pointer-events-none mx-auto w-40"><Board scene={sessionScene(s, ['pieces'])} /></div>}
              <p className="text-sm text-ink-soft">{tx(e.note)}</p>
              <div className="mt-auto"><Button isDisabled={!href} onPress={() => href && navigate(href)}>{t('open')}</Button></div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
