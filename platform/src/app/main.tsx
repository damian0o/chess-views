import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { POC_STEP_IDS } from './content';
import { forwardOldLink, watchOldLinks } from './forward';
import './styles.css';

const leaving = forwardOldLink(location.hash, POC_STEP_IDS, {
  replace: (url) => location.replace(url),
  setHash: (h) => history.replaceState(null, '', h),
  setUrl: (u) => history.replaceState(null, '', u),
});
const nav = {
  get hash() { return location.hash; },
  onHashChange: (fn: () => void) => window.addEventListener('hashchange', fn),
  replace: (url: string) => location.replace(url),
  setHash: (h: string) => { history.replaceState(null, '', h); window.dispatchEvent(new HashChangeEvent('hashchange')); },
  setUrl: (u: string) => { history.replaceState(null, '', u); window.dispatchEvent(new HashChangeEvent('hashchange')); window.dispatchEvent(new PopStateEvent('popstate')); },
};
if (!leaving) {
  watchOldLinks(POC_STEP_IDS, nav);
  const storage = (() => { try { return window.localStorage; } catch { return undefined; } })();
  createRoot(document.getElementById('root')!).render(<StrictMode><App storage={storage} /></StrictMode>);
}
