/** Box-and-whisker plot SVG and statistics readout, shared by the server render and the browser. */
import { summarise, sorted, type Summary } from './models/d3-2-boxplot';

export const W = 520, H = 230;
const L = 30, R = 20;

const niceStep = (span: number) => {
  const raw = span / 6;
  const p = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw) ?? raw;
};
const f = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(Math.abs(v) < 10 ? 2 : 1).replace(/\.?0+$/, ''));

export function plotSvg(values: number[], unit: string): string {
  if (values.length < 4) return `<text class="msg" x="${W / 2}" y="${H / 2}" text-anchor="middle">Enter at least 4 values</text>`;
  const s = summarise(values);
  const step = niceStep(Math.max(1, s.max - s.min));
  const lo = Math.floor((s.min - step / 2) / step) * step, hi = Math.ceil((s.max + step / 2) / step) * step;
  const x = (v: number) => L + ((v - lo) / (hi - lo)) * (W - L - R);
  let out = '';
  // dot strip: duplicates stack upwards
  const seen = new Map<number, number>();
  for (const v of sorted(values)) {
    const k = seen.get(v) ?? 0; seen.set(v, k + 1);
    const out1 = s.outliers.includes(v);
    out += `<circle class="${out1 ? 'pt out' : 'pt'}" cx="${x(v).toFixed(1)}" cy="${(70 - k * 11).toFixed(1)}" r="4.5"/>`;
  }
  const by = 130, bh = 36;
  out += `<path class="whisk" d="M${x(s.whiskerLow)} ${by} H${x(s.q1)} M${x(s.q3)} ${by} H${x(s.whiskerHigh)} M${x(s.whiskerLow)} ${by - 12} V${by + 12} M${x(s.whiskerHigh)} ${by - 12} V${by + 12}"/>`;
  out += `<rect class="box" x="${x(s.q1)}" y="${by - bh / 2}" width="${Math.max(1, x(s.q3) - x(s.q1))}" height="${bh}"/>`;
  out += `<path class="med" d="M${x(s.median)} ${by - bh / 2} V${by + bh / 2}"/>`;
  for (const o of s.outliers) out += `<circle class="opt" cx="${x(o)}" cy="${by}" r="5"/>`;
  // fences
  for (const fence of [s.lowFence, s.highFence]) if (fence > lo && fence < hi) out += `<path class="fence" d="M${x(fence)} ${by - 26} V${by + 26}"/>`;
  out += `<text class="ann" x="${x(s.q1)}" y="${by - bh / 2 - 6}" text-anchor="end">Q1 ${f(s.q1)}</text>`;
  out += `<text class="ann strong" x="${x(s.median)}" y="${by - bh / 2 - 20}" text-anchor="middle">median ${f(s.median)}</text>`;
  out += `<text class="ann" x="${x(s.q3)}" y="${by - bh / 2 - 6}" text-anchor="start">Q3 ${f(s.q3)}</text>`;
  out += `<text class="ann" x="${x(s.whiskerLow)}" y="${by + 30}" text-anchor="start">min ${f(s.whiskerLow)}</text>`;
  out += `<text class="ann" x="${x(s.whiskerHigh)}" y="${by + 30}" text-anchor="end">max ${f(s.whiskerHigh)}</text>`;
  if (s.outliers.length) out += `<text class="ann outt" x="${x(s.outliers[s.outliers.length - 1]!)}" y="${by + 44}" text-anchor="end">outlier${s.outliers.length > 1 ? 's' : ''}</text>`;
  // axis
  const ay = H - 26;
  out += `<path class="axis" d="M${L} ${ay} H${W - R}"/>`;
  for (let v = lo; v <= hi + 1e-9; v += step) out += `<path class="axis" d="M${x(v)} ${ay} v5"/><text class="tick" x="${x(v)}" y="${ay + 18}" text-anchor="middle">${f(Number(v.toFixed(6)))}</text>`;
  out += `<text class="unit" x="${W - R}" y="${ay - 6}" text-anchor="end">${unit}</text>`;
  return out;
}

export function statsHtml(values: number[]): string {
  if (values.length < 4) return '<p>At least 4 values are needed to find quartiles.</p>';
  const s: Summary = summarise(values);
  const row = (k: string, v: string) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
  return '<dl>'
    + row('n', String(s.n))
    + row('Mean', f(Number(s.mean.toFixed(1))))
    + row('Median', f(s.median))
    + row('Mode', s.modes.length ? s.modes.map(f).join(', ') : 'none (no repeats)')
    + row('Q1 / Q3', `${f(s.q1)} / ${f(s.q3)}`)
    + row('IQR = Q3 − Q1', f(s.iqr))
    + row('Outlier limits', `below ${f(s.lowFence)} or above ${f(s.highFence)}`)
    + row('Outliers', s.outliers.length ? s.outliers.map(f).join(', ') : 'none')
    + '</dl>';
}

export function summaryText(values: number[], unit: string): string {
  if (values.length < 4) return 'Enter at least 4 values.';
  const s = summarise(values);
  const u = unit === 'cm' ? ' cm' : '';
  return `${s.n} values. Median ${f(s.median)}${u}, Q1 ${f(s.q1)}, Q3 ${f(s.q3)}, IQR ${f(s.iqr)}. 1.5 × IQR = ${f(1.5 * s.iqr)}, so outliers are below ${f(s.lowFence)} or above ${f(s.highFence)}: ${s.outliers.length ? s.outliers.map(f).join(', ') : 'there are none'}. Whiskers run from ${f(s.whiskerLow)} to ${f(s.whiskerHigh)}. Mean ${f(Number(s.mean.toFixed(1)))}${s.outliers.length ? ' (pulled towards the outlier, so the median is the better average here)' : ''}.`;
}
