import { Label, Radio, RadioGroup } from 'react-aria-components';

/** A row of big radio buttons. */
export function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <RadioGroup value={value} onChange={(v) => onChange(v as T)} orientation="horizontal" className="flex flex-col gap-2">
      <Label className="font-bold">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <Radio key={o.value} value={o.value}
            className="cursor-pointer rounded-control bg-card px-4 py-2 font-bold ring-2 ring-ink/15 data-[selected]:bg-accent data-[selected]:text-accent-ink data-[focus-visible]:outline data-[focus-visible]:outline-3 data-[focus-visible]:outline-[var(--focus)]">
            {o.label}
          </Radio>
        ))}
      </div>
    </RadioGroup>
  );
}
