/**
 * Qualitative individual-based model of John Endler's guppy experiments (D4.1.7, D4.1.8).
 *
 * Male guppies (Poecilia reticulata) carry coloured spots; here the number of spots on a male (0–20) is set
 * by ten additive genes. Females carry the same genes but do not show the spots (sex-limited expression).
 * Two selection pressures act on the spots:
 *   • sexual selection: females prefer colourful males, so a male's share of matings is weighted by
 *     exp(PREF × preference × spots);
 *   • natural selection by predators that hunt by sight: an adult male survives with probability
 *     exp(−PRED × predation × spots). The pike cichlid (Crenicichla) is a strong predator of adult guppies;
 *     Rivulus hartii is a weak one that mostly takes juveniles. Its juvenile predation is not modelled
 *     separately: here Rivulus acts only as RIVULUS_FACTOR of the cichlid's effect on spotty adult males.
 *     "None" pools have no predator.
 * Every generation all juveniles are equally likely to survive to adulthood (density regulation), so the only
 * selection on spots comes from the two pressures above.
 *
 * Design, after Endler (1980): one varied stock founds ten pools; all pools are kept predator-free for a few
 * generations, then predators are added — pike cichlid in four pools, Rivulus in four, and two pools stay
 * predator-free as controls. A transplant (after Endler's 1976 field transplant) moves fish from a pike
 * cichlid pool into a new pool with only Rivulus. The numbers are illustrative, not Endler's data.
 */
import { mulberry32, pickWeighted, shuffle, type Rng } from './d4-1-rng';

export const G_LOCI = 10;
export const MAX_SPOTS = 2 * G_LOCI;
/** Adults per pool after density regulation (half male, half female). */
export const POOL_N = 120;
export const YOUNG_PER_FEMALE = 6;
export const G_MUTATION = 0.002;
export const PREF = 0.14;
export const PRED = 0.2;
export const RIVULUS_FACTOR = 0.1;
/** Generations in the common, predator-free start before predators are added. */
export const FOUNDING = 3;
/** Generation at which fish are moved from a pike cichlid pool to a new Rivulus pool. */
export const TRANSPLANT = 14;
export const END = 28;

export type Predator = 'cichlid' | 'rivulus' | 'none';
export const POOLS: Predator[] = ['cichlid', 'cichlid', 'cichlid', 'cichlid', 'rivulus', 'rivulus', 'rivulus', 'rivulus', 'none', 'none'];

export interface GuppyParams {
  /** Strength of female preference for colourful males, 0–1. */
  preference: number;
  /** Strength of pike cichlid predation on conspicuous adult males, 0–1. */
  predation: number;
}
export const DEFAULT_GUPPY: GuppyParams = { preference: 0.6, predation: 0.7 };

interface Fish { male: boolean; g: Uint8Array }
const spots = (f: Fish) => f.g.reduce((a, b) => a + b, 0);

/** Survival chance of an adult male with `n` spots under a given predator. */
export function maleSurvival(n: number, predator: Predator, predation: number): number {
  const k = predator === 'cichlid' ? 1 : predator === 'rivulus' ? RIVULUS_FACTOR : 0;
  return Math.exp(-PRED * predation * k * n);
}
/** Relative mating success of a male with `n` spots. */
export const attractiveness = (n: number, preference: number) => Math.exp(PREF * preference * n);

function newFish(rng: Rng, male: boolean, p: number): Fish {
  return { male, g: Uint8Array.from({ length: MAX_SPOTS }, () => (rng() < p ? 1 : 0)) };
}

function gamete(rng: Rng, f: Fish): Uint8Array {
  const out = new Uint8Array(G_LOCI);
  for (let l = 0; l < G_LOCI; l++) {
    let a = f.g[2 * l + (rng() < 0.5 ? 0 : 1)]!;
    if (rng() < G_MUTATION) a = 1 - a;
    out[l] = a;
  }
  return out;
}

