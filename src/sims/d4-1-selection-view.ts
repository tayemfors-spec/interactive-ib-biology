/** Markup and reader text for the D4.1 natural selection sim, shared by the server render and the browser. */
import { sx, sy, type Frame } from './chart';
import { MAX_SHADE, type GenRecord, type SelectionParams } from './models/d4-1-selection';

export const SEED = 7;
export const MAX_GEN = 100;
/** Moths drawn on the bark (a sample of the young). */
export const SHOWN = 54;

/** Fixed pigment colours for the moth "photo" (a picture, not text), the same in both themes. */
const PALE = '#efe7d6', DARK = '#2b2520';
export const shadeColour = (s: number) => `color-mix(in srgb, ${DARK} ${Math.round((s / MAX_SHADE) * 100)}%, ${PALE})`;

// ---------- bark panel ----------
export const BW = 640, BH = 170;
function lcg(seed: number) { let s = seed; return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648); }
const spots = (() => {
  const r = lcg(17), cols = 9, rows = 6, out: [number, number, number][] = [];
  for (let i = 0; i < SHOWN; i++) {
    const c = i % cols, row = Math.floor(i / cols);
    out.push([Math.round(30 + (c + 0.5 + (r() - 0.5) * 0.55) * ((BW - 60) / cols)), Math.round(14 + (row + 0.5 + (r() - 0.5) * 0.45) * ((BH - 28) / rows)), Math.round((r() - 0.5) * 50)]);
  }
  return out;
})();
const streaks = (() => {
  const r = lcg(5); let s = '';
  for (let i = 0; i < 26; i++) { const x = r() * BW, y = r() * BH; s += `M${x.toFixed(0)} ${y.toFixed(0)} q${(8 + r() * 10).toFixed(0)} ${(30 + r() * 30).toFixed(0)} ${(r() * 6 - 3).toFixed(0)} ${(60 + r() * 50).toFixed(0)}`; }
  return s;
})();

/** `born`: shades of the young (or founders); `alive`: whether each survived to breed. */
export function barkSvg(background: number, born: number[], alive: boolean[]): string {
  let s = `<rect class="bark" x="0" y="0" width="${BW}" height="${BH}" rx="10" style="fill:${shadeColour(background)}"/>`;
  s += `<path class="streaks" d="${streaks}" style="stroke:${shadeColour(Math.min(MAX_SHADE, background + 2.5))}"/>`;
  born.slice(0, SHOWN).forEach((sh, i) => {
    const [x, y, rot] = spots[i]!;
    const ok = alive[i] ?? true;
    s += `<g transform="translate(${x} ${y}) rotate(${rot})" class="${ok ? 'moth' : 'moth eaten'}">`;
    s += `<path d="M0 -2 C-6 -10 -17 -9 -19 -2 C-18 5 -9 9 0 4 C9 9 18 5 19 -2 C17 -9 6 -10 0 -2 Z" style="fill:${shadeColour(sh)}"/>`;
    s += '<path class="body" d="M0 -7 L0 8"/>';
    if (!ok) s += '<path class="x" d="M-9 -9 L9 9 M9 -9 L-9 9"/>';
    s += '</g>';
  });
  return s;
}

// ---------- histogram ----------
export const HIST: Frame = {
  w: 640, h: 300, left: 60, right: 14, top: 18, bottom: 56,
  x: { min: -0.5, max: MAX_SHADE + 0.5, ticks: Array.from({ length: MAX_SHADE + 1 }, (_, i) => i), label: 'Wing shade (0 = palest, 12 = darkest)' },
  y: { min: 0, max: 200, ticks: [0, 50, 100, 150, 200], label: 'Number of moths' },
};
function niceMax(v: number) { for (const m of [40, 80, 100, 120, 160, 200, 240, 320, 400, 600, 800, 1000, 1200]) if (v <= m) return m; return Math.ceil(v / 400) * 400; }

export function histSvg(rec: GenRecord): string {
  const top = Math.max(...rec.born, ...rec.survived, 1);
  const max = niceMax(top);
  const f: Frame = { ...HIST, y: { ...HIST.y, max, ticks: [0, max / 4, max / 2, (3 * max) / 4, max] } };
  const x0 = f.left, x1 = f.w - f.right, y0 = f.top, y1 = f.h - f.bottom;
  let s = '<g class="grid">';
  for (const t of f.y.ticks) s += `<line x1="${x0}" x2="${x1}" y1="${sy(f, t).toFixed(1)}" y2="${sy(f, t).toFixed(1)}"/>`;
  s += '</g>';
  const bw = (x1 - x0) / (MAX_SHADE + 1);
  for (let i = 0; i <= MAX_SHADE; i++) {
    const xc = sx(f, i);
    const b = rec.born[i]!, v = rec.survived[i]!;
    if (b > 0) s += `<rect class="born" x="${(xc - bw * 0.42).toFixed(1)}" y="${sy(f, b).toFixed(1)}" width="${(bw * 0.84).toFixed(1)}" height="${(y1 - sy(f, b)).toFixed(1)}"/>`;
    if (v > 0) s += `<rect class="surv" x="${(xc - bw * 0.3).toFixed(1)}" y="${sy(f, v).toFixed(1)}" width="${(bw * 0.6).toFixed(1)}" height="${(y1 - sy(f, v)).toFixed(1)}" style="fill:${shadeColour(i)}"/>`;
  }
  s += `<path class="axisline" d="M${x0} ${y0} L${x0} ${y1} L${x1} ${y1}"/>`;
  s += '<g class="ticks">';
  for (const t of f.x.ticks) s += `<text x="${sx(f, t).toFixed(1)}" y="${y1 + 19}" text-anchor="middle">${t}</text>`;
  for (const t of f.y.ticks) s += `<text x="${x0 - 7}" y="${sy(f, t).toFixed(1)}" dy="0.35em" text-anchor="end">${t}</text>`;
  s += '</g>';
  s += `<text class="axis" x="${((x0 + x1) / 2).toFixed(1)}" y="${f.h - 10}" text-anchor="middle">${f.x.label}</text>`;
  s += `<text class="axis" transform="translate(15 ${((y0 + y1) / 2).toFixed(1)}) rotate(-90)" text-anchor="middle">${f.y.label}</text>`;
  return s;
}

