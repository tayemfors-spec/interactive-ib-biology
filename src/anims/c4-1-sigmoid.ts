import { ease, lerp } from '../lib/timeline';

/**
 * Sigmoid population growth, step by step. Population is in units of the carrying capacity (K = 1).
 * Logistic growth from N0 = 0.02 with r = 0.4; at time DROP a density-independent event (a hard frost)
 * kills 45% of the population, which then grows back to K.
 */
export const T_MAX = 32;
export const N0 = 0.02;
export const R = 0.4;
export const DROP = 23;
export const AFTER = 0.55;
export const X0 = 56, X1 = 380, Y0 = 270, YK = 70;
export const xOf = (t: number) => X0 + (t / T_MAX) * (X1 - X0);
export const yOf = (n: number) => Y0 - n * (Y0 - YK);
export const births = (n: number) => 0.5 - 0.15 * n; // per-capita birth rate falls with density
export const deaths = (n: number) => 0.1 + 0.25 * n; // per-capita death rate rises with density (equal at K)
export const BAR = 400; // px per unit rate
export const BAR_Y = 270;

const logi = (n0: number, t: number) => 1 / (1 + ((1 - n0) / n0) * Math.exp(-R * t));
export const N = (t: number) => (t < DROP ? logi(N0, t) : logi(AFTER, t - DROP));

/** Time windows of the five steps. */
const WIN: [number, number][] = [[0, 1.5], [1.5, 7], [7, 17], [17, 22], [22, 32]];
/** Phase bands (times at which N = 0.25 K and 0.95 K). */
export const T_EXP = Math.log(((1 - N0) / N0) * (0.25 / 0.75)) / R;
export const T_PL = Math.log(((1 - N0) / N0) * (0.95 / 0.05)) / R;

export function curvePath(T: number): string {
  let d = `M${xOf(0).toFixed(1)} ${yOf(N(0)).toFixed(1)}`;
  for (let t = 0.2; t <= T + 1e-9; t += 0.2) {
    if (t >= DROP && t - 0.2 < DROP) d += ` L${xOf(DROP).toFixed(1)} ${yOf(logi(N0, DROP)).toFixed(1)} L${xOf(DROP).toFixed(1)} ${yOf(AFTER).toFixed(1)}`;
    d += ` L${xOf(t).toFixed(1)} ${yOf(N(t)).toFixed(1)}`;
  }
  return T > 0 ? `${d} L${xOf(T).toFixed(1)} ${yOf(N(T)).toFixed(1)}` : d;
}

export function create(svg: SVGSVGElement) {
  const q = <T extends SVGElement>(k: string) => svg.querySelector<T>(`[data-el="${k}"]`)!;
  const curve = q<SVGPathElement>('curve');
  const dot = q<SVGCircleElement>('dot');
  const bBar = q<SVGRectElement>('b-bar');
  const dBar = q<SVGRectElement>('d-bar');
  const bands = ['band-exp', 'band-tr', 'band-pl'].map((k) => q<SVGGElement>(k));
  const notes = ['n0', 'n1', 'n2', 'n3', 'n4'].map((k) => q<SVGGElement>(k));
  const bar = (el: SVGRectElement, v: number) => { const h = v * BAR; el.setAttribute('y', (BAR_Y - h).toFixed(1)); el.setAttribute('height', h.toFixed(1)); };

  function render(index: number, t: number) {
    const [a, b] = WIN[index]!;
    const T = lerp(a, b, ease(t));
    curve.setAttribute('d', curvePath(T));
    const n = N(T);
    dot.setAttribute('cx', xOf(T).toFixed(1));
    dot.setAttribute('cy', yOf(n).toFixed(1));
    bar(bBar, births(n));
    bar(dBar, deaths(n));
    // a band is highlighted during its own step and stays faintly visible afterwards
    const bandStep = [1, 2, 3];
    bands.forEach((g, i) => { g.style.opacity = index === bandStep[i] ? '1' : index > bandStep[i]! ? '0.45' : '0'; });
    notes.forEach((g, i) => { g.style.opacity = i === index ? '1' : '0'; });
  }
  render(0, 0);
  return { render, durations: [3, 4, 5, 4, 5] };
}
