/**
 * Individual-based model of natural selection on a heritable, polygenic trait (D4.1.2–D4.1.6).
 *
 * A population of moths rests on tree bark. Wing shade (0 = palest … 12 = darkest) is set by six genes,
 * each with a "light" and a "dark" allele that add 0 or 1 to the shade (additive, unlinked genes; no
 * environmental effect on shade at birth). Each generation:
 *   1. Adults pair at random; each pair produces `offspring` young. Each parent passes one randomly chosen
 *      allele of every gene (meiosis: independent assortment), so offspring carry new combinations.
 *   2. Each allele in a gamete mutates (light ↔ dark) with a small probability: the source of new alleles.
 *   3. Food sets a carrying capacity of K adults, so only K of the young survive to breed (intraspecific
 *      competition). Birds see moths that contrast with the bark, so a young moth's chance of being among
 *      the survivors is weighted by its fitness, exp(−c × strength × |shade − bark|).
 *   4. The survivors are the next generation's parents.
 * Optionally, the survivors darken during adult life (an acquired characteristic). Gametes carry only
 * alleles, so this changes nothing in the next generation.
 * Qualitative model: real selection pressures and genetics are more complex.
 */
import { mulberry32, shuffle, weightedSample, type Rng } from './d4-1-rng';

export const LOCI = 6;
export const MAX_SHADE = 2 * LOCI;
/** Adults the habitat can support (carrying capacity, set by food). */
export const K = 200;
/** Default chance that an allele mutates to the other allele when passed to a gamete. */
export const MUTATION = 0.002;
/** Contrast penalty per shade unit at full selection strength. */
export const PENALTY = 0.7;
/** Shade added to each surviving adult during its life when the acquired-change option is on. */
export const ACQUIRED_SHIFT = 3;

export interface SelectionParams {
  /** Selection pressure (predation by birds that hunt by sight), 0–1. */
  strength: number;
  /** Shade of the bark the moths rest on, 0–12. */
  background: number;
  /** Young produced per pair (2 = just replacement, so no overproduction). */
  offspring: number;
  /** Survivors darken during adult life (acquired, not in their genes). */
  acquired: boolean;
}
export const DEFAULT_SELECTION: SelectionParams = { strength: 0.6, background: 9, offspring: 4, acquired: false };

export interface RunConfig { seed: number; startFreq?: number; mutation?: number; k?: number }

/** One moth: 2 × LOCI alleles, 1 = dark allele. */
export type Moth = Uint8Array;
export const shade = (m: Moth) => m.reduce((a, b) => a + b, 0);

/** Relative chance of surviving to breed. Equals 1 for a perfect match to the bark, or for any moth when strength = 0. */
export function fitness(sh: number, background: number, strength: number): number {
  return Math.exp(-PENALTY * strength * Math.abs(sh - background));
}

export interface GenRecord {
  gen: number;
  /** Young born this generation, by shade 0–12 (empty for generation 0). */
  born: number[];
  /** Of those, the ones that survived to breed, by shade. For generation 0 these are the founding adults. */
  survived: number[];
  /** Frequency of dark alleles in the breeding adults' gene pool. */
  darkFreq: number;
  /** Mean shade of the breeding adults (genetic, at birth). */
  meanShade: number;
  /** Mean shade of the young at birth (generation 0: the founders). */
  bornMean: number;
}

const histogram = (shades: number[]) => {
  const h = new Array(MAX_SHADE + 1).fill(0) as number[];
  for (const s of shades) h[s]! += 1;
  return h;
};

function record(gen: number, born: number[], adults: Moth[]): GenRecord {
  const ad = adults.map(shade);
  const total = ad.reduce((a, b) => a + b, 0);
  return {
    gen,
    born: histogram(born),
    survived: histogram(ad),
    darkFreq: total / (adults.length * MAX_SHADE),
    meanShade: total / adults.length,
    bornMean: born.length ? born.reduce((a, b) => a + b, 0) / born.length : total / adults.length,
  };
}

/** A running population: call `step(params)` once per generation. Same seed → same history. */
export class SelectionRun {
  readonly rng: Rng;
  readonly k: number;
  readonly mutation: number;
  adults: Moth[];
  history: GenRecord[];
  /** Mean shade the survivors show as adults, including any acquired darkening (display only). */
  adultLook: number;

  constructor(cfg: RunConfig) {
    this.rng = mulberry32(cfg.seed);
    this.k = cfg.k ?? K;
    this.mutation = cfg.mutation ?? MUTATION;
    const p = cfg.startFreq ?? 0.2;
    this.adults = Array.from({ length: this.k }, () => Uint8Array.from({ length: MAX_SHADE }, () => (this.rng() < p ? 1 : 0)));
    this.history = [record(0, [], this.adults)];
    this.adultLook = this.history[0]!.meanShade;
  }

  /** Last generation's survivors: indices into the young of that generation are not kept; shades are. */
  lastBorn: number[] = [];
  lastSurvived: boolean[] = [];

  gamete(parent: Moth): Uint8Array {
    const g = new Uint8Array(LOCI);
    for (let l = 0; l < LOCI; l++) {
      let a = parent[2 * l + (this.rng() < 0.5 ? 0 : 1)]!;
      if (this.rng() < this.mutation) a = 1 - a;
      g[l] = a;
    }
    return g;
  }

  step(p: SelectionParams): GenRecord {
    const order = shuffle(this.rng, this.adults.map((_, i) => i));
    const young: Moth[] = [];
    for (let i = 0; i + 1 < order.length; i += 2) {
      const mum = this.adults[order[i]!]!, dad = this.adults[order[i + 1]!]!;
      for (let c = 0; c < p.offspring; c++) {
        const e = this.gamete(mum), s = this.gamete(dad);
        const m = new Uint8Array(MAX_SHADE);
        for (let l = 0; l < LOCI; l++) { m[2 * l] = e[l]!; m[2 * l + 1] = s[l]!; }
        young.push(m);
      }
    }
    const shades = young.map(shade);
    const w = shades.map((s) => fitness(s, p.background, p.strength));
    const keep = weightedSample(this.rng, w, this.k);
    const kept = new Set(keep);
    this.adults = keep.map((i) => young[i]!);
    this.lastBorn = shades;
    this.lastSurvived = shades.map((_, i) => kept.has(i));
    const rec = record(this.history.length, shades, this.adults);
    this.history.push(rec);
    this.adultLook = Math.min(MAX_SHADE, rec.meanShade + (p.acquired ? ACQUIRED_SHIFT : 0));
    return rec;
  }
}

/** Run `gens` generations with fixed settings and return the history (generation 0 first). */
export function simulate(p: SelectionParams, gens: number, cfg: RunConfig): GenRecord[] {
  const run = new SelectionRun(cfg);
  for (let g = 0; g < gens; g++) run.step(p);
  return run.history;
}
