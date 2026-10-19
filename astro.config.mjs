// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// SITE and BASE are set by the deploy workflow. Locally the site is served from the root.
const site = process.env.SITE ?? 'https://example.github.io';
const base = process.env.BASE ?? '/';

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  // Inline CSS into each page: removes render-blocking stylesheet requests (faster first paint on mobile).
  build: { format: 'directory', inlineStylesheets: 'always' },
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !/\/(404|progress)\/?$/.test(page),
    }),
  ],
  prefetch: false,
  vite: {
    // three.js (~190 kB gzipped) is a single lazy chunk loaded only when a reader opens a 3D view,
    // so it never affects first page load; raise the default 500 kB warning limit to fit it.
    build: { chunkSizeWarningLimit: 800 },
  },
  devToolbar: { enabled: false },
});
