/**
 * Pressures in the left side of the heart over one cardiac cycle (B3.2.16), at 75 beats per minute
 * (one cycle = 60 / 75 = 0.8 s). Values are typical textbook ones for a resting adult, in mmHg:
 * aortic pressure 80 (diastolic) to about 120 (systolic); left ventricle about 3–120; left atrium below 15.
 *
 * Each curve passes through key points and is joined by a monotone cubic (Fritsch–Carlson), so it never
 * overshoots between points and the moments where curves cross are exactly where the key points put them:
 *   ≈0.102 s  LV pressure rises above LA  → bicuspid (AV) valve closes (first heart sound)
 *    0.150 s  LV pressure rises above aorta → aortic (semilunar) valve opens
 *    0.400 s  LV pressure falls below aorta → aortic valve closes (second heart sound)
 *   ≈0.469 s  LV pressure falls below LA  → bicuspid valve opens
 * Valve states are derived from the pressures: a valve is open only when pressure behind it is higher.
 */
export type Pt = [number, number];

export const BPM = 75;
export const CYCLE = 60 / BPM; // 0.8 s

export const LA_PTS: Pt[] = [
  [0, 5], [0.05, 10], [0.1, 7], [0.13, 4], [0.2, 5], [0.3, 7], [0.4, 10], [0.45, 11], [0.5, 7], [0.6, 5], [0.7, 4.5], [0.8, 5],
];
export const LV_PTS: Pt[] = [
  [0, 3.5], [0.05, 8], [0.1, 6], [0.12, 30], [0.15, 80], [0.2, 111], [0.26, 120], [0.33, 115], [0.4, 100], [0.43, 50], [0.47, 8.5],
  [0.5, 4], [0.6, 3], [0.7, 3], [0.8, 3.5],
];
export const AO_PTS: Pt[] = [
  [0, 84], [0.1, 81], [0.15, 80], [0.2, 108], [0.26, 118], [0.33, 112], [0.4, 100], [0.415, 95], [0.43, 98], [0.5, 95], [0.6, 90],
  [0.7, 86.5], [0.8, 84],
];

/** Monotone cubic Hermite interpolation through the points (x strictly increasing). */
export function monotone(pts: Pt[]): (x: number) => number {
  const n = pts.length;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1]! - ys[i]!) / (xs[i + 1]! - xs[i]!));
  const m: number[] = new Array(n).fill(0);
  m[0] = d[0]!;
  m[n - 1] = d[n - 2]!;
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1]! * d[i]! <= 0 ? 0 : (d[i - 1]! + d[i]!) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i]! / d[i]!, b = m[i + 1]! / d[i]!;
    const s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); m[i] = k * a * d[i]!; m[i + 1] = k * b * d[i]!; }
  }
  return (x: number) => {
    const xc = Math.min(xs[n - 1]!, Math.max(xs[0]!, x));
    let i = 0;
    while (i < n - 2 && xc > xs[i + 1]!) i++;
    const h = xs[i + 1]! - xs[i]!;
    const t = (xc - xs[i]!) / h;
    const t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i]! + (t3 - 2 * t2 + t) * h * m[i]! + (-2 * t3 + 3 * t2) * ys[i + 1]! + (t3 - t2) * h * m[i + 1]!;
  };
}

export const la = monotone(LA_PTS);
export const lv = monotone(LV_PTS);
export const ao = monotone(AO_PTS);

export interface Valves { av: boolean; sl: boolean }
/** Open/closed state of the bicuspid (AV) and aortic (semilunar) valves at time t (s). */
export const valves = (t: number): Valves => ({ av: la(t) > lv(t), sl: lv(t) > ao(t) });

/**
 * The five stages shown in the animation, as time windows. Boundaries sit just before/after the
 * pressure crossings so that each stage's end state shows what its caption describes.
 */
export const STAGES = [
  { id: 'atrial-systole', from: 0, to: 0.1 },
  { id: 'iso-contraction', from: 0.1, to: 0.148 },
  { id: 'ejection', from: 0.148, to: 0.395 },
  { id: 'iso-relaxation', from: 0.395, to: 0.465 },
  { id: 'filling', from: 0.465, to: CYCLE },
] as const;

/** The three phases named in the IB guide, for shading the graph. */
export const PHASES = [
  { name: 'Atrial systole', from: 0, to: 0.1 },
  { name: 'Ventricular systole', from: 0.1, to: 0.4 },
  { name: 'Diastole', from: 0.4, to: CYCLE },
] as const;

/** First time in [a, b] where f changes sign (bisection after a scan). */
export function crossing(f: (t: number) => number, a: number, b: number, step = 0.0005): number | null {
  let prev = f(a);
  for (let t = a + step; t <= b + 1e-12; t += step) {
    const v = f(t);
    if ((prev <= 0 && v > 0) || (prev > 0 && v <= 0)) {
      let lo = t - step, hi = t;
      for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; if ((f(mid) > 0) === (v > 0)) hi = mid; else lo = mid; }
      return (lo + hi) / 2;
    }
    prev = v;
  }
  return null;
}
