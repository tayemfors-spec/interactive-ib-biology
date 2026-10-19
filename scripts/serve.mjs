// Minimal static server for dist/, mounted at BASE (default "/"), like GitHub Pages.
// Used by Playwright, the link checker and Lighthouse so tests see exactly what will be deployed.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = new URL('../dist/', import.meta.url).pathname;
const base = (process.env.BASE ?? '/').replace(/\/?$/, '/');
const port = Number(process.env.PORT ?? 4321);
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif',
  '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2', '.pf_meta': 'application/octet-stream',
  '.pf_fragment': 'application/octet-stream', '.pf_index': 'application/octet-stream', '.pagefind': 'application/octet-stream', '.wasm': 'application/wasm',
};

async function file(path) {
  try {
    const s = await stat(path);
    if (s.isDirectory()) return file(join(path, 'index.html'));
    return { body: await readFile(path), type: types[extname(path)] ?? 'application/octet-stream' };
  } catch { return null; }
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  let path = decodeURIComponent(url.pathname);
  if (!path.startsWith(base)) { res.writeHead(404).end('Not under base path'); return; }
  path = normalize(join(root, path.slice(base.length)));
  if (!path.startsWith(root)) { res.writeHead(403).end(); return; }
  // Directory URLs without a trailing slash redirect, as GitHub Pages does.
  if (!url.pathname.endsWith('/') && !extname(path)) {
    const s = await stat(path).catch(() => null);
    if (s?.isDirectory()) { res.writeHead(301, { Location: `${url.pathname}/` }).end(); return; }
  }
  const hit = await file(path);
  if (hit) {
    // GitHub Pages gzips text responses; do the same so local Lighthouse runs match production.
    const compressible = /text|javascript|json|xml|svg/.test(hit.type);
    const gzip = compressible && /\bgzip\b/.test(String(req.headers['accept-encoding'] ?? ''));
    const headers = { 'Content-Type': hit.type, 'Cache-Control': 'no-cache', Vary: 'Accept-Encoding', ...(gzip ? { 'Content-Encoding': 'gzip' } : {}) };
    res.writeHead(200, headers).end(gzip ? gzipSync(hit.body) : hit.body);
    return;
  }
  const nf = await file(join(root, '404.html'));
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }).end(nf?.body ?? 'Not found');
}).listen(port, '127.0.0.1', () => console.log(`Serving dist/ at http://127.0.0.1:${port}${base}`));
