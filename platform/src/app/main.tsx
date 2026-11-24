import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { POC_STEP_IDS } from './content';
import { forwardOldLink } from './forward';
import './styles.css';

const leaving = forwardOldLink(location.hash, POC_STEP_IDS, {
  replace: (url) => location.replace(url),
  setHash: (h) => history.replaceState(null, '', h),
});
if (!leaving) {
  const storage = (() => { try { return window.localStorage; } catch { return undefined; } })();
  createRoot(document.getElementById('root')!).render(<StrictMode><App storage={storage} /></StrictMode>);
}
