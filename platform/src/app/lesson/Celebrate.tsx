import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => typeof matchMedia === 'function' && matchMedia(QUERY).matches);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const mq = matchMedia(QUERY); const on = (e: { matches: boolean }) => setReduced(e.matches);
    mq.addEventListener?.('change', on); return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduced;
}

const BITS = ['★', '●', '▲', '◆', '★', '●', '▲', '◆', '★', '●'];
const COLOURS = ['text-fun-1', 'text-fun-2', 'text-fun-3', 'text-fun-4', 'text-accent', 'text-accent-2'];

/** A little burst of confetti for a right answer; nothing when the device asks for reduced motion. */
export function Celebrate() {
  if (useReducedMotion()) return null;
  return (
    <span data-celebrate aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
      {BITS.map((b, i) => (
        <span key={i} className={`cv-confetti absolute text-xl ${COLOURS[i % COLOURS.length]}`}
          style={{ left: `${8 + i * 9}%`, animationDelay: `${(i % 5) * 60}ms` }}>{b}</span>
      ))}
    </span>
  );
}
