/** Field and running-estimate chart markup for the quadrat sim, shared by server and browser. */
import { chartSvg, niceAxis, sx, sy } from './c4-1-chart';
import type { Frame } from './chart';
import { FIELD, QUADRAT, makeField, runningEstimates, summarize, type Pattern, type Plant, type Quadrat } from './models/c4-1-quadrat';
import { mulberry32 } from './models/c4-1-rng';

export const PX = 20; // px per metre
export const PAD = 10;
export const MAX_Q = 50;
export const fieldPx = FIELD * PX + 2 * PAD;

export function newField(seed: number, pattern: Pattern): { plants: Plant[]; trueN: number } {
  const trueN = 400 + Math.floor(mulberry32(seed * 31 + 7)() * 50) * 10;
  return { plants: makeField(seed, pattern, trueN), trueN };
}

export function fieldSvg(plants: Plant[], quadrats: Quadrat[]): string {
  let s = `<rect class="ground" x="${PAD}" y="${PAD}" width="${FIELD * PX}" height="${FIELD * PX}" rx="4"/>`;
  s += '<g class="mgrid">';
  for (let i = 5; i < FIELD; i += 5) {
    s += `<line x1="${PAD + i * PX}" x2="${PAD + i * PX}" y1="${PAD}" y2="${PAD + FIELD * PX}"/><line y1="${PAD + i * PX}" y2="${PAD + i * PX}" x1="${PAD}" x2="${PAD + FIELD * PX}"/>`;
  }
  s += '</g><g class="plants">';
  for (const p of plants) s += `<circle cx="${(PAD + p.x * PX).toFixed(1)}" cy="${(PAD + p.y * PX).toFixed(1)}" r="2.6"/>`;
  s += '</g><g class="quads">';
  quadrats.forEach((q, i) => {
    s += `<rect class="${i === quadrats.length - 1 ? 'q last' : 'q'}" x="${PAD + q.x * PX}" y="${PAD + q.y * PX}" width="${QUADRAT * PX}" height="${QUADRAT * PX}"/>`;
  });
  return s + '</g>';
}

export function runFrame(counts: number[], trueN: number, reveal: boolean): Frame {
  const est = runningEstimates(counts);
  const top = niceAxis(Math.max(1000, ...est, reveal ? trueN * 1.2 : 0), 4);
  const yt: number[] = [];
  for (let v = 0; v <= top.max + 1e-9; v += top.step) yt.push(v);
  return {
    w: 640, h: 280, left: 64, right: 18, top: 14, bottom: 48,
    x: { min: 0, max: MAX_Q, ticks: [0, 10, 20, 30, 40, 50], label: 'Number of quadrats sampled' },
    y: { min: 0, max: top.max, ticks: yt, label: 'Estimate' },
  };
}

export function runSvg(counts: number[], trueN: number, reveal: boolean): string {
  const f = runFrame(counts, trueN, reveal);
  const est = runningEstimates(counts);
  let under = '';
  if (reveal) {
    const y = sy(f, trueN).toFixed(1);
    under += `<line class="trueline" x1="${f.left}" x2="${f.w - f.right}" y1="${y}" y2="${y}"/><text class="true-t" x="${f.w - f.right - 6}" y="${Number(y) - 7}" text-anchor="end">true population = ${trueN}</text>`;
  }
  const d = est.map((v, i) => `${i ? 'L' : 'M'}${sx(f, i + 1).toFixed(1)} ${sy(f, Math.min(v, f.y.max)).toFixed(1)}`).join('');
  let over = '';
  est.forEach((v, i) => { over += `<circle class="rp" cx="${sx(f, i + 1).toFixed(1)}" cy="${sy(f, Math.min(v, f.y.max)).toFixed(1)}" r="3.5"/>`; });
  if (!counts.length) over += `<text class="empty-t" x="${(f.left + f.w - f.right) / 2}" y="${(f.top + f.h - f.bottom) / 2}" text-anchor="middle">Place quadrats to build up an estimate</text>`;
  return chartSvg({ frame: f, series: d ? [{ cls: 'run', d }] : [], under, over });
}

export function statsText(counts: number[], trueN: number, reveal: boolean): string {
  if (!counts.length) return 'No quadrats placed yet. Each quadrat is placed at random coordinates, and the plants rooted inside it are counted.';
  const s = summarize(counts, trueN);
  let t = `${s.n} quadrat${s.n === 1 ? '' : 's'}: mean ${s.mean.toFixed(2)} plants per m², standard deviation ${s.sd.toFixed(2)}. Estimate = ${s.mean.toFixed(2)} × ${FIELD * FIELD} m² ÷ 1 m² = ${Math.round(s.estimate)} plants.`;
  if (reveal) t += ` True population ${trueN}, so the sampling error is ${s.error >= 0 ? '+' : '−'}${Math.abs(Math.round(s.error))} (${Math.abs(s.errorPct).toFixed(0)}%).`;
  if (s.n >= 5) t += s.sd > s.mean ? ' The standard deviation is larger than the mean: counts vary a lot between quadrats, so the plants are clumped and the estimate is less reliable.' : ' The standard deviation is smaller than the mean: counts are fairly similar from quadrat to quadrat, so the plants are spread fairly evenly.';
  if (s.n >= MAX_Q) t += ` Maximum of ${MAX_Q} quadrats reached.`;
  return t;
}

