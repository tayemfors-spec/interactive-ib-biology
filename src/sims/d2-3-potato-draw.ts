/**
 * SVG markup and table rows for the D2.3 tissue experiment, shared by the server render and the
 * browser update. Colours come from global classes styled in src/sims/d2-3-potato.astro.
 */
import { range, sx, sy, type Frame } from './chart';
import type { Fit, Measure, Row } from './models/d2-3-potato';

export function potatoFrame(measure: Measure): Frame {
  const mass = measure === 'mass';
  return {
    w: 640, h: 420, left: 62, right: 18, top: 16, bottom: 56,
    x: { min: 0, max: 0.8, ticks: range(0, 0.8, 0.1), label: 'Sucrose concentration (mol dm⁻³)' },
    y: mass
      ? { min: -40, max: 30, ticks: range(-40, 30, 10), label: '% change in mass' }
      : { min: -15, max: 10, ticks: range(-15, 10, 5), label: '% change in length' },
  };
}

const f1 = (n: number) => n.toFixed(1);
const minus = (s: string) => s.replace('-', '−');
export const num = (n: number, dp = 1) => (Number.isFinite(n) ? minus(n.toFixed(dp)) : '—');

export interface DrawOpts { bars: 'se' | 'sd'; truth: number | null }

export function potatoChart(rows: Row[], fit: Fit | null, measure: Measure, o: DrawOpts): string {
  const f = potatoFrame(measure);
  const L = f.left, R = f.w - f.right, T = f.top, B = f.h - f.bottom;
  const X = (v: number) => sx(f, v), Y = (v: number) => sy(f, Math.max(f.y.min, Math.min(f.y.max, v)));
  const p: string[] = [];
  p.push(`<g class="grid">${f.x.ticks.map((t) => `<line x1="${f1(X(t))}" x2="${f1(X(t))}" y1="${T}" y2="${B}"/>`).join('')}` +
    `${f.y.ticks.map((t) => `<line x1="${L}" x2="${R}" y1="${f1(Y(t))}" y2="${f1(Y(t))}"/>`).join('')}</g>`);
  p.push(`<line class="zero" x1="${L}" x2="${R}" y1="${f1(Y(0))}" y2="${f1(Y(0))}"/>`);
  p.push(`<g class="ticks">${f.x.ticks.map((t) => `<text x="${f1(X(t))}" y="${B + 20}" text-anchor="middle">${t.toFixed(1)}</text>`).join('')}` +
    `${f.y.ticks.map((t) => `<text x="${L - 8}" y="${f1(Y(t))}" dy="0.35em" text-anchor="end">${t > 0 ? '+' : ''}${minus(String(t))}</text>`).join('')}</g>`);
  p.push(`<text class="axis" x="${(L + R) / 2}" y="${f.h - 12}" text-anchor="middle">${f.x.label} →</text>`);
  p.push(`<text class="axis" transform="translate(18 ${(T + B) / 2}) rotate(-90)" text-anchor="middle">${f.y.label}</text>`);
  p.push(`<text class="note" x="${R - 6}" y="${f1(Y(0) - 10)}" text-anchor="end">gain</text>`);
  p.push(`<text class="note" x="${R - 6}" y="${f1(Y(0) + 20)}" text-anchor="end">loss</text>`);

  if (o.truth !== null) {
    p.push(`<line class="truth" x1="${f1(X(o.truth))}" x2="${f1(X(o.truth))}" y1="${T}" y2="${B}"/>`);
    p.push(`<text class="truth-t" x="${f1(X(o.truth) + 6)}" y="${T + 14}">true value ${o.truth.toFixed(2)}</text>`);
  }

  if (fit) {
    // the best-fit line, drawn across the part of the graph near the points it was fitted to
    const x0 = Math.max(0, fit.xIntercept - 0.25), x1 = Math.min(0.8, fit.xIntercept + 0.25);
    const yAt = (x: number) => fit.intercept + fit.slope * x;
    p.push(`<line class="fit" x1="${f1(X(x0))}" y1="${f1(Y(yAt(x0)))}" x2="${f1(X(x1))}" y2="${f1(Y(yAt(x1)))}"/>`);
    if (fit.xIntercept >= 0 && fit.xIntercept <= 0.8) {
      const xi = X(fit.xIntercept);
      p.push(`<line class="drop" x1="${f1(xi)}" x2="${f1(xi)}" y1="${f1(Y(0))}" y2="${B}"/>`);
      p.push(`<circle class="xi" cx="${f1(xi)}" cy="${f1(Y(0))}" r="6"/>`);
      p.push(`<text class="xi-t" x="${f1(xi - 8)}" y="${f1(Y(0) + 46)}" text-anchor="end">x-intercept ≈ ${fit.xIntercept.toFixed(2)}</text>`);
    }
  }

  for (const r of rows) {
    const cx = X(r.c);
    const e = o.bars === 'se' ? r.se : r.sd;
    if (Number.isFinite(e) && e > 0) {
      const a = Y(r.mean + e), b = Y(r.mean - e);
      p.push(`<path class="bar" d="M${f1(cx)} ${f1(a)} V${f1(b)} M${f1(cx - 6)} ${f1(a)} H${f1(cx + 6)} M${f1(cx - 6)} ${f1(b)} H${f1(cx + 6)}"/>`);
    }
    for (const s of r.samples) p.push(`<circle class="rep" cx="${f1(cx + 11)}" cy="${f1(Y(s.pct))}" r="2.6"/>`);
    p.push(`<circle class="pt" cx="${f1(cx)}" cy="${f1(Y(r.mean))}" r="5.5"/>`);
  }
  return p.join('');
}

export function potatoTable(rows: Row[], measure: Measure): { head: string; body: string } {
  const n = rows[0]?.samples.length ?? 0;
  const unit = measure === 'mass' ? 'g' : 'mm';
  const reps = Array.from({ length: n }, (_, i) => `<th scope="col">Rep ${i + 1}<br/>(${unit}, % change)</th>`).join('');
  const head = `<tr><th scope="col">Sucrose<br/>(mol dm⁻³)</th>${reps}<th scope="col">Mean %</th><th scope="col">SD</th><th scope="col">SE</th></tr>`;
  const dp = measure === 'mass' ? 2 : 0;
  const body = rows.map((r) => `<tr><th scope="row">${r.c.toFixed(1)}</th>${r.samples.map((s) => `<td>${s.initial.toFixed(dp)} → ${s.final.toFixed(dp)}<br/><span class="pc">${num(s.pct)}</span></td>`).join('')}` +
    `<td>${num(r.mean)}</td><td>${num(r.sd)}</td><td>${num(r.se)}</td></tr>`).join('');
  return { head, body };
}
