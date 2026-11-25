import type { ReactNode } from 'react';
import { Switch } from 'react-aria-components';

/** An on/off switch with its label, a 48 px tall touch target and a visible keyboard ring. */
export function Toggle({ isSelected, onChange, children }: { isSelected: boolean; onChange: (on: boolean) => void; children: ReactNode }) {
  return (
    <Switch isSelected={isSelected} onChange={onChange} className="group flex min-h-12 cursor-pointer items-center gap-2 font-bold">
      <span className="h-7 w-12 rounded-full bg-ink/20 p-1 transition group-data-[selected]:bg-accent group-data-[focus-visible]:outline group-data-[focus-visible]:outline-3 group-data-[focus-visible]:outline-offset-2 group-data-[focus-visible]:outline-[var(--focus)]">
        <span className="block h-5 w-5 rounded-full bg-card shadow transition group-data-[selected]:translate-x-5" />
      </span>
      {children}
    </Switch>
  );
}