// ---------- allele frequency graph ----------
export function freqFrame(gens: number): Frame {
  const max = gens <= 20 ? 20 : gens <= 50 ? 50 : MAX_GEN;
  const step = max === 20 ? 5 : 10;
  return {
    w: 640, h: 280, left: 60, right: 14, top: 16, bottom: 56,
    x: { min: 0, max, ticks: Array.from({ length: max / step + 1 }, (_, i) => i * step), label: 'Generation' },
    y: { min: 0, max: 1, ticks: [0, 0.25, 0.5, 0.75, 1], label: 'Dark allele frequency' },
  };
}

export function freqSvg(history: GenRecord[], background: number): string {
  const f = freqFrame(history.length - 1);
  const x0 = f.left, x1 = f.w - f.right, y0 = f.top, y1 = f.h - f.bottom;
  let s = '<g class="grid">';
  for (const t of f.x.ticks) s += `<line x1="${sx(f, t).toFixed(1)}" x2="${sx(f, t).toFixed(1)}" y1="${y0}" y2="${y1}"/>`;
  for (const t of f.y.ticks) s += `<line x1="${x0}" x2="${x1}" y1="${sy(f, t).toFixed(1)}" y2="${sy(f, t).toFixed(1)}"/>`;
  s += '</g>';
  const target = background / MAX_SHADE;
  s += `<line class="target" x1="${x0}" x2="${x1}" y1="${sy(f, target).toFixed(1)}" y2="${sy(f, target).toFixed(1)}"/>`;
  s += `<text class="target-t" x="${x1 - 6}" y="${(sy(f, target) + (target > 0.85 ? 16 : -7)).toFixed(1)}" text-anchor="end">frequency that matches the bark</text>`;
  s += `<path class="axisline" d="M${x0} ${y0} L${x0} ${y1} L${x1} ${y1}"/>`;
  s += '<g class="ticks">';
  for (const t of f.x.ticks) s += `<text x="${sx(f, t).toFixed(1)}" y="${y1 + 19}" text-anchor="middle">${t}</text>`;
  for (const t of f.y.ticks) s += `<text x="${x0 - 7}" y="${sy(f, t).toFixed(1)}" dy="0.35em" text-anchor="end">${t}</text>`;
  s += '</g>';
  s += `<text class="axis" x="${((x0 + x1) / 2).toFixed(1)}" y="${f.h - 10}" text-anchor="middle">${f.x.label}</text>`;
  s += `<text class="axis" transform="translate(15 ${((y0 + y1) / 2).toFixed(1)}) rotate(-90)" text-anchor="middle">${f.y.label}</text>`;
  if (history.length > 1) s += `<path class="line freq" d="${freqPath(history)}"/>`;
  const last = history.at(-1)!;
  s += `<circle class="pt" cx="${sx(f, last.gen).toFixed(1)}" cy="${sy(f, last.darkFreq).toFixed(1)}" r="5.5"/>`;
  return s;
}

/** Path only up to the current generation (linePath samples the whole axis). */
export function freqPath(history: GenRecord[]): string {
  const f = freqFrame(history.length - 1);
  return history.map((r, i) => `${i ? 'L' : 'M'}${sx(f, r.gen).toFixed(1)} ${sy(f, r.darkFreq).toFixed(1)}`).join('');
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

export function selectionText(history: GenRecord[], p: SelectionParams): string {
  const last = history.at(-1)!;
  const first = history[0]!;
  if (last.gen === 0) {
    return `Generation 0: ${pct(first.darkFreq)} of the alleles in the gene pool are dark alleles, so the moths already vary in shade before any selection happens. Press "Next generation" to let them breed.`;
  }
  const born = last.born.reduce((a, b) => a + b, 0);
  const surv = last.survived.reduce((a, b) => a + b, 0);
  let t = `Generation ${last.gen}: ${born} young were born but food supports only ${surv}, so ${born - surv} died before breeding. `;
  if (born <= surv) t = `Generation ${last.gen}: with only 2 young per pair there is no overproduction, so every young moth survives and there is no selection. `;
  else if (p.strength === 0) t += 'With no selection pressure, which ones died was a matter of chance. ';
  else {
    const diff = Number(last.meanShade.toFixed(1)) - Number(last.bornMean.toFixed(1));
    t += `Birds found the moths that contrast with the bark more easily, so survivors averaged shade ${last.meanShade.toFixed(1)} against ${last.bornMean.toFixed(1)} for all the young (a shift of ${diff >= 0 ? '+' : ''}${diff.toFixed(1)}). `;
  }
  t += `Dark allele frequency: ${pct(first.darkFreq)} at the start, ${pct(last.darkFreq)} now. `;
  const change = last.darkFreq - first.darkFreq;
  if (Math.abs(change) >= 0.1) t += `The population has evolved; no individual moth changed its shade. `;
  if (p.acquired) t += 'The survivors darkened during adult life, but this acquired change is not in their alleles, so their young are born with shades set only by the genes they inherit.';
  return t.trim();
}
