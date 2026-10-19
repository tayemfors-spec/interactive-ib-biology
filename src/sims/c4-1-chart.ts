/**
 * Line-chart markup for the C4.1 simulations, shared by the server render and the browser re-render
 * (axes change with the data, so the whole chart is redrawn as an SVG string).
 */
import { linePath, sx, sy, type Frame } from './chart';

export interface Series { d: string; cls: string }
export interface ChartOpts {
  frame: Frame;
  /** Tick labels; defaults to the tick values. */
  xLabels?: (v: number) => string;
  yLabels?: (v: number) => string;
  /** Optional right-hand axis (second y scale), sharing the frame's geometry. */
  right?: { frame: Frame; labels?: (v: number) => string; cls: string };
  series: Series[];
  /** Extra SVG drawn under the series (bands, reference lines). */
  under?: string;
  /** Extra SVG drawn over the series (points, markers, labels). */
  over?: string;
}

export function chartSvg(o: ChartOpts): string {
  const f = o.frame;
  const xl = o.xLabels ?? String, yl = o.yLabels ?? String;
  const x0 = f.left, x1 = f.w - f.right, y0 = f.top, y1 = f.h - f.bottom;
  let s = '<g class="grid">';
  for (const t of f.x.ticks) s += `<line x1="${sx(f, t).toFixed(1)}" x2="${sx(f, t).toFixed(1)}" y1="${y0}" y2="${y1}"/>`;
  for (const t of f.y.ticks) s += `<line x1="${x0}" x2="${x1}" y1="${sy(f, t).toFixed(1)}" y2="${sy(f, t).toFixed(1)}"/>`;
  s += '</g>';
  s += o.under ?? '';
  s += `<path class="axisline" d="M${x0} ${y0} L${x0} ${y1} L${x1} ${y1}${o.right ? ` L${x1} ${y0}` : ''}"/>`;
  s += '<g class="ticks">';
  for (const t of f.x.ticks) s += `<text x="${sx(f, t).toFixed(1)}" y="${y1 + 18}" text-anchor="middle">${xl(t)}</text>`;
  for (const t of f.y.ticks) s += `<text x="${x0 - 7}" y="${sy(f, t).toFixed(1)}" dy="0.35em" text-anchor="end">${yl(t)}</text>`;
  if (o.right) {
    const rf = o.right.frame, rl = o.right.labels ?? String;
    for (const t of rf.y.ticks) if (t > rf.y.min) s += `<text class="${o.right.cls}" x="${x1 + 7}" y="${sy(rf, t).toFixed(1)}" dy="0.35em" text-anchor="start">${rl(t)}</text>`;
  }
  s += '</g>';
  s += `<text class="axis" x="${((x0 + x1) / 2).toFixed(1)}" y="${f.h - 8}" text-anchor="middle">${f.x.label}</text>`;
  s += `<text class="axis" transform="translate(15 ${((y0 + y1) / 2).toFixed(1)}) rotate(-90)" text-anchor="middle">${f.y.label}</text>`;
  if (o.right) s += `<text class="axis ${o.right.cls}" transform="translate(${f.w - 12} ${((y0 + y1) / 2).toFixed(1)}) rotate(90)" text-anchor="middle">${o.right.frame.y.label}</text>`;
  for (const se of o.series) s += `<path class="line ${se.cls}" d="${se.d}"/>`;
  s += o.over ?? '';
  return s;
}

/** A "nice" axis maximum and tick step for data up to `max`. */
export function niceAxis(max: number, ticks = 5): { max: number; step: number } {
  const raw = Math.max(max, 1e-9) / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
  return { max: Math.ceil(max / step - 1e-9) * step, step };
}

export { linePath, sx, sy };
