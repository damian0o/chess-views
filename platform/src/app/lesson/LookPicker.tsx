import type { ReactNode } from 'react';
import { ToggleButton } from 'react-aria-components';
import { GROUP_LABEL, GROUPS, OPTIONS, type OptionState } from '@core/look';
import type { OptionId } from '@core/types';
import { useT } from '../i18n';

/**
 * The board look picker: one labelled row per group that has options here (Bierki, Ruchy, Strategia,
 * Plansza, Pomocnik). The core decides what each press does; a locked option shows 🔒, and everything is
 * disabled while a blocks question is open (`frozen`). `aside` (the legend button) ends the first row, so
 * every row gets the full width.
 */
export function LookPicker({ options, frozen, onToggle, aside }: { options: OptionState[]; frozen: boolean; onToggle: (id: OptionId) => void; aside?: ReactNode }) {
  const t = useT();
  const first = GROUPS.find((g) => options.some((o) => OPTIONS[o.id].group === g));
  return (
    <div data-look-picker className="flex w-full min-w-0 flex-col gap-1.5">
      {GROUPS.map((g) => {
        const here = options.filter((o) => OPTIONS[o.id].group === g);
        if (!here.length) return null;
        return (
          <div key={g} role="group" aria-label={t(GROUP_LABEL[g])} className="flex min-w-0 items-center gap-2">
            <span aria-hidden="true" className="w-[4.5rem] shrink-0 text-sm font-bold text-ink-soft">{t(GROUP_LABEL[g])}</span>
            <div className="flex min-w-0 flex-nowrap gap-1.5 overflow-x-auto pb-0.5">
              {here.map((o) => (
                <ToggleButton key={o.id} data-option={o.id} isSelected={o.on} isDisabled={frozen || o.locked || o.blocked}
                  onChange={() => onToggle(o.id)}
                  className="inline-flex min-h-10 shrink-0 items-center rounded-control bg-card px-3 text-sm font-bold text-ink ring-2 ring-ink/15 transition active:scale-95 disabled:cursor-default disabled:opacity-50 data-[selected]:bg-accent data-[selected]:text-accent-ink data-[selected]:ring-accent">
                  {t(OPTIONS[o.id].label)}{o.locked ? ' 🔒' : ''}
                </ToggleButton>
              ))}
            </div>
            {g === first && aside && <div className="ml-auto shrink-0">{aside}</div>}
          </div>
        );
      })}
    </div>
  );
}