/** One generation in one pool. Returns the next adults and the mean spots of males that survived predation. */
export function generation(rng: Rng, adults: Fish[], predator: Predator, p: GuppyParams): { next: Fish[]; meanSpots: number } {
  const males = adults.filter((f) => f.male && rng() < maleSurvival(spots(f), predator, p.predation));
  const females = adults.filter((f) => !f.male);
  const meanSpots = males.length ? males.reduce((a, m) => a + spots(m), 0) / males.length : NaN;
  if (!males.length || !females.length) return { next: [], meanSpots };
  const cum: number[] = [];
  let acc = 0;
  for (const m of males) { acc += attractiveness(spots(m), p.preference); cum.push(acc); }
  const young: Fish[] = [];
  for (const mum of females) {
    for (let c = 0; c < YOUNG_PER_FEMALE; c++) {
      const dad = males[pickWeighted(rng, cum)]!;
      const e = gamete(rng, mum), s = gamete(rng, dad);
      const g = new Uint8Array(MAX_SPOTS);
      for (let l = 0; l < G_LOCI; l++) { g[2 * l] = e[l]!; g[2 * l + 1] = s[l]!; }
      young.push({ male: rng() < 0.5, g });
    }
  }
  // random juvenile deaths (including Rivulus eating juveniles) leave the pool at its carrying capacity
  return { next: shuffle(rng, young).slice(0, POOL_N), meanSpots };
}

export interface PoolSeries { predator: Predator; spots: number[] }
export interface Experiment {
  pools: PoolSeries[];
  /** Mean of each treatment's replicate pools, generation by generation. */
  means: Record<Predator, number[]>;
  /** Transplanted population (NaN before the transplant). */
  transplant: number[];
}

const sample = (rng: Rng, from: Fish[], n: number): Fish[] => shuffle(rng, [...from]).slice(0, n).map((f) => ({ male: f.male, g: f.g.slice() }));

/** Run the whole experiment. Same seed and parameters → same result. */
export function runExperiment(p: GuppyParams, seed: number): Experiment {
  const rng = mulberry32(seed);
  // a varied founding stock, as Endler mixed fish from many sites
  const stock = Array.from({ length: POOL_N * 4 }, (_, i) => newFish(rng, i % 2 === 0, 0.5));
  const pools = POOLS.map((predator) => ({ predator, adults: sample(rng, stock, POOL_N) as Fish[], spots: [] as number[] }));
  const transplant: number[] = new Array(END + 1).fill(NaN);
  let moved: Fish[] = [];
  for (let gen = 0; gen <= END; gen++) {
    for (const pool of pools) {
      const pred: Predator = gen < FOUNDING ? 'none' : pool.predator;
      const r = generation(rng, pool.adults, pred, p);
      pool.spots.push(r.meanSpots);
      if (gen === TRANSPLANT && pool === pools[0]) moved = sample(rng, pool.adults, POOL_N / 2);
      pool.adults = r.next;
    }
    if (gen >= TRANSPLANT) {
      if (gen === TRANSPLANT) {
        // the transplanted fish are counted when they arrive: same males as the source pool
        transplant[gen] = pools[0]!.spots[gen]!;
      } else {
        const r = generation(rng, moved, 'rivulus', p);
        transplant[gen] = r.meanSpots;
        moved = r.next;
      }
    }
  }
  const means = { cichlid: [], rivulus: [], none: [] } as Record<Predator, number[]>;
  for (const k of ['cichlid', 'rivulus', 'none'] as Predator[]) {
    const ps = pools.filter((q) => q.predator === k);
    for (let gen = 0; gen <= END; gen++) {
      const vals = ps.map((q) => q.spots[gen]!).filter(Number.isFinite);
      means[k].push(vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : NaN);
    }
  }
  return { pools: pools.map((q) => ({ predator: q.predator, spots: q.spots })), means, transplant };
}
