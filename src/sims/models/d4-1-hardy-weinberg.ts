/**
 * Hardy–Weinberg calculations and a small population-genetics simulator (D4.1.13, D4.1.14).
 *
 * One gene, two alleles: A (frequency p) and a (frequency q), p + q = 1. With random mating, genotype
 * frequencies in the next generation are AA = p², Aa = 2pq, aa = q² (p² + 2pq + q² = 1).
 *
 * Simulator, one generation (classic textbook order):
 *   zygotes   AA = p² + Fpq, Aa = 2pq(1 − F), aa = q² + Fpq   (F = inbreeding coefficient: non-random mating)
 *   selection aa survive with relative fitness 1 − s (selection against the recessive phenotype)
 *   migration a fraction m of the breeding adults are immigrants whose allele frequency is qMig
 *   drift     the next generation's 2N alleles are a random sample of the parents' alleles (N = population size)
 * Mutation is not modelled: mutation rates are so low that their effect over a few dozen generations is negligible.
 */
import { binomial, mulberry32, type Rng } from './d4-1-rng';

export interface Genotypes { AA: number; Aa: number; aa: number }
export interface HW extends Genotypes { p: number; q: number }

/** Expected genotype frequencies from the frequency of the dominant allele, p. */
export function fromP(p: number): HW {
  const q = 1 - p;
  return { p, q, AA: p * p, Aa: 2 * p * q, aa: q * q };
}

/** From the frequency of the homozygous recessive genotype (q²), e.g. the incidence of a recessive condition. */
export function fromQ2(q2: number): HW {
  return fromP(1 - Math.sqrt(Math.min(1, Math.max(0, q2))));
}

/** From counts of the two phenotypes when A is dominant: only the recessive phenotype reveals its genotype. */
export function fromPhenotypes(dominant: number, recessive: number): HW {
  const n = dominant + recessive;
  return fromQ2(n > 0 ? recessive / n : 0);
}

/** Allele frequencies counted directly from genotype counts (possible when the alleles are codominant). */
export function allelesFromCounts(g: Genotypes): { p: number; q: number; n: number } {
  const n = g.AA + g.Aa + g.aa;
  if (n <= 0) return { p: NaN, q: NaN, n: 0 };
  const p = (2 * g.AA + g.Aa) / (2 * n);
  return { p, q: 1 - p, n };
}

/** Genotype counts expected under Hardy–Weinberg equilibrium for the allele frequencies in a sample. */
export function expectedCounts(g: Genotypes): Genotypes {
  const { p, n } = allelesFromCounts(g);
  const e = fromP(p);
  return { AA: e.AA * n, Aa: e.Aa * n, aa: e.aa * n };
}

/** χ² comparing observed genotype counts with the Hardy–Weinberg expectation (1 degree of freedom). */
export function chiSquaredHW(g: Genotypes): number {
  const e = expectedCounts(g);
  return (['AA', 'Aa', 'aa'] as const).reduce((acc, k) => (e[k] > 0 ? acc + (g[k] - e[k]) ** 2 / e[k] : acc), 0);
}
/** 3 genotype classes − 1 − 1 allele frequency estimated from the data = 1 degree of freedom. */
export const CRITICAL_1DF = 3.84;

/** "1 in N" for a frequency, rounded sensibly. */
export function oneIn(f: number): string {
  if (!(f > 0)) return 'none';
  const n = 1 / f;
  if (n < 1.05) return '1 in 1';
  const r = n < 10 ? Math.round(n * 10) / 10 : n < 1000 ? Math.round(n) : Math.round(n / 100) * 100;
  return `1 in ${r.toLocaleString('en-GB')}`;
}

/** Offspring genotype frequencies after one generation of random mating, from any parental genotype frequencies. */
export function randomMating(g: Genotypes): Genotypes {
  const t = g.AA + g.Aa + g.aa;
  const p = (g.AA + g.Aa / 2) / t;
  const e = fromP(p);
  return { AA: e.AA, Aa: e.Aa, aa: e.aa };
}

