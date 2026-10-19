// Lighthouse CI: every page in the sitemap, mobile preset (the default), all four categories ≥ 0.9.
const { readFileSync } = require('node:fs');

const base = (process.env.BASE || '/').replace(/\/?$/, '/');
const port = process.env.PORT || 4321;
const xml = readFileSync('dist/sitemap-0.xml', 'utf8');
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => `http://127.0.0.1:${port}${base}${new URL(m[1]).pathname.slice(base.length)}`);

module.exports = {
  ci: {
    collect: {
      startServerCommand: 'node scripts/serve.mjs',
      startServerReadyPattern: 'Serving dist',
      url: urls,
      numberOfRuns: 1,
      settings: { chromeFlags: '--headless=new --no-sandbox' },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
      },
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci' },
  },
};
