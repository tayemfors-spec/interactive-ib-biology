import { expect, test } from '@playwright/test';
import { sitePaths, watchErrors } from './helpers';

type Viewer = { sample(): { drawn: number; colours: number } };

for (const path of sitePaths()) {
  test(`3D viewers on /${path} render and every label resolves`, async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(path);
    const figs = page.locator('[data-viewer3d]');
    const n = await figs.count();
    test.skip(n === 0, 'no 3D viewer on this page');
    for (let i = 0; i < n; i++) {
      const fig = figs.nth(i);
      await fig.scrollIntoViewIfNeeded();
      await fig.locator('.view-switch [data-view-btn="3d"]').click();
      await expect(fig).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
      const sceneButtons = fig.locator('[data-scene]');
      const scenes = Math.max(1, await sceneButtons.count());
      for (let s = 0; s < scenes; s++) {
        if (s > 0) { await sceneButtons.nth(s).click(); await page.waitForTimeout(500); }
        const labels = fig.locator('.label3d');
        const total = await labels.count();
        expect(total).toBeGreaterThan(0);
        await expect(fig.locator('.label3d[data-resolved="true"]')).toHaveCount(total);
        const sample = await fig.evaluate((el) => (el as HTMLElement & { viewer: Viewer }).viewer.sample());
        expect(sample.drawn, 'share of canvas drawn').toBeGreaterThan(0.05);
        expect(sample.colours, 'distinct colours drawn').toBeGreaterThanOrEqual(8);
        // clicking a label shows its definition
        const first = fig.locator('.label3d:not([hidden])').first();
        const name = (await first.getAttribute('aria-label'))!.replace(/^\d+\.\s*/, '');
        await first.click({ force: true });
        await expect(fig.locator('[data-info]')).toContainText(name);
        // keyboard rotation changes the camera
        const before = await fig.getAttribute('data-azimuth');
        await fig.locator('[data-stage]').focus();
        await page.keyboard.press('ArrowRight');
        await expect.poll(() => fig.getAttribute('data-azimuth')).not.toBe(before);
        // process scenes: step through every step
        const proc = fig.locator('[data-process]');
        if (await proc.isVisible()) {
          const steps = await proc.locator('[data-p-steps] button').count();
          for (let k = 1; k < steps; k++) await proc.locator('[data-p-next]').click();
          await expect(proc.locator('[data-p-caption]')).toContainText(`Step ${steps} of ${steps}`);
        }
      }
      // back to the exam diagram
      await fig.locator('.view-switch [data-view-btn="diagram"]').click();
      await expect(fig.locator('[data-diagram]')).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
}
