/**
 * Lotka–Volterra model of competition between two species, A and B (B4.2.13).
 *
 *   dA/dt = rA · A · (KA − A − αAB · B) / KA
 *   dB/dt = rB · B · (KB − B − αBA · A) / KB
 *
 * r is the intrinsic growth rate, K the carrying capacity when the species lives alone, and α a
 * competition coefficient: αAB is how strongly one individual of B reduces the growth of A, measured
 * against one individual of A (so α = 1 means an individual of the other species competes as strongly
 * as one of your own; α < 1 means the niches only partly overlap). The model is a simple textbook
 * idealisation (Lotka 1925; Volterra 1926; Gause 1934), solved here by fixed-step fourth-order
 * Runge–Kutta integration, so the same inputs always give the same output.
 */
export interface Sp { r: number; K: number; /** effect of the other species on this one */ alpha: number }
export interface CompParams { a: Sp; b: Sp }
export type Outcome = 'coexist' | 'a' | 'b' | 'depends' | 'neutral';

const EPS = 1e-9;

export function derivs(A: number, B: number, p: CompParams): [number, number] {
  const dA = (p.a.r * A * (p.a.K - A - p.a.alpha * B)) / p.a.K;
  const dB = (p.b.r * B * (p.b.K - B - p.b.alpha * A)) / p.b.K;
  return [dA, dB];
}

export interface Run { t: number[]; a: number[]; b: number[] }

/**
 * Integrate from (a0, b0) for `tEnd` time units. Use a0 or b0 = 0 to grow one species alone.
 * Samples are recorded every `every` steps.
 */
/** Length of the run shown in the simulation. */
export const T_END = 50;

export function simulate(p: CompParams, a0 = 5, b0 = 5, tEnd = T_END, dt = 0.05, every = 10): Run {
  const out: Run = { t: [0], a: [a0], b: [b0] };
  let A = a0;
  let B = b0;
  const steps = Math.round(tEnd / dt);
  for (let i = 1; i <= steps; i++) {
    const [k1a, k1b] = derivs(A, B, p);
    const [k2a, k2b] = derivs(A + (dt / 2) * k1a, B + (dt / 2) * k1b, p);
    const [k3a, k3b] = derivs(A + (dt / 2) * k2a, B + (dt / 2) * k2b, p);
    const [k4a, k4b] = derivs(A + dt * k3a, B + dt * k3b, p);
    A = Math.max(0, A + (dt / 6) * (k1a + 2 * k2a + 2 * k3a + k4a));
    B = Math.max(0, B + (dt / 6) * (k1b + 2 * k2b + 2 * k3b + k4b));
    if (i % every === 0) { out.t.push(Number((i * dt).toFixed(6))); out.a.push(A); out.b.push(B); }
  }
  return out;
}

/** Value of a run at time t (nearest recorded sample). */
export function at(run: Run, t: number): { a: number; b: number } {
  let i = 0;
  while (i < run.t.length - 1 && run.t[i + 1]! <= t + 1e-9) i++;
  return { a: run.a[i]!, b: run.b[i]! };
}

/**
 * Long-run outcome from the invasion criteria. A can invade a population of B sitting at its
 * carrying capacity if KA > αAB · KB, and B can invade A if KB > αBA · KA.
 */
export function outcome(p: CompParams): Outcome {
  const aInv = p.a.K - p.a.alpha * p.b.K;
  const bInv = p.b.K - p.b.alpha * p.a.K;
  const sign = (x: number) => (x > EPS ? 1 : x < -EPS ? -1 : 0);
  const sa = sign(aInv);
  const sb = sign(bInv);
  if (sa > 0 && sb > 0) return 'coexist';
  if (sa === 0 && sb === 0) return 'neutral';
  if (sa >= 0 && sb <= 0) return 'a';
  if (sa <= 0 && sb >= 0) return 'b';
  return 'depends';
}

/** The stable mixed equilibrium when the species coexist; otherwise null. */
export function equilibrium(p: CompParams): { a: number; b: number } | null {
  if (outcome(p) !== 'coexist') return null;
  const d = 1 - p.a.alpha * p.b.alpha;
  return { a: (p.a.K - p.a.alpha * p.b.K) / d, b: (p.b.K - p.b.alpha * p.a.K) / d };
}

export const outcomeText: Record<Outcome, string> = {
  coexist: 'Both species coexist, each at a lower population than alone — as when competing species divide resources so their realized niches differ.',
  a: 'Species A excludes species B: B declines towards zero (competitive exclusion).',
  b: 'Species B excludes species A: A declines towards zero (competitive exclusion).',
  depends: 'Competition between the species is stronger than within each species, so whichever species gets ahead first excludes the other.',
  neutral: 'The two species are exactly equivalent competitors (an identical niche), so the model cannot predict a winner. In reality the smallest difference, or chance, decides which one is excluded.',
};

export interface Preset { id: string; label: string; note: string; p: CompParams; start: [number, number] }

/** Illustrative settings. They reproduce the outcomes Gause reported, not his measured numbers. */
export const presets: Preset[] = [
  {
    id: 'exclusion',
    label: 'Gause: P. aurelia + P. caudatum',
    note: 'Similar niches (both fed on the same bacteria). A = P. aurelia, B = P. caudatum: grown alone both thrive, grown together P. caudatum dies out.',
    p: { a: { r: 0.5, K: 100, alpha: 0.6 }, b: { r: 0.5, K: 80, alpha: 1.4 } },
    start: [5, 5],
  },
  {
    id: 'coexist',
    label: 'Gause: P. caudatum + P. bursaria',
    note: 'Different niches: P. caudatum fed mainly on bacteria suspended in the medium and P. bursaria mainly on yeast at the bottom. A = P. caudatum, B = P. bursaria: both persist, at lower numbers than alone.',
    p: { a: { r: 0.5, K: 100, alpha: 0.4 }, b: { r: 0.4, K: 80, alpha: 0.5 } },
    start: [5, 5],
  },
  {
    id: 'founder',
    label: 'Strong competition both ways',
    note: 'Each species harms the other more than it harms itself. Here B starts with more individuals, so B wins; give A the head start and A wins instead.',
    p: { a: { r: 0.5, K: 100, alpha: 1.3 }, b: { r: 0.5, K: 100, alpha: 1.3 } },
    start: [5, 10],
  },
];

export const defaultParams: CompParams = presets[0]!.p;
