// Captures review screenshots of a topic page (desktop + phone, light + dark) into screenshots/.
// Usage: node scripts/screenshots.mjs [slug]   (needs `npm run serve` running)
import { mkdirSync } from 'node:fs';
import { chromium, devices } from '@playwright/test';

const slug = process.argv[2] ?? 'b2-1-membranes-and-membrane-transport';
const url = `http://127.0.0.1:${process.env.PORT ?? 4321}/${slug}/`;
const dir = new URL('../screenshots/', import.meta.url).pathname;
mkdirSync(dir, { recursive: true });
const args = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const browser = await chromium.launch({ channel: 'chrome', args });

async function shoot(name, ctxOpts, steps) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  await page.goto(url);
  await steps(page);
  await page.screenshot({ path: `${dir}${name}.jpg`, type: 'jpeg', quality: 82 });
  console.log(`screenshots/${name}.jpg`);
  await ctx.close();
}
const toEl = (sel, offset = 0) => async (page) => {
  await page.locator(sel).first().evaluate((el, o) => { el.scrollIntoView({ block: 'start' }); window.scrollBy(0, o); }, offset);
  await page.waitForTimeout(400);
};
const open3d = async (page, scene) => {
  const fig = page.locator('[data-viewer3d]').first();
  await fig.scrollIntoViewIfNeeded();
  await fig.locator('.view-switch [data-view-btn="3d"]').click();
  await page.waitForSelector('[data-viewer3d][data-state="ready"]');
  if (scene) { await fig.locator(`[data-scene="${scene}"]`).click(); await page.waitForTimeout(400); }
  await fig.evaluate((el) => { el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -64); });
  await page.waitForTimeout(600);
};
const desktop = { viewport: { width: 1366, height: 860 }, deviceScaleFactor: 1 };
const phone = { ...devices['Pixel 7'] };

for (const scheme of ['light', 'dark']) {
  await shoot(`desktop-${scheme}-top`, { ...desktop, colorScheme: scheme }, async () => {});
  await shoot(`desktop-${scheme}-3d`, { ...desktop, colorScheme: scheme }, (p) => open3d(p));
  await shoot(`desktop-${scheme}-diagram`, { ...desktop, colorScheme: scheme }, toEl('[data-viewer3d]', -64));
}
await shoot('desktop-light-transport', { ...desktop, colorScheme: 'light' }, async (p) => {
  await open3d(p, 'transport');
  await p.locator('[data-viewer3d] [data-p-steps] button').nth(3).click();
  await p.locator('[data-viewer3d] [data-p-play]').click();
  await p.waitForTimeout(3500);
});
await shoot('desktop-light-rate-sim', { ...desktop, colorScheme: 'light' }, toEl('[data-sim-rate]', -110));
await shoot('desktop-dark-ahl-fluidity', { ...desktop, colorScheme: 'dark' }, toEl('#fluidity', -20));
await shoot('desktop-light-pump', { ...desktop, colorScheme: 'light' }, async (p) => {
  const a = p.locator('[data-module="b2-1-na-k-pump"]');
  await a.scrollIntoViewIfNeeded();
  await p.waitForSelector('[data-module="b2-1-na-k-pump"][data-state="ready"]');
  for (let i = 0; i < 2; i++) await a.locator('[data-p-next]').click();
  await a.evaluate((el) => { el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -70); });
  await p.waitForTimeout(300);
});
await shoot('desktop-light-quiz', { ...desktop, colorScheme: 'light' }, async (p) => {
  const q = p.locator('[data-quiz] .q').first();
  await q.locator('input[value="b"]').check();
  await p.locator('[data-quiz] button[type=submit]').click();
  await q.evaluate((el) => { el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -80); });
});
for (const scheme of ['light', 'dark']) {
  await shoot(`phone-${scheme}-top`, { ...phone, colorScheme: scheme }, async () => {});
  await shoot(`phone-${scheme}-3d`, { ...phone, colorScheme: scheme }, (p) => open3d(p));
}
await shoot('phone-light-diagram', { ...phone, colorScheme: 'light' }, toEl('[data-viewer3d]', -64));
await shoot('phone-light-rate-sim', { ...phone, colorScheme: 'light' }, toEl('[data-sim-rate]', -110));
await shoot('phone-light-menu', { ...phone, colorScheme: 'light' }, async (p) => { await p.locator('[data-menu-toggle]').click(); await p.waitForTimeout(400); });
await shoot('phone-dark-pump', { ...phone, colorScheme: 'dark' }, async (p) => {
  const a = p.locator('[data-module="b2-1-na-k-pump"]');
  await a.scrollIntoViewIfNeeded();
  await p.waitForSelector('[data-module="b2-1-na-k-pump"][data-state="ready"]');
  await a.evaluate((el) => { el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -64); });
  await p.waitForTimeout(300);
});
await browser.close();
