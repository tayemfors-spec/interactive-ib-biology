import { ease, lerp, phase } from '../lib/timeline';
import { curve, moments, normal, removed, type Pattern } from '../sims/models/d4-1-distributions';

/**
 * Stabilizing, directional and disruptive selection (D4.1.12), then artificial selection (D4.1.15), as
 * trait distributions. The curves come from src/sims/models/d4-1-distributions.ts (unit-tested): the dashed
 * curve is the starting population, the shaded band the individuals that selection removes, and the solid
 * curve the population after selection. d4-1-selection-types.astro draws the step-1 state.
 */
export const PATTERNS: Pattern[] = ['start', 'stabilizing', 'directional', 'disruptive', 'artificial'];
export const X0 = 46, X1 = 500, BASE = 292, TOP = 96;
const YMAX = 0.8;
const px = (x: number) => X0 + ((x + 3.6) / 7.2) * (X1 - X0);
const py = (y: number) => BASE - (Math.min(y, YMAX) / YMAX) * (BASE - TOP);

const pts = (c: { x: number; y: number }[]) => c.map((p) => [px(p.x), py(p.y)] as [number, number]);
const toPath = (ps: [number, number][]) => ps.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');

const START = curve('start');
export const START_PATH = toPath(pts(START));
const CURVES = Object.fromEntries(PATTERNS.map((p) => [p, curve(p)])) as Record<Pattern, { x: number; y: number }[]>;
/** Band between the starting curve and the survivors' share: the individuals selected against. */
export function removedPath(p: Pattern): string {
  if (p === 'start') return '';
  const r = removed(p);
  const top = r.map((q) => [px(q.x), py(normal(q.x))] as [number, number]);
  const bottom = r.map((q) => [px(q.x), py(normal(q.x) - q.y)] as [number, number]).reverse();
  return `${toPath([...top, ...bottom])}Z`;
}
export const MEAN0 = px(0);
export const meanX = (p: Pattern) => px(moments(CURVES[p]).mean);

export function create(svg: SVGSVGElement) {
  const q = <T extends SVGElement>(k: string) => svg.querySelector<T>(`[data-el="${k}"]`)!;
  const show = (el: SVGElement, o: number) => { el.style.opacity = o.toFixed(3); };
  const after = q<SVGPathElement>('after');
  const band = q<SVGPathElement>('removed');
  const mean1 = q<SVGLineElement>('mean1');
  const arrow = q<SVGPathElement>('shift');
  const startPts = pts(START);

  function render(index: number, t: number) {
    const pat = PATTERNS[index]!;
    PATTERNS.forEach((_, i) => show(q(`h${i}`), i === index ? 1 : 0));
    const cut = index === 0 ? 0 : ease(phase(t, 0, 0.35));
    const morph = index === 0 ? 0 : ease(phase(t, 0.35, 1));
    band.setAttribute('d', removedPath(pat));
    show(band, cut);
    const target = pts(CURVES[pat]);
    after.setAttribute('d', toPath(startPts.map(([x, y], i) => [x, lerp(y, target[i]![1], morph)] as [number, number])));
    show(q('before'), index === 0 ? 0 : 1);
    const mx = lerp(MEAN0, meanX(pat), morph);
    mean1.setAttribute('x1', mx.toFixed(1));
    mean1.setAttribute('x2', mx.toFixed(1));
    const shift = mx - MEAN0;
    show(arrow, Math.abs(shift) > 6 ? 1 : 0);
    arrow.setAttribute('d', `M${MEAN0.toFixed(1)} 82 H${(mx - Math.sign(shift) * 2).toFixed(1)} M${(mx - Math.sign(shift) * 9).toFixed(1)} 76 L${mx.toFixed(1)} 82 L${(mx - Math.sign(shift) * 9).toFixed(1)} 88`);
    show(q('key'), index === 0 ? 0 : 1);
  }
  render(0, 0);
  return { render, durations: [3, 6, 6, 6, 6] };
}
