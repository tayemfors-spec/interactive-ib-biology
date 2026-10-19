// Screenshots every visual (each 3D scene, animation end state, simulation, figure) on a topic page,
// at desktop and phone size, into screenshots/<slug>/. Used for visual and accuracy review.
// Usage: node scripts/shoot-visuals.mjs <slug> [<slug> …]   (needs `npm run serve` running)
import { mkdirSync } from 'node:fs';
import { chromium, devices } from '@playwright/test';

const port = process.env.PORT ?? 4321;
const args = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const browser = await chromium.launch({ channel: 'chrome', args });
const sizes = {
  desktop: { viewport: { width: 1366, height: 860 }, deviceScaleFactor: 1 },
  phone: { ...devices['Pixel 7'] },
};

for (const slug of process.argv.slice(2)) {
  const dir = new URL(`../screenshots/${slug}/`, import.meta.url).pathname;
  mkdirSync(dir, { recursive: true });
  for (const [size, opts] of Object.entries(sizes)) {
    // reduced motion: each step button shows the step's completed state
    const ctx = await browser.newContext({ ...opts, colorScheme: 'light', reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${port}/${slug}/`);
    // the sticky header would otherwise cover the top of element screenshots
    await page.addStyleTag({ content: '.site-header { position: static !important; }' });
    const figs = page.locator('main figure');
    const n = await figs.count();
    for (let i = 0; i < n; i++) {
      const fig = figs.nth(i);
      await fig.scrollIntoViewIfNeeded();
      const id = (await fig.getAttribute('id')) ?? `fig-${i}`;
      const shot = async (suffix) => {
        await page.waitForTimeout(350);
        await fig.screenshot({ path: `${dir}${String(i).padStart(2, '0')}-${id}${suffix}-${size}.jpg`, type: 'jpeg', quality: 80 });
      };
      if (await fig.getAttribute('data-viewer3d') !== null) {
        await shot('-diagram');
        await fig.locator('.view-switch [data-view-btn="3d"]').click();
        await page.waitForFunction((el) => el.dataset.state === 'ready', await fig.elementHandle(), { timeout: 30000 });
        const scenes = fig.locator('[data-scene]');
        const count = Math.max(1, await scenes.count());
        for (let s = 0; s < count; s++) {
          if (s > 0) await scenes.nth(s).click();
          const name = count > 1 ? `-${await scenes.nth(s).getAttribute('data-scene')}` : '';
          await page.waitForTimeout(600);
          await shot(`-3d${name}`);
          // process scenes: also capture each step's completed state
          const stepBtns = fig.locator('[data-process]:visible [data-p-steps] button');
          const ns = await stepBtns.count();
          for (let k = 1; k < ns; k++) { await stepBtns.nth(k).click(); await page.waitForTimeout(300); await shot(`-3d${name}-step${k + 1}`); }
        }
      } else if (await fig.getAttribute('data-anim') !== null) {
        await page.waitForFunction((el) => el.dataset.state === 'ready', await fig.elementHandle(), { timeout: 15000 }).catch(() => {});
        const steps = fig.locator('[data-p-steps] button');
        const k = await steps.count();
        for (let s = 0; s < k; s++) { await steps.nth(s).click(); await page.locator('body').evaluate(() => {}); await shot(`-step${s + 1}`); }
      } else {
        await shot('');
      }
    }
    console.log(`${slug} ${size}: ${n} figures`);
    await ctx.close();
  }
}
await browser.close();
