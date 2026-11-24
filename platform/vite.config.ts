import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

// base './' so the built site works at the Pages root and in any sub-path.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: { alias: {
    '@core': fileURLToPath(new URL('./src/core', import.meta.url)),
    '@content': fileURLToPath(new URL('./dist/content', import.meta.url)),
  } },
  build: { outDir: 'dist/app', emptyOutDir: true },
});
