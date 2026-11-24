import { useEffect } from 'react';
import { useApp } from '../appStore';

/** A short message at the bottom (lesson finished, not found, …); it goes away by itself. */
export function Toast() {
  const toast = useApp((s) => s.toast);
  const dismiss = useApp((s) => s.dismissToast);
  useEffect(() => { if (!toast) return; const id = setTimeout(dismiss, 3500); return () => clearTimeout(id); }, [toast, dismiss]);
  if (!toast) return null;
  return <div role="status" className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-control bg-ink px-4 py-3 text-center font-bold text-surface shadow-card">{toast}</div>;
}
