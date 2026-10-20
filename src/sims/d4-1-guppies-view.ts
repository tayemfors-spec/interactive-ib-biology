/** Chart, fish drawings and reader text for the Endler guppy sim, shared by the server render and the browser. */
import { linePath, sx, sy, type Frame } from './chart';
import { END, FOUNDING, TRANSPLANT, type Experiment, type GuppyParams, type Predator } from './models/d4-1-guppies';

export const GUPPY_SEED = 3;
export const FRAME: Frame = {
  w: 640, h: 360, left: 60, right: 16, top: 34, bottom: 56,
  x: { min: 0, max: END, ticks: [0, 4, 8, 12, 16, 20, 24, 28], label: 'Generations since the pools were set up' },
  y: { min: 0, max: 20, ticks: [0, 4, 8, 12, 16, 20], label: 'Mean spots per male' },
};
export interface GuppyView { showPools: boolean; showTransplant: boolean; at: number }
export const DEFAULT_VIEW: GuppyView = { showPools: true, showTransplant: true, at: END };

export const NAMES: Record<Predator | 'transplant', string> = {
  cichlid: 'Pike cichlid pools (strong predator)',
  rivulus: 'Rivulus pools (weak predator)',
  none: 'No predator (control pools)',
  transplant: 'Moved from a pike cichlid pool to a new Rivulus pool',
};

const path = (a: number[]) => linePath(FRAME, (g) => a[Math.round(g)] ?? NaN, END);

export function guppyChart(e: Experiment, v: GuppyView): string {
  const f = FRAME;
  const x0 = f.left, x1 = f.w - f.right, y0 = f.top, y1 = f.h - f.bottom;
  let s = '';
  const xf = sx(f, FOUNDING - 0.5);
  s += `<rect class="found" x="${x0}" y="${y0}" width="${(xf - x0).toFixed(1)}" height="${y1 - y0}"/>`;
  s += '<g class="grid">';
  for (const t of f.x.ticks) s += `<line x1="${sx(f, t).toFixed(1)}" x2="${sx(f, t).toFixed(1)}" y1="${y0}" y2="${y1}"/>`;
  for (const t of f.y.ticks) s += `<line x1="${x0}" x2="${x1}" y1="${sy(f, t).toFixed(1)}" y2="${sy(f, t).toFixed(1)}"/>`;
  s += '</g>';
  s += `<line class="event" x1="${xf.toFixed(1)}" x2="${xf.toFixed(1)}" y1="${y0 - 22}" y2="${y1}"/>`;
  s += `<text class="event-t" x="${(xf + 5).toFixed(1)}" y="${y0 - 10}">predators added</text>`;
  if (v.showTransplant) {
    const xt = sx(f, TRANSPLANT);
    s += `<line class="event" x1="${xt.toFixed(1)}" x2="${xt.toFixed(1)}" y1="${y0 - 22}" y2="${y1}"/>`;
    s += `<text class="event-t" x="${(xt + 5).toFixed(1)}" y="${y0 - 10}">transplant</text>`;
  }
  s += `<path class="axisline" d="M${x0} ${y0} L${x0} ${y1} L${x1} ${y1}"/>`;
  s += '<g class="ticks">';
  for (const t of f.x.ticks) s += `<text x="${sx(f, t).toFixed(1)}" y="${y1 + 19}" text-anchor="middle">${t}</text>`;
  for (const t of f.y.ticks) s += `<text x="${x0 - 7}" y="${sy(f, t).toFixed(1)}" dy="0.35em" text-anchor="end">${t}</text>`;
  s += '</g>';
  s += `<text class="axis" x="${((x0 + x1) / 2).toFixed(1)}" y="${f.h - 10}" text-anchor="middle">${f.x.label}</text>`;
  s += `<text class="axis" transform="translate(15 ${((y0 + y1) / 2).toFixed(1)}) rotate(-90)" text-anchor="middle">${f.y.label}</text>`;
  if (v.showPools) for (const p of e.pools) s += `<path class="line thin t-${p.predator}" d="${path(p.spots)}"/>`;
  for (const k of ['none', 'rivulus', 'cichlid'] as Predator[]) s += `<path class="line t-${k}" d="${path(e.means[k])}"/>`;
  if (v.showTransplant) s += `<path class="line t-transplant" d="${path(e.transplant)}"/>`;
  const xm = sx(f, v.at);
  s += `<line class="marker" x1="${xm.toFixed(1)}" x2="${xm.toFixed(1)}" y1="${y0}" y2="${y1}"/>`;
  return s;
}

