import { ease, lerp, phase } from '../lib/timeline';

/**
 * The cell cycle with cyclin control (D2.1.13–D2.1.16). A wheel on the left (G1, S, G2, mitosis,
 * cytokinesis, with G0 as an exit from G1) and, on the right, a qualitative graph of two cyclins
 * against time through one cycle with a threshold for passing each checkpoint. Absolute steps.
 */
export const CX = 150, CY = 190, RING = 100;
/** Phase boundaries as fractions of one cycle (qualitative proportions for a dividing human cell). */
export const PHASES = [
  { id: 'G1', from: 0, to: 0.417 },
  { id: 'S', from: 0.417, to: 0.708 },
  { id: 'G2', from: 0.708, to: 0.889 },
  { id: 'M', from: 0.889, to: 0.972 },
  { id: 'C', from: 0.972, to: 1 },
] as const;
export const THRESHOLD = 0.8;

/** Qualitative concentration (0–1) of the G1/S cyclin: peaks as the cell passes the G1 checkpoint. */
export const cyclinG1S = (x: number) => Math.exp(-(((x - 0.45) / 0.07) ** 2));
/** Mitotic cyclin: builds up through S and G2, crosses the threshold at the G2 checkpoint, destroyed after metaphase. */
export const cyclinM = (x: number) => {
  if (x < 0.42) return 0.05;
  if (x <= 0.93) return 0.05 + 0.95 * ((x - 0.42) / 0.51) ** 2.5;
  if (x <= 0.955) return lerp(1, 0.05, (x - 0.93) / 0.025);
  return 0.05;
};

export const GX0 = 300, GX1 = 548, GTOP = 110, GBASE = 262;
export const gx = (x: number) => GX0 + x * (GX1 - GX0);
export const gy = (v: number) => GBASE - (v / 1.05) * (GBASE - GTOP);
export const curve = (fn: (x: number) => number) =>
  Array.from({ length: 121 }, (_, i) => i / 120).map((x, i) => `${i ? 'L' : 'M'}${gx(x).toFixed(1)} ${gy(fn(x)).toFixed(1)}`).join(' ');

/** Point on the wheel at a fraction of the cycle (clockwise from the top). */
export const wheel = (frac: number, r = RING): [number, number] => {
  const a = frac * Math.PI * 2;
  return [CX + r * Math.sin(a), CY - r * Math.cos(a)];
};
export const arc = (a: number, b: number, r = RING) => {
  const [x0, y0] = wheel(a, r), [x1, y1] = wheel(b, r);
  return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${b - a > 0.5 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
};
export const G0: [number, number] = [CX + 140 * Math.sin(Math.PI * 0.22), CY - 140 * Math.cos(Math.PI * 0.22)];

/** Position along the cycle of the "this cell" marker at the end of each step. */
const MARK = [0.4, 0.43, 0.7, 0.885, 1.0];
const CURSOR = [0.4, 0.43, 0.7, 0.885, 1.0, 1.0, 1.0];

export const shown: Record<string, number[]> = {
  'c-g1': [1, 0, 0, 0, 0, 0, 0],
  'c-chk1': [0, 1, 0, 0, 0, 0, 0],
  'c-s': [0, 0, 1, 0, 0, 0, 0],
  'c-g2': [0, 0, 0, 1, 0, 0, 0],
  'c-m': [0, 0, 0, 0, 1, 0, 0],
  'c-g0': [0, 0, 0, 0, 0, 1, 0],
  'c-mut': [0, 0, 0, 0, 0, 0, 1],
  complex: [0, 1, 0, 1, 0, 0, 0],
  graph: [1, 1, 1, 1, 1, 1, 0],
  cursor: [1, 1, 1, 1, 1, 0, 0],
  g0path: [0, 0, 0, 0, 0, 1, 0],
  mut: [0, 0, 0, 0, 0, 0, 1],
  'mut-text': [0, 0, 0, 0, 0, 0, 1],
  inner: [1, 1, 1, 1, 1, 1, 0],
};

export function create(svg: SVGSVGElement) {
  const q = (k: string) => svg.querySelector<SVGGElement>(`[data-el="${k}"]`)!;
  const fades = Object.keys(shown).map((k) => [k, q(k)] as const);
  const marker = q('marker');
  const cursor = q('cursor');
  const cyclin = q('cyclin');

  function render(index: number, t: number) {
    const u = ease(t);
    const from = Math.max(0, index - 1);
    for (const [k, el] of fades) {
      const a = shown[k]![from]!, b = shown[k]![index]!;
      el.style.opacity = String(index === 0 ? b : lerp(a, b, u));
    }
    // marker: around the wheel in steps 0–4; leaves G1 for G0 in step 5; loops fast when control is lost
    let mx: number, my: number;
    if (index <= 4) {
      const f = index === 0 ? lerp(0.02, MARK[0]!, u) : lerp(MARK[index - 1]!, MARK[index]!, u);
      [mx, my] = wheel(f % 1);
    } else if (index === 5) {
      const [x0, y0] = wheel(lerp(0, 0.1, ease(phase(t, 0, 0.4))));
      const k = ease(phase(t, 0.4, 1));
      mx = lerp(x0, G0[0], k); my = lerp(y0, G0[1], k);
    } else {
      [mx, my] = wheel((0.1 + t * 3) % 1);
    }
    marker.setAttribute('transform', `translate(${mx.toFixed(1)} ${my.toFixed(1)})`);
    const cx = gx(index === 0 ? lerp(0, CURSOR[0]!, u) : lerp(CURSOR[index - 1]!, CURSOR[index]!, u));
    cursor.setAttribute('transform', `translate(${cx.toFixed(1)} 0)`);
    // a cyclin binds to its CDK at a checkpoint (steps 1 and 3), forming an active complex
    const bound = index === 1 || index === 3 ? ease(phase(t, 0.2, 0.7)) : 0;
    cyclin.setAttribute('transform', `translate(${lerp(40, 0, bound).toFixed(1)} 0)`);
  }
  render(0, 0);
  return { render, durations: [4, 4, 4, 4, 4, 4, 5] };
}
