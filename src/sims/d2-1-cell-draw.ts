import { H, MIDX, MIDY, W, type Drawing } from './models/d2-1-phase-id';

/**
 * SVG markup for a micrograph-style cell drawing (used on the server and in the browser).
 * Colours come from CSS classes (pc-*) styled by the sim that includes it.
 */
const f = (n: number) => n.toFixed(1);

export function cellMarkup(d: Drawing, opts: { round?: boolean } = {}): string {
  const { x, y, w, h } = d.wall;
  const out: string[] = [`<g transform="rotate(${f(d.rot)} ${MIDX} ${MIDY})">`];
  out.push(opts.round
    ? `<ellipse class="pc-wall" cx="${f(x + w / 2)}" cy="${f(y + h / 2)}" rx="${f(w / 2)}" ry="${f(h / 2.2)}"/>`
    : `<rect class="pc-wall" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="6"/>`);
  for (const n of d.nuclei) out.push(`<ellipse class="pc-nuc${n.faint ? ' faint' : ''}" cx="${f(n.cx)}" cy="${f(n.cy)}" rx="${f(n.rx)}" ry="${f(n.ry)}"/>`);
  if (d.grains.length) out.push(`<g class="pc-grain">${d.grains.map((g) => `<circle cx="${f(g.cx)}" cy="${f(g.cy)}" r="${f(g.r)}"/>`).join('')}</g>`);
  for (const n of d.nucleoli) out.push(`<circle class="pc-nucleolus" cx="${f(n.cx)}" cy="${f(n.cy)}" r="${f(n.r)}"/>`);
  if (d.plate) out.push(`<path class="pc-plate" d="M${f(d.plate.x1)} ${f(d.plate.y)} H${f(d.plate.x2)}"/>`);
  if (d.chroms.length) {
    out.push(`<g class="pc-chrom">${d.chroms.map((c) => `<polyline points="${c.pts.map((p) => `${f(p[0])},${f(p[1])}`).join(' ')}" stroke-width="${c.w}"/>`).join('')}</g>`);
  }
  out.push('</g>');
  return out.join('');
}

export const VIEWBOX = `-16 -16 ${W + 32} ${H + 32}`; // room for the rotated wall
