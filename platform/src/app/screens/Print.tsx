import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { sessionParams } from '@core/session';
import { printSheet } from '@core/print';
import { useApp } from '../appStore';
import { useT } from '../i18n';
import { Button } from '../ui/Button';

/** A sheet for paper: the position in letters, its FEN, the legend, and an empty board to copy it onto. */
export function Print() {
  const t = useT();
  const [, navigate] = useLocation();
  const session = useApp((s) => s.session);
  useEffect(() => { if (!session) navigate('/board', { replace: true }); }, [session, navigate]);
  if (!session) return null;
  const sheet = printSheet(session.game.fen(session.ply), { flip: session.flip, title: t('printTitle') });
  const blank = printSheet('8/8/8/8/8/8/8/8 w - - 0 1' as never, { flip: session.flip });
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 p-4">
      <div className="flex gap-2 print:hidden">
        <Button onPress={() => window.print()}>{t('print')}</Button>
        <Button tone="quiet" onPress={() => navigate(`/board?${sessionParams(session).toString()}`)}>◀ {t('back')}</Button>
      </div>
      <section data-testid="print-sheet" id="print-sheet" className="flex flex-col gap-3 bg-white p-6 text-black">
        <h1 className="text-2xl font-black">{sheet.title}</h1>
        <pre className="font-mono text-xl leading-relaxed">{sheet.ranks.map((r) => <div key={r} data-testid="rank">{r}</div>)}</pre>
        <p className="font-mono text-sm">{sheet.fen}</p>
        <p>{t('printLegend')}</p>
        <p className="font-bold">{t('printCopy')}</p>
        <pre className="font-mono text-xl leading-relaxed">{blank.ranks.map((r, i) => <div key={i}>{r}</div>)}</pre>
      </section>
    </main>
  );
}
