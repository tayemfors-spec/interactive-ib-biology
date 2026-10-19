// Renders the social-preview images (public/og/*.png, 1200×630) with the installed Chrome.
// Run after changing theme names or branding: node scripts/make-og.mjs
import { mkdirSync, readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const syllabus = JSON.parse(readFileSync(new URL('../syllabus.json', import.meta.url), 'utf8'));
const out = new URL('../public/og/', import.meta.url);
mkdirSync(out, { recursive: true });

const cards = [
  { file: 'default', kicker: 'IB Diploma Biology · 2025 syllabus · SL & HL', title: 'Interactive IB Biology', sub: '3D models, simulations, quizzes and flashcards for every topic' },
  ...syllabus.themes.map((t) => ({ file: t.id.toLowerCase(), kicker: `Theme ${t.id}`, title: t.title, sub: 'Interactive IB Biology · 3D models, simulations and self-tests' })),
];

const html = (c) => `<!doctype html><html><head><style>
  body { margin:0; width:1200px; height:630px; font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; background:#0e1412; color:#e5ece8; display:flex; }
  .wrap { padding: 80px 90px; display:flex; flex-direction:column; justify-content:center; gap:22px; width:100%;
    background: radial-gradient(circle at 85% 30%, rgba(82,208,180,.25), transparent 45%), radial-gradient(circle at 95% 95%, rgba(201,167,242,.18), transparent 40%); }
  .kicker { font-size:30px; font-weight:700; color:#52d0b4; letter-spacing:.02em; }
  h1 { font-size:${c.title.length > 26 ? 76 : 92}px; line-height:1.04; margin:0; letter-spacing:-.02em; max-width: 900px; }
  .sub { font-size:32px; color:#a6b5ae; max-width: 880px; }
  svg { position:absolute; right:80px; top:70px; width:150px; height:150px; color:#52d0b4; }
</style></head><body><div class="wrap">
  <svg viewBox="0 0 32 32"><path d="M10 3c0 7 12 7 12 13S10 22 10 29M22 3c0 7-12 7-12 13s12 6 12 13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M12 8h8M11 13h10M11 19h10M12 24h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity=".55"/></svg>
  <div class="kicker">${c.kicker}</div><h1>${c.title}</h1><div class="sub">${c.sub}</div></div></body></html>`;

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const c of cards) {
  await page.setContent(html(c));
  await page.screenshot({ path: new URL(`${c.file}.png`, out).pathname, type: 'png' });
  console.log(`og/${c.file}.png`);
}
await browser.close();
