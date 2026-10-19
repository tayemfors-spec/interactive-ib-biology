/**
 * Simulated plant-tissue osmosis experiment (D2.3.4). Qualitative model, simulated data.
 *
 * Cylinders of tissue are bathed in sucrose solutions. Each tissue has a true "isotonic"
 * concentration cIso: the solution in which there is no net movement of water, so no mass change.
 *  - Below cIso the solution is hypotonic: the tissue gains water, but the gain levels off because
 *    the cell walls resist expansion (turgor pressure builds up).
 *  - Above cIso the solution is hypertonic: the tissue loses water; the loss also levels off at high
 *    concentrations once the cells are plasmolysed.
 * Random variation between samples is generated from a seeded pseudo-random generator, so the same
 * seed always gives the same "results" (server render, browser and tests agree).
 */

export type Measure = 'mass' | 'length';

export interface Tissue { id: string; cIso: number }

/** Simulated tissues (values are illustrative, not measurements). */
export const TISSUES: Tissue[] = [
  { id: 'potato', cIso: 0.3 },
  { id: 'mystery-a', cIso: 0.46 },
  { id: 'mystery-b', cIso: 0.19 },
];

/** Sucrose concentrations used, mol dm⁻³. */
export const CONCS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];

const GAIN_MAX = 22; // % maximum mass gain (limited by the cell wall)
const GAIN_K = 0.25;
const LOSS_MAX = 34; // % maximum mass loss (cells fully plasmolysed)
const LOSS_K = 0.35;

/** Expected (noise-free) % change in mass at concentration c for a tissue with isotonic point cIso. */
export function expectedMassChange(c: number, cIso: number): number {
  const d = cIso - c;
  if (d >= 0) return GAIN_MAX * (1 - Math.exp(-d / GAIN_K));
  return -LOSS_MAX * (1 - Math.exp(d / LOSS_K));
}

/** % change in length that accompanies a % change in mass (volume ∝ length³ for uniform swelling). */
export const lengthFromMass = (massPct: number) => (Math.cbrt(1 + massPct / 100) - 1) * 100;

/** Mulberry32: small seeded PRNG returning values in [0, 1). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal deviate (Box–Muller). */
export function gauss(r: () => number): number {
  const u = Math.max(r(), 1e-12), v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

/** Sample standard deviation (n − 1). NaN for fewer than two values. */
export function sd(xs: number[]): number {
  if (xs.length < 2) return NaN;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

/** Standard error of the mean = SD / √n. NaN for fewer than two values. */
export const se = (xs: number[]) => sd(xs) / Math.sqrt(xs.length);

export interface Sample { initial: number; final: number; pct: number }
export interface Row { c: number; samples: Sample[]; mean: number; sd: number; se: number }

export interface RunParams {
  cIso: number;
  repeats: number; // 1–6
  variability: number; // SD of biological variation, in % mass change
  measure: Measure;
  seed: number;
}

/**
 * Generate one experiment. Mass is read to 0.01 g on a balance (cylinders of about 2 g);
 * length to the nearest 1 mm with a ruler (cylinders 40 mm long), so length data are coarser.
 */
export function runExperiment(p: RunParams): Row[] {
  const r = rng(p.seed);
  return CONCS.map((c) => {
    const samples: Sample[] = [];
    for (let k = 0; k < p.repeats; k++) {
      const massPct = expectedMassChange(c, p.cIso) + p.variability * gauss(r);
      if (p.measure === 'mass') {
        const initial = round(1.9 + 0.5 * r(), 0.01);
        const final = round(initial * (1 + massPct / 100), 0.01);
        samples.push({ initial, final, pct: ((final - initial) / initial) * 100 });
      } else {
        r(); // keep the random sequence aligned with the mass version
        const initial = 40;
        const final = round(initial * (1 + lengthFromMass(massPct) / 100), 1);
        samples.push({ initial, final, pct: ((final - initial) / initial) * 100 });
      }
    }
    const pcts = samples.map((s) => s.pct);
    return { c, samples, mean: mean(pcts), sd: sd(pcts), se: se(pcts) };
  });
}

const round = (x: number, step: number) => Math.round(x / step) * step;

export interface Fit { slope: number; intercept: number; xIntercept: number; points: number }

/** Least-squares straight line through (x, y) points. */
export function linearFit(xs: number[], ys: number[]): Fit {
  const n = xs.length, mx = mean(xs), my = mean(ys);
  let sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) { sxy += (xs[i]! - mx) * (ys[i]! - my); sxx += (xs[i]! - mx) ** 2; }
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  return { slope, intercept, xIntercept: -intercept / slope, points: n };
}

/**
 * Line of best fit used to read off the isotonic concentration: a straight line through the mean
 * points on either side of where the data cross zero (up to two each side), as a student would draw
 * through the central part of the graph. Returns null if the means never change sign.
 */
export function isotonicFit(rows: Row[]): Fit | null {
  let k = -1;
  for (let i = 0; i < rows.length - 1; i++) if (rows[i]!.mean >= 0 && rows[i + 1]!.mean < 0) { k = i; break; }
  if (k < 0) {
    const zero = rows.findIndex((r) => r.mean === 0);
    if (zero < 0) return null;
    k = Math.max(0, zero - 1);
  }
  const pts = rows.slice(Math.max(0, k - 1), Math.min(rows.length, k + 3));
  return linearFit(pts.map((r) => r.c), pts.map((r) => r.mean));
}
