/**
 * Seeded pseudo-random numbers (mulberry32) for the D4.1 selection simulations, so a given seed always
 * produces the same population history (deterministic for unit tests and screenshots).
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

/** In-place Fisher–Yates shuffle. */
export function shuffle<T>(rng: Rng, a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/**
 * Choose k of n items without replacement, each item's chance weighted by w[i] (Efraimidis–Spirakis:
 * key = u^(1/w); the k largest keys win). Items with weight 0 are chosen only if nothing else is left.
 */
export function weightedSample(rng: Rng, w: number[], k: number): number[] {
  // log(u)/w orders items exactly as u^(1/w) does, without underflow for small weights
  const keys = w.map((wi, i) => ({ i, key: wi > 0 ? Math.log(Math.max(rng(), 1e-300)) / wi : -Infinity }));
  keys.sort((a, b) => (b.key === a.key ? a.i - b.i : b.key - a.key));
  return keys.slice(0, Math.max(0, Math.min(k, w.length))).map((x) => x.i);
}

/** Index chosen with probability proportional to its weight (all weights ≥ 0, at least one > 0). */
export function pickWeighted(rng: Rng, cum: number[]): number {
  const total = cum[cum.length - 1]!;
  const r = rng() * total;
  let lo = 0, hi = cum.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cum[mid]! > r) hi = mid; else lo = mid + 1;
  }
  return lo;
}

/** Binomial(n, p) draw: exact (n Bernoulli trials) for small n, normal approximation for large n. */
export function binomial(rng: Rng, n: number, p: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return n;
  if (n <= 400) {
    let k = 0;
    for (let i = 0; i < n; i++) if (rng() < p) k++;
    return k;
  }
  const u = Math.max(rng(), 1e-12), v = rng();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return Math.min(n, Math.max(0, Math.round(n * p + z * Math.sqrt(n * p * (1 - p)))));
}

export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
export function variance(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1);
}