// ---------------- simulator ----------------

export interface HWSimParams {
  /** Starting frequency of allele a. */
  q0: number;
  /** Selection coefficient against the aa genotype (0 = none, 1 = aa never breed). */
  s: number;
  /** Breeding population size; Infinity = no genetic drift. */
  n: number;
  /** Fraction of breeding adults that are immigrants each generation. */
  m: number;
  /** Allele a frequency among immigrants. */
  qMig: number;
  /** Inbreeding coefficient (non-random mating), 0–1. */
  f: number;
}
export const DEFAULT_HW: HWSimParams = { q0: 0.5, s: 0, n: 200, m: 0, qMig: 0.9, f: 0 };
export const HW_GENS = 50;
/** Population-size slider stops; the last means "very large" (no drift). */
export const SIZE_STOPS = [10, 20, 50, 100, 200, 500, 1000, 5000, Infinity];

/** Zygote genotype frequencies for allele frequency q and inbreeding coefficient f. */
export function zygotes(q: number, f: number): Genotypes {
  const p = 1 - q;
  return { AA: p * p + f * p * q, Aa: 2 * p * q * (1 - f), aa: q * q + f * p * q };
}

/** Genotype frequencies of the breeding adults after selection against aa. */
export function afterSelection(z: Genotypes, s: number): Genotypes {
  const aa = z.aa * (1 - s);
  const w = z.AA + z.Aa + aa;
  return { AA: z.AA / w, Aa: z.Aa / w, aa: aa / w };
}

/** Expected allele a frequency in the next generation (before drift). */
export function expectedNextQ(q: number, p: HWSimParams): number {
  const ad = afterSelection(zygotes(q, p.f), p.s);
  const qa = ad.aa + ad.Aa / 2;
  return (1 - p.m) * qa + p.m * p.qMig;
}

export interface HWRun {
  /** Allele a frequency at the zygote stage, generations 0…gens. */
  q: number[];
  /** Breeding adults in the final generation: observed genotype counts (after selection). */
  adults: Genotypes;
}

/** One population over `gens` generations. With n = Infinity the run is deterministic. */
export function simulateHW(p: HWSimParams, gens: number, rng?: Rng): HWRun {
  const q: number[] = [p.q0];
  let cur = p.q0;
  for (let g = 0; g < gens; g++) {
    const next = expectedNextQ(cur, p);
    cur = Number.isFinite(p.n) && rng ? binomial(rng, 2 * p.n, next) / (2 * p.n) : next;
    q.push(cur);
  }
  const ad = afterSelection(zygotes(cur, p.f), p.s);
  const size = Number.isFinite(p.n) ? p.n : 1000;
  let adults: Genotypes;
  if (Number.isFinite(p.n) && rng) {
    // sample the adults' genotypes
    const nAA = binomial(rng, size, ad.AA);
    const nAa = binomial(rng, size - nAA, ad.AA < 1 ? ad.Aa / (1 - ad.AA) : 0);
    adults = { AA: nAA, Aa: nAa, aa: size - nAA - nAa };
  } else {
    adults = { AA: ad.AA * size, Aa: ad.Aa * size, aa: ad.aa * size };
  }
  return { q, adults };
}

/** Several replicate populations with the same settings, plus the deterministic (no-drift) expectation. */
export function replicates(p: HWSimParams, gens: number, seed: number, count = 5): { runs: HWRun[]; expected: number[] } {
  const rng = mulberry32(seed);
  const runs = Array.from({ length: count }, () => simulateHW(p, gens, rng));
  const expected = simulateHW({ ...p, n: Infinity }, gens).q;
  return { runs, expected };
}

export interface Conditions { large: boolean; random: boolean; noMigration: boolean; noSelection: boolean; noMutation: boolean }
export function conditions(p: HWSimParams): Conditions {
  return { large: !Number.isFinite(p.n), random: p.f === 0, noMigration: p.m === 0, noSelection: p.s === 0, noMutation: true };
}
