import { defineConfig, devices } from '@playwright/test';

// Runs against the assembled site (npm run build && npx tsx scripts/assemble-site.ts), served like Pages.
export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4317/', trace: 'retain-on-failure' },
  webServer: { command: 'npx vite preview --outDir site --port 4317 --strictPort', url: 'http://localhost:4317/', reuseExistingServer: true },
  projects: [
    { name: 'phone', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: 'laptop', use: { viewport: { width: 1280, height: 800 } } },
  ],
});
