import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';

/** Site-relative paths of every page, read from the built sitemap (plus the 404 page). */
export function sitePaths(): string[] {
  const xml = readFileSync(new URL('../../dist/sitemap-0.xml', import.meta.url), 'utf8');
  const base = (process.env.BASE ?? '/').replace(/\/?$/, '/');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]!).pathname.slice(base.length));
}

/** Record console errors, page errors and failed same-origin requests while a test runs. */
export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => errors.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`));
  page.on('response', (r) => {
    if (r.status() >= 400 && new URL(r.url()).origin === new URL(page.url() || 'http://127.0.0.1').origin) errors.push(`HTTP ${r.status()}: ${r.url()}`);
  });
  return errors;
}

export async function scrollThrough(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += Math.round(innerHeight * 0.8)) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
}

/** Topic pages whose built HTML contains `needle` (e.g. 'data-anim'), so tests pick a page that has the feature. */
export function pagesWith(needle: string): string[] {
  return sitePaths().filter((p) => /^[a-d]\d-\d-/.test(p) && readFileSync(new URL(`../../dist/${p}index.html`, import.meta.url), 'utf8').includes(needle));
}
