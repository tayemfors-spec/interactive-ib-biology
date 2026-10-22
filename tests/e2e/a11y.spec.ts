import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { sitePaths } from './helpers';

const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

for (const scheme of ['light', 'dark'] as const) {
  for (const path of sitePaths()) {
    test(`axe (${scheme}) /${path}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(path);
      // open the interactive states too, so their markup is checked
      const viewer = page.locator('[data-viewer3d]').first();
      if (await viewer.count()) {
        await viewer.locator('.view-switch [data-view-btn="3d"]').click();
        await expect(viewer).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
        await viewer.locator('.label3d:not([hidden])').first().click({ force: true });
      }
      const quiz = page.locator('[data-quiz]');
      if (await quiz.count()) await quiz.locator('button[type=submit]').click();
      // Check contrast in the settled state, not halfway through a fade-in.
      await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished)));
      const results = await new AxeBuilder({ page }).withTags(tags).analyze();
      const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
      expect(summary).toEqual([]);
    });
  }
}
