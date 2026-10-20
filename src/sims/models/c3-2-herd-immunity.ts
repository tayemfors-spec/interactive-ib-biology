/**
 * Qualitative model of an outbreak in a population with some vaccinated (immune) people (C3.2.17).
 *
 * N people; a fraction `coverage` are vaccinated and fully immune (the model assumes a 100% effective
 * vaccine). Five unvaccinated people are infected at generation 0. In each generation, every infectious
 * person meets on average R₀ people chosen at random from the whole population (a Poisson-distributed
 * number of contacts), infects any contact who is still susceptible, and then recovers with immunity.
 * The display arranges the people on a grid, but contacts are random, not between neighbours.
 *
 * Each case causes on average R₀ × (fraction still susceptible) new cases, so spread stops being
 * self-sustaining once the immune fraction exceeds 1 − 1/R₀: the herd immunity threshold.
 * Randomness is seeded (mulberry32), so the same settings always give the same result.
 */
export const N = 900;
export const SEEDS = 5;

export const State = { Susceptible: 0, Vaccinated: 1, Infected: 2, Recovered: 3 } as const;
export type State = (typeof State)[keyof typeof State];

export interface HerdParams { r0: number; coverage: number; seed?: number; maxGenerations?: number }

export interface HerdResult {
  /** Generation (0, 1, 2 …) at which each person was infected, or −1 if never. */
  infectedAt: Int16Array;
  vaccinated: Uint8Array;
  /** New infections in each generation (index 0 = the people infected at the start). */
  newCases: number[];
  totalInfected: number;
  /** Unvaccinated people who were never infected. */
  protectedUnvaccinated: number;
  generations: number;
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function poisson(mean: number, rand: () => number): number {
  const limit = Math.exp(-mean);
  let k = 0;
  let p = rand();
  while (p > limit) { k++; p *= rand(); }
  return k;
}

/** Herd immunity threshold as a fraction: 1 − 1/R₀ (0 when R₀ ≤ 1). */
export const threshold = (r0: number) => (r0 <= 1 ? 0 : 1 - 1 / r0);

/**
 * Compares coverage with the threshold. Values within a small tolerance (for floating-point error, well
 * under the 1% slider step) count as "at" it: each case then infects about one other person on average.
 */
export const AT_TOLERANCE = 0.001;
export function compareToThreshold(coverage: number, thr: number): 'above' | 'at' | 'below' {
  if (Math.abs(coverage - thr) <= AT_TOLERANCE) return 'at';
  return coverage > thr ? 'above' : 'below';
}

export function simulate(p: HerdParams): HerdResult {
  const r0 = Math.max(0.5, Math.min(20, p.r0));
  const coverage = Math.max(0, Math.min(1, p.coverage));
  const rand = mulberry32(p.seed ?? 11);
  const maxG = p.maxGenerations ?? 60;

  // choose exactly round(coverage × N) vaccinated people, spread at random over the grid
  const order = Array.from({ length: N }, (_, i) => i);
  for (let i = N - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [order[i], order[j]] = [order[j]!, order[i]!]; }
  const nVac = Math.round(coverage * N);
  const vaccinated = new Uint8Array(N);
  for (let k = 0; k < nVac; k++) vaccinated[order[k]!] = 1;

  const infectedAt = new Int16Array(N).fill(-1);
  let current: number[] = [];
  for (let k = nVac; k < Math.min(N, nVac + SEEDS); k++) { infectedAt[order[k]!] = 0; current.push(order[k]!); }
  const newCases = [current.length];

  let g = 0;
  while (current.length && g < maxG) {
    g++;
    const next: number[] = [];
    for (let c = 0; c < current.length; c++) {
      const contacts = poisson(r0, rand);
      for (let k = 0; k < contacts; k++) {
        const who = Math.floor(rand() * N);
        if (!vaccinated[who] && infectedAt[who] === -1) { infectedAt[who] = g; next.push(who); }
      }
    }
    newCases.push(next.length);
    current = next;
  }
  // trim trailing zero generation
  while (newCases.length > 1 && newCases[newCases.length - 1] === 0) newCases.pop();

  let totalInfected = 0, protectedUnvaccinated = 0;
  for (let i = 0; i < N; i++) {
    if (infectedAt[i]! >= 0) totalInfected++;
    else if (!vaccinated[i]) protectedUnvaccinated++;
  }
  return { infectedAt, vaccinated, newCases, totalInfected, protectedUnvaccinated, generations: newCases.length - 1 };
}

/** State of person i at generation g (infectious during the generation they were infected in). */
export function stateAt(r: HerdResult, i: number, g: number): State {
  if (r.vaccinated[i]) return State.Vaccinated;
  const at = r.infectedAt[i]!;
  if (at < 0 || at > g) return State.Susceptible;
  return at === g ? State.Infected : State.Recovered;
}
