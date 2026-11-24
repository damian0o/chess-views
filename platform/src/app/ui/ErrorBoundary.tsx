import { Component, type ReactNode } from 'react';
import { useT } from '../i18n';

function Fallback({ onHome }: { onHome: () => void }) {
  const t = useT();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-xl font-black">{t('somethingWrong')}</p>
      <a href="#/home" onClick={onHome} className="rounded-control bg-accent px-5 py-3 font-bold text-accent-ink shadow-card">{t('home')}</a>
    </main>
  );
}

/** A render error shows a way home instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override componentDidCatch(error: unknown) { console.error(error); }
  override render() { return this.state.failed ? <Fallback onHome={() => this.setState({ failed: false })} /> : this.props.children; }
}
