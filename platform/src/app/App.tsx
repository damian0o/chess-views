import type { StorageLike } from '@core/storage/index';
import { t } from '@core/i18n/index';

export interface AppProps { storage?: StorageLike | undefined }

/** The app shell. Release 1 grows this into players, home, lessons and Recognise. */
export default function App(_props: AppProps) {
  return (
    <main className="min-h-dvh p-4">
      <h1 className="text-2xl font-bold">{t('pl', 'whoPlays')}</h1>
    </main>
  );
}
