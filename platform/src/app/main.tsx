import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

const storage = (() => { try { return window.localStorage; } catch { return undefined; } })();
createRoot(document.getElementById('root')!).render(<StrictMode><App storage={storage} /></StrictMode>);
