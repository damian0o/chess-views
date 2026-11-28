import { useId, useState, type ReactNode } from 'react';
import { Button, ToggleButton } from 'react-aria-components';
import { GROUP_LABEL, GROUPS, OPTIONS, type OptionState } from '@core/look';
import type { OptionId } from '@core/types';
import { useT } from '../i18n';
import { useIsPhone } from './useIsPhone';

/**
 * The board look picker. A summary line ("Widok: Bierki · Drogi ▾") folds and unfolds one labelled row per group
 * that has options here (Bierki, Ruchy, Strategia, Plansza, Pomocnik). It starts folded on a phone and open
 * elsewhere; the fold is not saved. The core decides what each press does; a locked option shows 🔒, and the
 * rows are disabled while a blocks question is open (`frozen`) — the summary still unfolds. `aside` (the legend
 * button) ends the summary line, so it stays reachable while folded.
 */
export function LookPicker({ options, frozen, onToggle, aside, startOpen, open: openProp, onOpenChange }: {
  options: OptionState[]; frozen: boolean; onToggle: (id: OptionId) => void; aside?: ReactNode; startOpen?: boolean;
  /** Controlled fold, for a screen that remounts the picker (the phone board sheet does, per step). */
  open?: boolean; onOpenChange?: (open: boolean) => void;
}) {
  const t = useT();
  const phone = useIsPhone();
  const [own, setOwn] = useState(startOpen ?? !phone);
  const open = openProp ?? own;
  const setOpen = (f: (v: boolean) => boolean) => { const v = f(open); setOwn(v); onOpenChange?.(v); };
  const rowsId = useId();
  const on = options.filter((o) => o.on).map((o) => t(OPTIONS[o.id].label));
  return (
    <div data-look-picker className="flex w-full min-w-0 flex-col gap-1.5">
      <div className="flex min-w-0 items-center gap-2">
        <Button data-look-summary aria-expanded={open} aria-controls={rowsId} onPress={() => setOpen((v) => !v)}
          className="min-h-10 w-0 min-w-0 flex-1 truncate rounded-control px-1 text-left text-sm font-bold text-ink-soft outline-none focus-visible:ring-2 focus-visible:ring-accent">
          {`${t('view')}: ${on.join(' · ')} ${open ? '▴' : '▾'}`}
        </Button>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
      {open && (
        <div id={rowsId} data-look-rows className="flex min-w-0 flex-col gap-1.5">
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
