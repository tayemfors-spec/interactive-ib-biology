/**
 * SVG markup for the B3.1 spirometer trace, shared by the server render and the browser update.
 * Colours come from global classes styled by src/sims/b3-1-spirometer.astro.
 */
import { range, sx, sy, type Frame } from './chart';
import { sampleTrace, tracePlan, traceVolume, type Volumes } from './models/b3-1-spirometer';

export const SPIRO_FRAME: Frame = {
  w: 640, h: 400, left: 58, right: 16, top: 16, bottom: 52,
  x: { min: 0, max: 40, ticks: range(0, 40, 5), label: 'Time (s)' },
  y: { min: 0, max: 7, ticks: range(0, 7, 1), label: 'Volume of air in the lungs (dm³)' },
};

const f1 = (n: number) => n.toFixed(1);

function bracket(f: Frame, x: number, y0: number, y1: number, label: string, side: 'left' | 'right', cls = '') {
  const X = sx(f, x), A = sy(f, y0), B = sy(f, y1);
  const tx = side === 'left' ? X - 8 : X + 8;
  const anchor = side === 'left' ? 'end' : 'start';
  return `<g class="br ${cls}"><path d="M${X - 5} ${A} H${X + 5} M${X} ${A} V${B} M${X - 5} ${B} H${X + 5}" />` +
    `<text x="${tx}" y="${(A + B) / 2}" dy="0.35em" text-anchor="${anchor}">${label}</text></g>`;
}

export function spiroChart(v: Volumes, opts: { annotate: boolean; cursor: number }): string {
  const f = SPIRO_FRAME;
  const plan = tracePlan(v, f.x.max);
  const left = f.left, right = f.w - f.right, top = f.top, bottom = f.h - f.bottom;
  const parts: string[] = [];
  // graph-paper grid: faint 0.1 dm³ lines, stronger 0.5 and 1 dm³ lines, 1 s columns
  const minor = range(0, 7, 0.1).filter((y) => Math.abs(y * 2 - Math.round(y * 2)) > 1e-6);
  parts.push(`<g class="g-minor">${minor.map((y) => `<line x1="${left}" x2="${right}" y1="${sy(f, y).toFixed(1)}" y2="${sy(f, y).toFixed(1)}"/>`).join('')}` +
    `${range(0, 40, 1).map((x) => `<line x1="${sx(f, x).toFixed(1)}" x2="${sx(f, x).toFixed(1)}" y1="${top}" y2="${bottom}"/>`).join('')}</g>`);
  parts.push(`<g class="g-major">${range(0, 7, 0.5).map((y) => `<line x1="${left}" x2="${right}" y1="${sy(f, y).toFixed(1)}" y2="${sy(f, y).toFixed(1)}"/>`).join('')}` +
    `${f.x.ticks.map((x) => `<line x1="${sx(f, x)}" x2="${sx(f, x)}" y1="${top}" y2="${bottom}"/>`).join('')}</g>`);
  parts.push(`<g class="ticks">${f.x.ticks.map((t) => `<text x="${sx(f, t)}" y="${bottom + 20}" text-anchor="middle">${t}</text>`).join('')}` +
    `${f.y.ticks.map((t) => `<text x="${left - 8}" y="${sy(f, t)}" dy="0.35em" text-anchor="end">${t}</text>`).join('')}</g>`);
  parts.push(`<text class="axis" x="${(left + right) / 2}" y="${f.h - 10}" text-anchor="middle">${f.x.label} →</text>`);
  parts.push(`<text class="axis" transform="translate(16 ${(top + bottom) / 2}) rotate(-90)" text-anchor="middle">${f.y.label} →</text>`);

  if (opts.annotate) {
    const rvY = sy(f, v.rv);
    parts.push(`<rect class="rv" x="${left}" y="${rvY.toFixed(1)}" width="${right - left}" height="${(bottom - rvY).toFixed(1)}"/>`);
    parts.push(`<text class="rv-t" x="${left + 8}" y="${(rvY + bottom) / 2}" dy="0.35em">Residual volume ≈ ${f1(v.rv)} dm³: always left in the lungs, so a spirometer cannot measure it</text>`);
    for (const y of [v.frc, v.frc + v.tv]) parts.push(`<line class="level" x1="${left}" x2="${right}" y1="${sy(f, y).toFixed(1)}" y2="${sy(f, y).toFixed(1)}"/>`);
  }

  const pts = sampleTrace(v, f.x.max, 0.05);
  parts.push(`<path class="trace" d="${pts.map(([t, y], i) => `${i ? 'L' : 'M'}${sx(f, t).toFixed(1)} ${sy(f, y).toFixed(1)}`).join('')}"/>`);

  if (opts.annotate) {
    const period = 60 / v.rate;
    parts.push(bracket(f, period * 1.5, v.frc, v.frc + v.tv, 'TV', 'left', 'tv'));
    parts.push(bracket(f, plan.vcPeak, v.frc + v.tv, v.tlc, 'IRV', 'left', 'irv'));
    parts.push(bracket(f, plan.vcLow, v.rv, v.frc, 'ERV', 'left', 'erv'));
    parts.push(bracket(f, Math.min(f.x.max - 3, plan.vcEnd + 1.5), v.rv, v.tlc, 'VC', 'right', 'vc'));
  }

  const c = Math.max(0, Math.min(f.x.max, opts.cursor));
  const cy = traceVolume(c, v, plan);
  const X = sx(f, c), Y = sy(f, cy);
  const labelRight = X < (left + right) / 2;
  parts.push(`<g class="cursor"><line x1="${X.toFixed(1)}" x2="${X.toFixed(1)}" y1="${top}" y2="${bottom}"/><line x1="${left}" x2="${X.toFixed(1)}" y1="${Y.toFixed(1)}" y2="${Y.toFixed(1)}"/>` +
    `<circle cx="${X.toFixed(1)}" cy="${Y.toFixed(1)}" r="6"/>` +
    `<text x="${(labelRight ? X + 10 : X - 10).toFixed(1)}" y="${top + 16}" text-anchor="${labelRight ? 'start' : 'end'}">${f1(c)} s: ${cy.toFixed(2)} dm³</text></g>`);
  return parts.join('');
}
