import { ease, lerp, phase } from '../lib/timeline';

/**
 * Allopatric speciation of bonobos and common chimpanzees (A4.1.7), then two AHL steps on sympatric
 * speciation (A4.1.8): behavioural isolation in apple maggot flies and temporal isolation in periodical cicadas.
 * Positions are shared with a4-1-speciation.astro, which draws the step-1 state.
 */
type XY = [number, number];

/** Small deterministic random generator so the server drawing and the driver agree. */
function lcg(seed: number) {
  let s = seed;
  return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
}
function scatter(n: number, x0: number, x1: number, y0: number, y1: number, cols: number, seed: number): XY[] {
  const r = lcg(seed);
  const rows = Math.ceil(n / cols);
  const out: XY[] = [];
  for (let i = 0; i < n; i++) {
    const c = i % cols;
    const row = Math.floor(i / cols);
    const x = x0 + ((c + 0.5 + (r() - 0.5) * 0.6) * (x1 - x0)) / cols;
    const y = y0 + ((row + 0.5 + (r() - 0.5) * 0.6) * (y1 - y0)) / rows;
    out.push([Math.round(x), Math.round(y)]);
  }
  return out;
}

export const NORTH: XY[] = scatter(20, 24, 330, 62, 134, 7, 7);
export const SOUTH: XY[] = scatter(12, 24, 330, 236, 312, 6, 11);
/** Indices of the northern apes that found the southern population. */
export const FOUNDERS = [3, 8, 10, 15, 18];
export const RIVER = 'M0 178 C80 152 140 198 220 172 S360 150 430 180 S500 178 520 170';
export const BAR_W = 130;

// sympatric (behavioural): flies start mixed between the trees and settle on their host
export const FLY_START: XY[] = scatter(16, 150, 370, 150, 290, 6, 5);
export const HAW: XY = [120, 178];
export const APPLE: XY = [400, 178];
export const FLY_END: XY[] = FLY_START.map((_, i) => {
  const host = i % 2 === 0 ? HAW : APPLE;
  const k = Math.floor(i / 2);
  const a = (k / 8) * Math.PI * 2 + 0.4;
  const rr = 22 + (k % 3) * 12;
  return [Math.round(host[0] + Math.cos(a) * rr), Math.round(host[1] - 6 + Math.sin(a) * rr * 0.7)];
});

// temporal: 17-year and 13-year broods on a 0–221-year axis
export const YEARS = 221;
export const TX0 = 40;
export const TX1 = 480;
export const tx = (yr: number) => TX0 + (yr / YEARS) * (TX1 - TX0);
export const B17 = Array.from({ length: 13 }, (_, i) => 17 * (i + 1));
export const B13 = Array.from({ length: 17 }, (_, i) => 13 * (i + 1));

export function create(svg: SVGSVGElement) {
  const q = <T extends SVGElement>(k: string) => svg.querySelector<T>(`[data-el="${k}"]`)!;
  const all = <T extends SVGElement>(sel: string) => [...svg.querySelectorAll<T>(sel)];
  const show = (el: SVGElement, o: number) => { el.style.opacity = o.toFixed(3); };
  const north = all<SVGCircleElement>('[data-ape="n"]');
  const south = all<SVGCircleElement>('[data-ape="s"]');
  const flies = all<SVGCircleElement>('[data-fly]');
  const d17 = all<SVGCircleElement>('[data-b17]');
  const d13 = all<SVGCircleElement>('[data-b13]');
  const river = q<SVGPathElement>('river');
  const mix = (a: XY, b: XY, t: number): XY => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  const put = (c: SVGCircleElement, [x, y]: XY) => { c.setAttribute('cx', x.toFixed(1)); c.setAttribute('cy', y.toFixed(1)); };
  const bar = (k: string, p: number) => { q(k).setAttribute('width', (BAR_W * p).toFixed(1)); };
  const southColour = (p: number) => `color-mix(in srgb, var(--bio-na) ${Math.round(p * 100)}%, var(--bio-protein))`;

  function render(index: number, t: number) {
    // --- which panel is visible ---
    const inSymB = index === 5 ? ease(phase(t, 0, 0.2)) : 0;
    const inSymT = index === 6 ? ease(phase(t, 0, 0.2)) : 0;
    show(q('allo'), index < 5 ? 1 : index === 5 ? 1 - inSymB : 0);
    show(q('symB'), index === 5 ? inSymB : 0);
    show(q('symT'), inSymT);

    // --- allopatric panel ---
    let width = 26;
    if (index === 1) width = lerp(26, 7, ease(phase(t, 0, 0.3)));
    if (index === 2) width = lerp(7, 26, ease(phase(t, 0, 0.5)));
    river.setAttribute('stroke-width', width.toFixed(1));
    show(q('low'), index === 1 ? ease(phase(t, 0, 0.3)) : 0);

    const cross = index === 1 ? ease(phase(t, 0.35, 0.95)) : index > 1 ? 1 : 0;
    north.forEach((c, i) => {
      const f = FOUNDERS.indexOf(i);
      put(c, f >= 0 ? mix(NORTH[i]!, SOUTH[f]!, cross) : NORTH[i]!);
      if (f >= 0) c.style.fill = southColour(index === 3 ? ease(t) : index > 3 ? 1 : 0);
    });
    const born = index === 3 ? ease(phase(t, 0.1, 0.6)) : index > 3 ? 1 : 0;
    south.forEach((c, i) => {
      if (i < FOUNDERS.length) { show(c, 0); return; }
      show(c, born);
      c.style.fill = southColour(index === 3 ? ease(t) : index > 3 ? 1 : 0);
    });

    show(q('flow'), index === 0 ? 1 : 0);
    show(q('block'), index === 2 ? ease(phase(t, 0.5, 0.9)) : index > 2 ? 1 : 0);
    show(q('sPool'), index === 1 ? ease(phase(t, 0.85, 1)) : index > 1 ? 1 : 0);
    const sel = index === 3 ? ease(phase(t, 0.2, 1)) : index > 3 ? 1 : 0;
    bar('barN', lerp(0.5, 0.3, sel));
    bar('barS', lerp(0.8, 0.95, sel));
    show(q('tags'), index === 3 ? ease(phase(t, 0, 0.3)) : 0);
    show(q('names'), index === 4 ? ease(phase(t, 0, 0.4)) : 0);

    // --- sympatric: host races of the apple maggot fly ---
    const settle = index === 5 ? ease(phase(t, 0.2, 0.8)) : index > 5 ? 1 : 0;
    flies.forEach((c, i) => {
      put(c, mix(FLY_START[i]!, FLY_END[i]!, settle));
      const apple = i % 2 === 1;
      c.style.fill = apple ? `color-mix(in srgb, var(--bio-head) ${Math.round(settle * 100)}%, var(--bio-protein))` : 'var(--bio-protein)';
    });
    show(q('hostLbl'), index === 5 ? ease(phase(t, 0.7, 1)) : 0);

    // --- sympatric: periodical cicadas ---
    const yr = index === 6 ? lerp(0, YEARS, ease(phase(t, 0.15, 0.9))) : 0;
    d17.forEach((c, i) => show(c, B17[i]! <= yr + 0.01 ? 1 : 0));
    d13.forEach((c, i) => show(c, B13[i]! <= yr + 0.01 ? 1 : 0));
    show(q('meet'), index === 6 ? ease(phase(t, 0.9, 1)) : 0);
  }
  render(0, 0);
  return { render, durations: [4, 5, 4, 6, 4, 6, 7] };
}
