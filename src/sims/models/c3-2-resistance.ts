/**
 * Qualitative model of the evolution of antibiotic resistance in a population of pathogenic bacteria (C3.2.14).
 *
 * Four strains: susceptible to both antibiotics (S), resistant to A only (A), resistant to B only (B) and
 * resistant to both (AB, multiresistant). Each generation:
 *   1. growth: numbers rise towards a carrying capacity K (logistic). Each resistance gene carries a small
 *      fitness cost, so resistant strains grow slightly more slowly when no antibiotic is present;
 *   2. variation: rarely, a bacterium gains a resistance gene, by mutation or by gene transfer from another
 *      bacterium, at `rate` per cell per generation for each antibiotic (S → A, S → B, A → AB, B → AB);
 *   3. selection: an antibiotic in use kills a fraction KILL of the cells that are not resistant to it.
 * Small numbers are handled with seeded random numbers (so chance matters when a strain is rare) and
 * large numbers with expected values. The same settings always give the same result.
 */
export const K = 1e8; // bacteria in the infection at most
export const START = 1e7;
export const KILL = 0.9;
export const COST = 0.05; // fractional reduction in growth rate per resistance gene
export const GENERATIONS = 100;
export const TREAT_FROM = 10;
export const SWITCH_AT = 45; // in "A then B": when the doctor changes to antibiotic B

export type Treatment = 'none' | 'A' | 'AthenB' | 'AandB';
export type Strain = 'S' | 'A' | 'B' | 'AB';
export const STRAINS: Strain[] = ['S', 'A', 'B', 'AB'];

export interface ResistParams { treatment: Treatment; log10Rate: number; seed?: number }
export interface ResistResult {
  /** counts[strain][generation], generation 0…GENERATIONS */
  counts: Record<Strain, number[]>;
  /** which antibiotics are in use in each generation */
  drugs: { A: boolean; B: boolean }[];
  /** first generation at which the multiresistant strain exists (−1 if never) */
  abFirst: number;
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
  if (mean <= 0) return 0;
  if (mean > 40) return Math.max(0, Math.round(mean + Math.sqrt(mean) * gauss(rand)));
  const limit = Math.exp(-mean);
  let k = 0;
  let p = rand();
  while (p > limit) { k++; p *= rand(); }
  return k;
}
function gauss(rand: () => number) {
  const u = Math.max(1e-12, rand()), v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
/** Number of survivors out of n when each survives with probability p. */
function survivors(n: number, p: number, rand: () => number): number {
  if (n <= 0) return 0;
  if (n < 400) { let s = 0; for (let i = 0; i < n; i++) if (rand() < p) s++; return s; }
  return Math.max(0, Math.round(n * p + Math.sqrt(n * p * (1 - p)) * gauss(rand)));
}

export function drugsAt(treatment: Treatment, g: number) {
  const on = g >= TREAT_FROM;
  switch (treatment) {
    case 'none': return { A: false, B: false };
    case 'A': return { A: on, B: false };
    case 'AthenB': return { A: on && g < SWITCH_AT, B: g >= SWITCH_AT };
    case 'AandB': return { A: on, B: on };
  }
}

const resists = (s: Strain, drug: 'A' | 'B') => s.includes(drug);
const genes = (s: Strain) => (s === 'S' ? 0 : s === 'AB' ? 2 : 1);

export function simulate(p: ResistParams): ResistResult {
  const rand = mulberry32(p.seed ?? 5);
  const rate = 10 ** Math.max(-10, Math.min(-4, p.log10Rate));
  const n: Record<Strain, number> = { S: START, A: 0, B: 0, AB: 0 };
  const counts = { S: [n.S], A: [0], B: [0], AB: [0] } as Record<Strain, number[]>;
  const drugs = [drugsAt(p.treatment, 0)];
  let abFirst = -1;

  for (let g = 1; g <= GENERATIONS; g++) {
    const d = drugsAt(p.treatment, g);
    // 1 growth
    const total = n.S + n.A + n.B + n.AB;
    const room = Math.max(0, 1 - total / K);
    for (const s of STRAINS) {
      const grow = n[s] * room * (1 - COST * genes(s));
      n[s] = n[s] + (n[s] < 400 ? poisson(grow, rand) : Math.round(grow));
    }
    // 2 new resistance (mutation or gene transfer)
    const toA = poisson(n.S * rate, rand), toB = poisson(n.S * rate, rand);
    const aToAB = poisson(n.A * rate, rand), bToAB = poisson(n.B * rate, rand);
    n.S -= Math.min(n.S, toA + toB); n.A += toA - aToAB; n.B += toB - bToAB; n.AB += aToAB + bToAB;
    n.A = Math.max(0, n.A); n.B = Math.max(0, n.B);
    // 3 selection by antibiotics
    for (const s of STRAINS) {
      let surv = 1;
      if (d.A && !resists(s, 'A')) surv *= 1 - KILL;
      if (d.B && !resists(s, 'B')) surv *= 1 - KILL;
      if (surv < 1) n[s] = survivors(n[s], surv, rand);
    }
    if (abFirst < 0 && n.AB > 0) abFirst = g;
    for (const s of STRAINS) counts[s].push(n[s]);
    drugs.push(d);
  }
  return { counts, drugs, abFirst };
}

/** Fraction of the final population that is resistant to at least one antibiotic. */
export function finalResistantFraction(r: ResistResult): number {
  const L = r.counts.S.length - 1;
  const tot = STRAINS.reduce((a, s) => a + r.counts[s][L]!, 0);
  return tot === 0 ? 0 : (tot - r.counts.S[L]!) / tot;
}
