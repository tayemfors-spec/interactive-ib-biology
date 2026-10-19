/**
 * Prefix an internal path with the site's base path (needed when the site is served from
 * a sub-path such as /interactive-ib-biology/ on GitHub Pages). Every internal link must use this.
 */
export function withBase(path = ''): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const clean = path.replace(/^\//, '');
  if (!clean) return `${base}/`;
  // Keep query/hash; add the trailing slash Astro's trailingSlash: 'always' expects on page paths.
  const [p, rest = ''] = clean.split(/(?=[?#])/);
  const needsSlash = !/\.[a-z0-9]+$/i.test(p!) && !p!.endsWith('/');
  return `${base}/${p}${needsSlash ? '/' : ''}${rest}`;
}
