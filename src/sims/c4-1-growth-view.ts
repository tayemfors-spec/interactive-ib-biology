/** Chart markup and reader text for the population growth sim, shared by server and browser. */
import { chartSvg, linePath, sx, sy } from './c4-1-chart';
import type { Frame } from './chart';
import { EXP_END, PLATEAU_START, duckweed, exponential, logistic, phaseOf, rmsError, timeToFraction, type Phase } from './models/c4-1-growth';

export const N0 = duckweed[0]!.fronds;
export const DAYS = 30;
export interface GrowthState { r: number; k: number; log: boolean; exp: boolean; logi: boolean; data: boolean; at: number }
export const DEFAULT_GROWTH: GrowthState = { r: 0.2, k: 450, log: false, exp: true, logi: true, data: true, at: 6 };

const base = { w: 640, h: 380, left: 64, right: 18, top: 16, bottom: 52 };
const xAxis = { min: 0, max: DAYS, ticks: [0, 5, 10, 15, 20, 25, 30], label: 'Time / days' };

export function frameFor(log: boolean): Frame {
  return log
    ? { ...base, x: xAxis, y: { min: 0, max: 3, ticks: [0, 1, 2, 3], label: 'Number of fronds (log scale)' } }
    : { ...base, x: xAxis, y: { min: 0, max: 700, ticks: [0, 100, 200, 300, 400, 500, 600, 700], label: 'Number of fronds' } };
}

export function growthSvg(s: GrowthState): string {
  const f = frameFor(s.log);
  const tr = (n: number) => (s.log ? Math.log10(Math.max(n, 1e-9)) : n);
  const y0 = f.top, y1 = f.h - f.bottom;
  let under = '';
  if (s.logi) {
    const tE = Math.min(DAYS, Math.max(0, timeToFraction(N0, s.r, s.k, EXP_END)));
    const tP = Math.min(DAYS, Math.max(0, timeToFraction(N0, s.r, s.k, PLATEAU_START)));
    const bands: [string, string, number, number][] = [['exp', 'exponential', 0, tE], ['tr', 'transitional', tE, tP], ['pl', 'plateau', tP, DAYS]];
    for (const [cls, name, a, b] of bands) {
      const xa = sx(f, a), xb = sx(f, b);
      if (xb - xa < 1) continue;
      under += `<rect class="band band-${cls}" x="${xa.toFixed(1)}" y="${y0}" width="${(xb - xa).toFixed(1)}" height="${y1 - y0}"/>`;
      if (xb - xa > 74) under += `<text class="band-t" x="${((xa + xb) / 2).toFixed(1)}" y="${y0 + 18}" text-anchor="middle">${name}</text>`;
    }
    const ky = sy(f, tr(s.k));
    under += `<line class="kline" x1="${f.left}" x2="${f.w - f.right}" y1="${ky.toFixed(1)}" y2="${ky.toFixed(1)}"/>`;
    under += `<text class="k-t" x="${f.w - f.right - 6}" y="${(ky - 7).toFixed(1)}" text-anchor="end">K = ${s.k}</text>`;
  }
  const series = [];
  if (s.exp) series.push({ cls: 'exp', d: linePath(f, (t) => tr(exponential(N0, s.r, t)), 120) });
  if (s.logi) series.push({ cls: 'logi', d: linePath(f, (t) => tr(logistic(N0, s.r, s.k, t)), 120) });
  let over = '';
  if (s.data) for (const p of duckweed) over += `<circle class="pt" cx="${sx(f, p.day).toFixed(1)}" cy="${sy(f, tr(p.fronds)).toFixed(1)}" r="5"/>`;
  const mx = sx(f, s.at);
  over += `<line class="marker" x1="${mx.toFixed(1)}" x2="${mx.toFixed(1)}" y1="${y0}" y2="${y1}"/>`;
  if (s.logi) over += `<circle class="mk" cx="${mx.toFixed(1)}" cy="${sy(f, tr(logistic(N0, s.r, s.k, s.at))).toFixed(1)}" r="6"/>`;
  return chartSvg({ frame: f, series, under, over, yLabels: s.log ? (v) => String(10 ** v) : String });
}

const reason: Record<Phase, string> = {
  exponential: 'Exponential phase: resources are plentiful and there are few individuals to compete, so births far exceed deaths. The more individuals there are, the faster numbers rise.',
  transitional: 'Transitional phase: density-dependent factors start to act (competition for mineral ions, light and space; in animals also predators and disease spreading more easily). The birth rate falls and/or the death rate rises, so growth slows.',
  plateau: 'Plateau phase: the population has reached the carrying capacity. Births and deaths are about equal, and negative feedback from density-dependent factors holds numbers near K.',
};

export function growthText(s: GrowthState): string {
  const n = logistic(N0, s.r, s.k, s.at);
  const e = exponential(N0, s.r, s.at);
  let t = `Day ${s.at}: the sigmoid (logistic) model predicts ${Math.round(n)} fronds`;
  t += s.exp ? `; the exponential model predicts ${e > 99999 ? 'over 100 000' : Math.round(e)}. ` : '. ';
  t += reason[phaseOf(n, s.k)];
  if (s.data) t += ` Fit to the duckweed data: the model is off by about ${Math.round(rmsError(s.r, s.k))} fronds on average (root-mean-square).`;
  if (s.log) t += ' On a log scale, exponential growth plots as a straight line; the data follow it only at the start.';
  return t;
}

/** Best-fitting r and K for the duckweed data, by grid search over the slider ranges. */
export function bestFit(): { r: number; k: number } {
  let best = { r: 0.2, k: 300, e: Infinity };
  for (let r = 0.05; r <= 0.6001; r += 0.01)
    for (let k = 100; k <= 600; k += 10) {
      const e = rmsError(Number(r.toFixed(2)), k);
      if (e < best.e) best = { r: Number(r.toFixed(2)), k, e };
    }
  return { r: best.r, k: best.k };
}
