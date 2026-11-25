import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { createReadStream, existsSync } from 'node:fs';
import { join } from 'node:path';

/** In development, serve the vendored Stockfish files (repo root engine/) at /engine/, as the published site does. */
const engineFiles = () => ({
  name: 'cv-engine-files',
  configureServer(server: { middlewares: { use: (fn: (req: { url?: string }, res: { setHeader: (k: string, v: string) => void } & NodeJS.WritableStream, next: () => void) => void) => void } }) {
    const root = fileURLToPath(new URL('../engine', import.meta.url));
    server.middlewares.use((req, res, next) => {
      const m = /\/engine\/([\w.-]+)$/.exec(req.url ?? '');
      const file = m ? join(root, m[1]!) : '';
      if (!m || !existsSync(file)) return next();
      res.setHeader('Content-Type', file.endsWith('.wasm') ? 'application/wasm' : 'text/javascript');
      createReadStream(file).pipe(res);
    });
  },
});

// base './' so the built site works at the Pages root and in any sub-path.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), engineFiles()],
  resolve: { alias: {
    '@core': fileURLToPath(new URL('./src/core', import.meta.url)),
    '@content': fileURLToPath(new URL('./dist/content', import.meta.url)),
  } },
  build: { outDir: 'dist/app', emptyOutDir: true },
});
