import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: {
    '@core': fileURLToPath(new URL('./src/core', import.meta.url)),
    '@content': fileURLToPath(new URL('./dist/content', import.meta.url)),
  } },
  test: { include: ['tests/**/*.test.{ts,tsx}'], setupFiles: ['tests/setup.ts'] },
});
