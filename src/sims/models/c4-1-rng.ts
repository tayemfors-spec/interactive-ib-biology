/**
 * Seeded pseudo-random numbers (mulberry32) for the C4.1 sampling simulations, so a given seed always
 * produces the same field, survey or trial (deterministic for tests and screenshots).
 */
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal deviate (Box–Muller). */
export function gaussian(rng: Rng): number {
  const u = Math.max(rng(), 1e-12);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** k distinct indices from 0…n−1, chosen uniformly at random (partial Fisher–Yates shuffle). */
export function sampleIndices(rng: Rng, n: number, k: number): number[] {
  const idx = Array.from({ length: n }, (_, i) => i);
  const m = Math.max(0, Math.min(k, n));
  for (let i = 0; i < m; i++) {
    const j = i + Math.floor(rng() * (n - i));
    [idx[i], idx[j]] = [idx[j]!, idx[i]!];
  }
  return idx.slice(0, m);
}

export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Sample standard deviation (n − 1 in the denominator), as a calculator's s or σn−1 key gives. */
export function sd(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
}
