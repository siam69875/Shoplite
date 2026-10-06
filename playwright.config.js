import { defineConfig, devices } from '@playwright/test';

const PORT = 4100;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Builds the client, seeds a separate e2e database and serves everything from the API server.
  webServer: {
    command: 'npm run build -w client && npm run seed -w server && npm start -w server',
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { PORT: String(PORT), DB_PATH: 'data/e2e.db' },
  },
});
