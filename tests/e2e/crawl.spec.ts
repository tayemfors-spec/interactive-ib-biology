import { expect, test } from '@playwright/test';
import { scrollThrough, sitePaths, watchErrors } from './helpers';

for (const path of sitePaths()) {
  test(`page /${path} loads cleanly`, async ({ page }) => {
    const errors = watchErrors(page);
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page).toHaveTitle(/Interactive IB Biology/);
    await expect(page.locator('h1')).toHaveCount(1);
    expect(await page.locator('link[rel=canonical]').getAttribute('href')).toMatch(/^https?:\/\//);
    const desc = await page.locator('meta[name=description]').getAttribute('content');
    expect(desc?.length ?? 0).toBeGreaterThan(50);
    for (const json of await page.locator('script[type="application/ld+json"]').allTextContents()) expect(() => JSON.parse(json)).not.toThrow();
    // every in-page #link has a target
    const missing = await page.evaluate(() => [...document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')].map((a) => a.hash.slice(1)).filter((id) => id && !document.getElementById(id)));
    expect(missing).toEqual([]);
    await scrollThrough(page);
    await page.waitForTimeout(300);
    expect(errors).toEqual([]);
  });
}

test('404 page is served for unknown URLs', async ({ page }) => {
  const res = await page.goto('this-page-does-not-exist/');
  expect(res?.status()).toBe(404);
  await expect(page.locator('h1')).toHaveText('Page not found');
});
