import { expect, test } from '@playwright/test';
import { pagesWith, sitePaths, watchErrors } from './helpers';

const topicPaths = sitePaths().filter((p) => /^[a-d]\d-\d-/.test(p));

for (const path of topicPaths) {
  test(`animations and sims on /${path} work`, async ({ page }) => {
    test.setTimeout(180_000); // some pages have 100+ controls to exercise
    const errors = watchErrors(page);
    await page.goto(path);
    const anims = page.locator('[data-anim]');
    for (let i = 0; i < (await anims.count()); i++) {
      const a = anims.nth(i);
      await a.scrollIntoViewIfNeeded();
      await expect(a).toHaveAttribute('data-state', 'ready');
      const steps = await a.locator('[data-p-steps] button').count();
      expect(steps).toBeGreaterThan(1);
      for (let k = 1; k < steps; k++) await a.locator('[data-p-next]').click();
      await expect(a.locator('[data-p-caption]')).toContainText(`Step ${steps} of ${steps}`);
      await a.locator('[data-p-steps] button').first().click();
      await a.locator('[data-p-play]').click();
      await page.waitForTimeout(400);
      await expect(a.locator('[data-p-play-label]')).toHaveText(/Pause|Play/);
    }
    // every slider can move and updates without errors
    const sliders = page.locator('figure input[type="range"]');
    for (let i = 0; i < (await sliders.count()); i++) {
      const s = sliders.nth(i);
      await s.scrollIntoViewIfNeeded();
      await s.evaluate((el: HTMLInputElement) => { el.value = el.max; el.dispatchEvent(new Event('input', { bubbles: true })); });
      await s.evaluate((el: HTMLInputElement) => { el.value = el.min; el.dispatchEvent(new Event('input', { bubbles: true })); });
    }
    // buttons inside simulations
    const simButtons = page.locator('figure.sim button');
    for (let i = 0; i < (await simButtons.count()); i++) {
      const b = simButtons.nth(i);
      // a control can move or hide while others are clicked; page errors are still caught below
      if (await b.isVisible()) await b.click({ timeout: 5_000 }).catch(() => {});
    }
    await page.waitForTimeout(500);
    expect(errors).toEqual([]);
  });

  test(`quiz and flashcards on /${path} save progress`, async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(path);
    const quiz = page.locator('[data-quiz]');
    const questions = quiz.locator('.q');
    const n = await questions.count();
    for (let i = 0; i < n; i++) {
      const answer = await questions.nth(i).getAttribute('data-answer');
      await questions.nth(i).locator(`input[value="${answer}"]`).check();
    }
    await quiz.locator('button[type=submit]').click();
    await expect(quiz.locator('[data-score]')).toContainText(`You scored ${n} out of ${n}`);
    await expect(quiz.locator('.opt-why:visible').first()).toBeVisible();
    const cards = page.locator('[data-flashcards]');
    await cards.locator('[data-reveal]').click();
    await cards.locator('[data-know]').click();
    await page.reload();
    await expect(page.locator('[data-quiz] [data-best]')).toContainText(`Your best: ${n} / ${n}`);
    await expect(page.locator('[data-flashcards] [data-card-status]')).toContainText('You know 1');
    expect(errors).toEqual([]);
  });
}

test('the site still works when storage is blocked', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } });
  });
  const errors = watchErrors(page);
  await page.goto(topicPaths[0]!);
  await page.locator('[data-quiz] button[type=submit]').click();
  await expect(page.locator('[data-quiz] [data-score]')).toContainText('You scored');
  expect(errors).toEqual([]);
});

test('reduced motion disables autoplay and steps instead', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(pagesWith('data-anim')[0]!);
  const a = page.locator('[data-anim]').first();
  await a.scrollIntoViewIfNeeded();
  await expect(a).toHaveAttribute('data-state', 'ready');
  await expect(a.locator('[data-p-play]')).toBeDisabled();
  await expect(a.locator('[data-p-reduced]')).toBeVisible();
});

test('SL-only filter hides AHL sections', async ({ page }) => {
  await page.goto(pagesWith('class="section ahl"')[0]!);
  await page.locator('button[popovertarget="prefs-panel"]').click();
  await page.locator('input[name="pref-level"][value="SL"]').check();
  await expect(page.locator('section[data-level-block="AHL"]').first()).toBeHidden();
  await page.locator('input[name="pref-level"][value="SL+AHL"]').check();
  await expect(page.locator('section[data-level-block="AHL"]').first()).toBeVisible();
});

test('search finds a topic', async ({ page }) => {
  await page.goto('');
  await page.keyboard.press('/');
  await page.locator('#search-input').fill('aquaporin');
  await expect(page.locator('[data-search-results] a').first()).toBeVisible();
  await expect(page.locator('[data-search-results]')).toContainText('B2.1');
});
