/**
 * Qualitative model of mutation accumulation in a virus population (A2.3.6).
 *
 * Wright–Fisher style: each generation, `population` offspring genomes are made by copying a parent
 * chosen from the previous generation. Copying makes mistakes: the number of new mutations in each
 * copy is Poisson-distributed with mean (mutation rate per base × genome length). Some bases belong to
 * up to three "target sites" (where antibodies or antiviral drugs bind). A virus "escapes" when every
 * target site that matters has changed. With selection pressure on, escape variants leave more offspring.
 *
 * Randomness is seeded (mulberry32), so the same settings always give the same result.
 * Simplifications: every mutation is new and neutral (except at target sites), no back mutation,
 * no recombination or reassortment, a constant population size.
 */
export const GENOME_BASES = 10_000; // about the size of an HIV genome (≈9.7 kb) or an influenza genome (≈13.5 kb)
export const SITE_BASES = 30; // bases in each target site
export const ESCAPE_FITNESS = 2; // relative offspring of escape variants when pressure is on

export interface EvoParams {
  /** log10 of the mutation rate per base per replication, e.g. −8 (proofreading DNA polymerase) to −4. */
  log10Rate: number;
  generations: number;
  population: number;
  /** How many separate target sites must all change for a virus to escape (1–3). */
  sites: number;
  /** Antibodies or a drug act against viruses that have not escaped. */
  pressure: boolean;
  seed?: number;
}

export interface EvoResult {
  /** Per generation 0…G: fraction of genomes carrying at least one new mutation. */
  mutated: number[];
  /** Per generation: fraction of genomes that have escaped (all required target sites changed). */
  escaped: number[];
  /** Per generation: mean number of new mutations per genome. */
  meanMutations: number[];
  /** Per generation: number of genetically distinct variants in the population. */
  variants: number[];
  /** Final generation: a sample of genomes (mutation count and whether it escaped). */
  sample: { mutations: number; escaped: boolean }[];
}

/** Deterministic random numbers in [0, 1). */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Poisson random number (Knuth's method; fine for the small means used here). */
export function poisson(mean: number, rand: () => number): number {
  if (mean <= 0) return 0;
  const limit = Math.exp(-mean);
  let k = 0;
  let p = rand();
  while (p > limit) { k++; p *= rand(); }
  return k;
}

export const clampParams = (p: EvoParams): Required<EvoParams> => ({
  log10Rate: Math.max(-9, Math.min(-3, p.log10Rate)),
  generations: Math.max(1, Math.min(300, Math.round(p.generations))),
  population: Math.max(10, Math.min(3000, Math.round(p.population))),
  sites: Math.max(1, Math.min(3, Math.round(p.sites))),
  pressure: p.pressure,
  seed: p.seed ?? 2023,
});

export function simulate(input: EvoParams, sampleSize = 100): EvoResult {
  const p = clampParams(input);
  const rand = mulberry32(p.seed);
  const rate = 10 ** p.log10Rate;
  const N = p.population;
  const G = p.generations;
  const otherMean = rate * (GENOME_BASES - 3 * SITE_BASES);
  const siteMean = rate * SITE_BASES;
  const need = (1 << p.sites) - 1;

  // Genotypes are stored once; individuals point at a genotype id.
  const cap = N * (G + 1) + 1;
  const gMut = new Uint32Array(cap); // total new mutations
  const gMask = new Uint8Array(cap); // bit k set = target site k has changed
  let nGeno = 1; // genotype 0 is the ancestor
  let pop = new Int32Array(N); // everyone starts as the ancestor
  let next = new Int32Array(N);
  const stamp = new Int32Array(cap).fill(-1);
  const cum = new Float64Array(N);

  const mutated: number[] = [];
  const escaped: number[] = [];
  const meanMutations: number[] = [];
  const variants: number[] = [];
  const isEscaped = (g: number) => (gMask[g]! & need) === need;

  const record = (gen: number) => {
    let m = 0, e = 0, total = 0, distinct = 0;
    for (let i = 0; i < N; i++) {
      const g = pop[i]!;
      if (gMut[g]! > 0) m++;
      if (isEscaped(g)) e++;
      total += gMut[g]!;
      if (stamp[g] !== gen) { stamp[g] = gen; distinct++; }
    }
    mutated.push(m / N);
    escaped.push(e / N);
    meanMutations.push(total / N);
    variants.push(distinct);
  };

  record(0);
  for (let gen = 1; gen <= G; gen++) {
    // fitness-weighted choice of parents
    let acc = 0;
    for (let i = 0; i < N; i++) {
      acc += p.pressure && isEscaped(pop[i]!) ? ESCAPE_FITNESS : 1;
      cum[i] = acc;
    }
    for (let i = 0; i < N; i++) {
      const r = rand() * acc;
      let lo = 0, hi = N - 1;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid]! > r) hi = mid; else lo = mid + 1; }
      const parent = pop[lo]!;
      let k = poisson(otherMean, rand);
      let mask = gMask[parent]!;
      for (let s = 0; s < 3; s++) {
        const ks = poisson(siteMean, rand);
        if (ks > 0) { k += ks; mask |= 1 << s; }
      }
      if (k === 0) { next[i] = parent; continue; }
      const g = nGeno++;
      gMut[g] = gMut[parent]! + k;
      gMask[g] = mask;
      next[i] = g;
    }
    [pop, next] = [next, pop];
    record(gen);
  }

  const sample: EvoResult['sample'] = [];
  const step = N / Math.min(sampleSize, N);
  for (let i = 0; i < Math.min(sampleSize, N); i++) {
    const g = pop[Math.floor(i * step)]!;
    sample.push({ mutations: gMut[g]!, escaped: isEscaped(g) });
  }
  return { mutated, escaped, meanMutations, variants, sample };
}

/** Expected new mutations per genome per replication (the key number behind the model). */
export const mutationsPerCopy = (log10Rate: number) => 10 ** log10Rate * GENOME_BASES;

/** "3 × 10⁻⁵" style text for a log10 rate. */
export function rateText(log10Rate: number): string {
  const sup: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  const e = Math.floor(log10Rate + 1e-9);
  const m = 10 ** (log10Rate - e);
  const exp = String(e).split('').map((c) => sup[c]).join('');
  const mant = Math.round(m * 10) / 10;
  return mant === 1 ? `10${exp}` : `${mant} × 10${exp}`;
}
