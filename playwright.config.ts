/**
 * Configuration Playwright — Lot 6.2.B (smoke tests parcours critiques).
 *
 * V1 minimale : Chromium uniquement, headless en CI, workers 1
 * (sérialisé pour anti-flake — les tests partagent la même base
 * via API et certains créent des données).
 *
 * Pré-requis local :
 *   - backend NestJS démarré sur :3001 (npm run start:dev)
 *   - base BSIC seedée avec personas (admin/lecteur/6 personas BSIC)
 *   - frontend démarré automatiquement par webServer ci-dessous (Vite
 *     reprend le serveur existant si déjà lancé en dev).
 *
 * Lancement : npm run test:e2e:playwright
 */
import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './tests/playwright',
  testMatch: /.*\.spec\.ts$/,
  timeout: 30_000,
  expect: { timeout: 5_000 },

  // Anti-flake : un seul worker car les tests partagent la même base
  // BSIC et certains (SMOKE.4 reforecast) créent des données.
  workers: 1,
  fullyParallel: false,

  retries: isCI ? 2 : 0,
  forbidOnly: isCI,

  reporter: isCI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Démarre Vite automatiquement si pas déjà en cours. Le backend
  // NestJS reste un pré-requis manuel (cf. tests/playwright/README.md).
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !isCI,
    timeout: 60_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
