/**
 * Population growth models for C4.1.
 *  - Exponential: N(t) = N0·e^(rt). Unlimited resources, constant per-capita growth rate r.
 *  - Logistic (sigmoid): N(t) = K / (1 + ((K − N0)/N0)·e^(−rt)). The per-capita rate falls linearly
 *    as N approaches the carrying capacity K (density-dependent negative feedback); it equals
 *    the exponential curve while N is small compared with K.
 */
export const exponential = (n0: number, r: number, t: number) => n0 * Math.exp(r * t);

export function logistic(n0: number, r: number, k: number, t: number): number {
  if (n0 <= 0) return 0;
  return k / (1 + ((k - n0) / n0) * Math.exp(-r * t));
}

/** Per-capita growth rate of the logistic model at size n. */
export const perCapita = (r: number, k: number, n: number) => r * (1 - n / k);
/** Absolute growth rate dN/dt of the logistic model; greatest at n = K/2 (the inflection point). */
export const absoluteRate = (r: number, k: number, n: number) => r * n * (1 - n / k);

/** Phase boundaries, as fractions of K. The change is gradual; these cut-offs are a convention. */
export const EXP_END = 0.25;
export const PLATEAU_START = 0.95;
export type Phase = 'exponential' | 'transitional' | 'plateau';

export function phaseOf(n: number, k: number): Phase {
  const f = n / k;
  if (f < EXP_END) return 'exponential';
  if (f < PLATEAU_START) return 'transitional';
  return 'plateau';
}

/** Time at which the logistic curve reaches the fraction f of K. */
export function timeToFraction(n0: number, r: number, k: number, f: number): number {
  return Math.log(((k - n0) / n0) * (f / (1 - f))) / r;
}

/**
 * Illustrative duckweed (Lemna) data: number of fronds in a beaker of mineral-ion solution, counted
 * every two days. Invented to show the typical pattern of a classroom investigation; not real measurements.
 */
export const duckweed: ReadonlyArray<{ day: number; fronds: number }> = [
  [0, 12], [2, 20], [4, 35], [6, 65], [8, 98], [10, 141], [12, 186],
  [14, 230], [16, 256], [18, 289], [20, 309], [22, 300], [24, 301], [26, 327],
].map(([day, fronds]) => ({ day: day!, fronds: fronds! }));

/** Root-mean-square difference between the logistic model and the duckweed data (goodness of fit). */
export function rmsError(r: number, k: number, n0 = duckweed[0]!.fronds): number {
  const sq = duckweed.map((p) => (logistic(n0, r, k, p.day) - p.fronds) ** 2);
  return Math.sqrt(sq.reduce((a, b) => a + b, 0) / sq.length);
}