// ---------- a male guppy with n spots ----------
/** Spot positions on the body and tail fin (fixed, so the drawing is the same on server and browser). */
const SPOTS: [number, number, number][] = [
  [70, 40, 5], [52, 44, 4.5], [84, 34, 4], [60, 32, 4], [96, 42, 3.5], [44, 36, 4], [76, 49, 4], [30, 30, 5],
  [26, 50, 5], [16, 40, 4.5], [88, 50, 3.5], [36, 44, 3.5], [104, 36, 3], [20, 24, 4], [20, 58, 4], [64, 50, 3.5],
  [8, 30, 3.5], [8, 52, 3.5], [48, 28, 3.5], [32, 60, 3.5],
];
const SPOT_COLOURS = ['sp-o', 'sp-b', 'sp-k', 'sp-r'];

export function fishSvg(n: number): string {
  const k = Math.max(0, Math.min(SPOTS.length, Math.round(n)));
  let s = '<path class="fin" d="M44 40 C30 18 8 8 0 14 C6 30 6 50 0 66 C8 72 30 62 44 40 Z"/>';
  s += '<path class="body" d="M36 40 C46 26 80 24 108 34 C116 37 120 40 120 42 C116 46 110 50 100 52 C76 58 46 54 36 40 Z"/>';
  s += '<path class="dorsal" d="M64 29 C70 20 84 20 88 28 Z"/>';
  s += '<circle class="eye" cx="110" cy="40" r="3"/>';
  for (let i = 0; i < k; i++) {
    const [x, y, r] = SPOTS[i]!;
    s += `<circle class="${SPOT_COLOURS[i % 4]}" cx="${x}" cy="${y}" r="${r}"/>`;
  }
  return s;
}

const fmt = (x: number) => (Number.isFinite(x) ? x.toFixed(1) : '–');

export function guppyText(e: Experiment, p: GuppyParams, v: GuppyView): string {
  const g = v.at;
  const c = e.means.cichlid[g]!, r = e.means.rivulus[g]!, n = e.means.none[g]!;
  if (g < FOUNDING) {
    return `Generation ${g}: all ten pools are still predator-free and their males have similar numbers of spots (about ${fmt(n)}), so any later differences must be caused by the predators.`;
  }
  let t = `Generation ${g}: mean spots per male — pike cichlid pools ${fmt(c)}, Rivulus pools ${fmt(r)}, control pools ${fmt(n)}. `;
  if (p.predation > 0 && c < n - 1) t += 'Pike cichlids catch the most conspicuous males, so natural selection favours duller males with fewer spots. ';
  if (p.preference > 0 && n > e.means.none[0]! + 1) t += 'Where predation is weak or absent, females mating preferentially with colourful males (sexual selection) makes spots more numerous. ';
  if (p.preference === 0) t += 'With no female preference, nothing favours extra spots, so they do not increase. ';
  if (p.predation === 0) t += 'With no predation by pike cichlids, those pools change like the controls. ';
  if (v.showTransplant && g > TRANSPLANT) t += `Transplanted population: ${fmt(e.transplant[TRANSPLANT]!)} spots when moved, ${fmt(e.transplant[g]!)} now — released from strong predation, it becomes more colourful.`;
  return t.trim();
}
