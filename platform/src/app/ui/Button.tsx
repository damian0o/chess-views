import { Button as AriaButton, type ButtonProps } from 'react-aria-components';

type Tone = 'primary' | 'secondary' | 'quiet' | 'danger';
const TONE: Record<Tone, string> = {
  primary: 'bg-accent text-accent-ink shadow-card hover:brightness-110',
  secondary: 'bg-accent-2 text-accent-2-ink shadow-card hover:brightness-110',
  quiet: 'bg-card text-ink ring-2 ring-ink/15 hover:ring-ink/30',
  danger: 'bg-bad text-bad-ink shadow-card hover:brightness-110',
};

/** A big, friendly, accessible button. */
export function Button({ tone = 'primary', className = '', ...props }: ButtonProps & { tone?: Tone; className?: string }) {
  return (
    <AriaButton {...props}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-control px-5 py-2 text-base font-bold transition active:scale-95 disabled:cursor-default disabled:opacity-50 data-[pressed]:scale-95 ${TONE[tone]} ${className}`} />
  );
}
