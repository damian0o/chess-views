import { Button as AriaButton, Label, ListBox, ListBoxItem, Popover, Select, SelectValue } from 'react-aria-components';
import type { View, ViewId } from '../views';
import { useT } from '../i18n';

/** The view dropdown: only the given views; disabled while a blocks question is open. */
export function ViewPicker({ views, selected, onChange, disabled, allowed }: { views: View[]; selected: ViewId; onChange: (v: View) => void; disabled: boolean; allowed: readonly string[] }) {
  const usable = (v: View) => v.layers.every((l) => allowed.includes(l));
  const t = useT();
  return (
    <Select selectedKey={selected} isDisabled={disabled} onSelectionChange={(k) => { const v = views.find((x) => x.id === k); if (v) onChange(v); }}
      className="flex items-center gap-2">
      <Label className="font-bold">{t('view')}</Label>
      <AriaButton className="flex min-h-12 min-w-40 items-center justify-between gap-2 rounded-control bg-card px-4 font-bold ring-2 ring-ink/15 disabled:opacity-50">
        <SelectValue /><span aria-hidden="true">▾</span>
      </AriaButton>
      <Popover className="min-w-40 rounded-control bg-card p-1 shadow-card">
        <ListBox className="outline-none">
          {views.map((v) => (
            <ListBoxItem key={v.id} id={v.id} textValue={t(v.label)} isDisabled={!usable(v)}
              className="cursor-pointer rounded-control px-4 py-3 font-bold outline-none data-[focused]:bg-accent data-[focused]:text-accent-ink data-[selected]:underline data-[disabled]:cursor-default data-[disabled]:opacity-50">
              {t(v.label)}{usable(v) ? '' : ' 🔒'}
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </Select>
  );
}
