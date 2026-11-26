import { useEffect, useState } from 'react';

const QUERY = '(max-width: 767.98px)';
const phoneNow = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(QUERY).matches;

/** True on a screen narrower than `md`, following rotation and resizes; false where the browser cannot tell (tests, old browsers). */
export function useIsPhone(): boolean {
  const [phone, setPhone] = useState(phoneNow);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(QUERY);
    const on = (e: { matches: boolean }) => setPhone(e.matches);
    setPhone(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return phone;
}
