import { defineConfig, devices } from '@playwright/test';

const base = (process.env.BASE ?? '/').replace(/\/?$/, '/');
const port = Number(process.env.PORT ?? 4321);
// Real WebGL in headless Chrome: use the SwiftShader software renderer so 3D also works on CI without a GPU.
const chromeArgs = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL: `http://127.0.0.1:${port}${base}`, trace: 'retain-on-failure' },
  webServer: { command: 'node scripts/serve.mjs', url: `http://127.0.0.1:${port}${base}`, reuseExistingServer: true },
  projects: [
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome', launchOptions: { args: chromeArgs } } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'], channel: 'chrome', launchOptions: { args: chromeArgs } } },
  ],
});
