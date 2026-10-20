import { describe, expect, it } from 'vitest';
import { binomial, mean, mulberry32, variance, weightedSample } from '../../src/sims/models/d4-1-rng';
import { DEFAULT_SELECTION, K, MAX_SHADE, SelectionRun, fitness, simulate } from '../../src/sims/models/d4-1-selection';
import { DEFAULT_GUPPY, END, FOUNDING, POOLS, TRANSPLANT, attractiveness, maleSurvival, runExperiment } from '../../src/sims/models/d4-1-guppies';
import {
  CRITICAL_1DF, afterSelection, allelesFromCounts, chiSquaredHW, conditions, DEFAULT_HW, expectedCounts, expectedNextQ,
  fromP, fromPhenotypes, fromQ2, oneIn, randomMating, replicates, simulateHW, zygotes,
} from '../../src/sims/models/d4-1-hardy-weinberg';
import { curve, fitness as patternFitness, moments, normal, peaks, removed } from '../../src/sims/models/d4-1-distributions';

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

describe('D4.1 seeded randomness', () => {
  it('is deterministic for a seed', () => {
    const a = mulberry32(9), b = mulberry32(9);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it('weighted sampling picks k distinct items and favours heavy weights', () => {
    const rng = mulberry32(3);
    let heavy = 0;
    for (let r = 0; r < 200; r++) {
      const pick = weightedSample(rng, [10, 1, 1, 1, 1], 1);
      if (pick[0] === 0) heavy++;
    }
    expect(heavy / 200).toBeGreaterThan(0.6);
    const s = weightedSample(mulberry32(1), [1, 1, 1, 1, 1, 1], 4);
    expect(new Set(s).size).toBe(4);
  });
  it('binomial draws have the right mean', () => {
    const rng = mulberry32(5);
    const xs = Array.from({ length: 400 }, () => binomial(rng, 50, 0.3));
    expect(mean(xs)).toBeCloseTo(15, 0);
    const big = Array.from({ length: 400 }, () => binomial(rng, 2000, 0.25));
    expect(mean(big)).toBeGreaterThan(490);
    expect(mean(big)).toBeLessThan(510);
  });
});

describe('D4.1 natural selection model', () => {
  const darkAfter = (p: typeof DEFAULT_SELECTION, gens: number, seeds = [1, 2, 3, 4]) =>
    avg(seeds.map((seed) => simulate(p, gens, { seed }).at(-1)!.darkFreq));

  it('fitness is highest for moths that match the bark, and equal for all when there is no selection', () => {
    expect(fitness(9, 9, 1)).toBe(1);
    expect(fitness(2, 9, 1)).toBeLessThan(fitness(7, 9, 1));
    expect(fitness(0, 9, 0)).toBe(1);
  });
  it('the population starts with heritable variation (it exists before selection acts)', () => {
    const h = simulate(DEFAULT_SELECTION, 0, { seed: 1 })[0]!;
    expect(h.darkFreq).toBeGreaterThan(0.15);
    expect(h.darkFreq).toBeLessThan(0.25);
    const shadesPresent = h.survived.filter((n) => n > 0).length;
    expect(shadesPresent).toBeGreaterThanOrEqual(4);
    expect(h.survived.reduce((a, b) => a + b, 0)).toBe(K);
  });
  it('on dark bark, the dark allele frequency rises: the population evolves', () => {
    expect(darkAfter(DEFAULT_SELECTION, 30)).toBeGreaterThan(0.6);
  });
  it('on pale bark, the dark allele frequency falls', () => {
    expect(darkAfter({ ...DEFAULT_SELECTION, background: 0 }, 30)).toBeLessThan(0.08);
  });
  it('the mean shade moves towards the bark shade and settles there', () => {
    const h = simulate({ ...DEFAULT_SELECTION, background: 6 }, 60, { seed: 2 });
    expect(Math.abs(h.at(-1)!.meanShade - 6)).toBeLessThan(1);
  });
  it('without selection, allele frequencies change only slightly (random drift)', () => {
    expect(Math.abs(darkAfter({ ...DEFAULT_SELECTION, strength: 0 }, 30) - 0.2)).toBeLessThan(0.08);
  });
  it('without overproduction (2 young per pair, all survive) there is no selection', () => {
    expect(Math.abs(darkAfter({ ...DEFAULT_SELECTION, offspring: 2 }, 30) - 0.2)).toBeLessThan(0.08);
  });
  it('more overproduction means stronger competition and faster change', () => {
    expect(darkAfter({ ...DEFAULT_SELECTION, offspring: 8 }, 6)).toBeGreaterThan(darkAfter({ ...DEFAULT_SELECTION, offspring: 3 }, 6));
  });
  it('stronger selection pressure gives faster change', () => {
    expect(darkAfter({ ...DEFAULT_SELECTION, strength: 1 }, 6)).toBeGreaterThan(darkAfter({ ...DEFAULT_SELECTION, strength: 0.2 }, 6));
  });
  it('selection cannot create variation: with no dark alleles and no mutation, no dark moths appear', () => {
    const h = simulate({ ...DEFAULT_SELECTION, strength: 1 }, 20, { seed: 4, startFreq: 0, mutation: 0 });
    expect(h.at(-1)!.darkFreq).toBe(0);
  });
  it('mutation supplies new alleles that selection can then act on', () => {
    const h = simulate({ ...DEFAULT_SELECTION, strength: 1 }, 60, { seed: 4, startFreq: 0, mutation: 0.002 });
    expect(h.at(-1)!.darkFreq).toBeGreaterThan(0.2);
  });
  it('acquired darkening of adults is not inherited: the gene pool history is identical', () => {
    const off = simulate({ ...DEFAULT_SELECTION, acquired: false }, 20, { seed: 8 });
    const on = simulate({ ...DEFAULT_SELECTION, acquired: true }, 20, { seed: 8 });
    expect(on.map((r) => r.darkFreq)).toEqual(off.map((r) => r.darkFreq));
    expect(on.map((r) => r.bornMean)).toEqual(off.map((r) => r.bornMean));
    const run = new SelectionRun({ seed: 8 });
    run.step({ ...DEFAULT_SELECTION, acquired: true });
    expect(run.adultLook).toBeGreaterThan(run.history.at(-1)!.meanShade);
  });
  it('more young are born than survive, and individuals are either kept or removed (they do not change)', () => {
    const run = new SelectionRun({ seed: 1 });
    const rec = run.step(DEFAULT_SELECTION);
    const born = rec.born.reduce((a, b) => a + b, 0);
    expect(born).toBe((K / 2) * DEFAULT_SELECTION.offspring);
    expect(rec.survived.reduce((a, b) => a + b, 0)).toBe(K);
    rec.survived.forEach((n, s) => expect(n).toBeLessThanOrEqual(rec.born[s]!));
    expect(rec.born.length).toBe(MAX_SHADE + 1);
    expect(run.lastSurvived.filter(Boolean).length).toBe(K);
  });
  it('is deterministic for a seed', () => {
    expect(simulate(DEFAULT_SELECTION, 10, { seed: 3 })).toEqual(simulate(DEFAULT_SELECTION, 10, { seed: 3 }));
  });
});

describe('D4.1 Endler guppy model', () => {
  const final = (k: 'cichlid' | 'rivulus' | 'none', p = DEFAULT_GUPPY) =>
    avg([1, 2, 3].map((seed) => runExperiment(p, seed).means[k][END]!));

  it('uses Endler\'s design: 4 pike cichlid pools, 4 Rivulus pools, 2 predator-free controls', () => {
    expect(POOLS.filter((p) => p === 'cichlid').length).toBe(4);
    expect(POOLS.filter((p) => p === 'rivulus').length).toBe(4);
    expect(POOLS.filter((p) => p === 'none').length).toBe(2);
  });
  it('pike cichlids remove colourful males more than Rivulus does; no predator removes none', () => {
    expect(maleSurvival(15, 'cichlid', 1)).toBeLessThan(maleSurvival(5, 'cichlid', 1));
    expect(maleSurvival(15, 'rivulus', 1)).toBeGreaterThan(maleSurvival(15, 'cichlid', 1));
    expect(maleSurvival(15, 'none', 1)).toBe(1);
    expect(attractiveness(15, 1)).toBeGreaterThan(attractiveness(5, 1));
  });
  it('all pools start alike during the predator-free founding phase', () => {
    const e = runExperiment(DEFAULT_GUPPY, 1);
    const at = e.pools.map((p) => p.spots[FOUNDING - 1]!);
    expect(Math.max(...at) - Math.min(...at)).toBeLessThan(2.5);
  });
  it('spots decrease with pike cichlids and increase with Rivulus or no predator', () => {
    const start = avg([1, 2, 3].map((seed) => runExperiment(DEFAULT_GUPPY, seed).means.none[0]!));
    expect(final('cichlid')).toBeLessThan(start - 1);
    expect(final('rivulus')).toBeGreaterThan(start + 1.5);
    expect(final('none')).toBeGreaterThan(start + 1.5);
    expect(final('none')).toBeGreaterThanOrEqual(final('rivulus') - 0.6);
  });
  it('males transplanted from a pike cichlid pool to a Rivulus pool become more colourful', () => {
    const gains = [1, 2, 3].map((seed) => {
      const e = runExperiment(DEFAULT_GUPPY, seed);
      expect(Number.isNaN(e.transplant[TRANSPLANT - 1]!)).toBe(true);
      return e.transplant[END]! - e.transplant[TRANSPLANT]!;
    });
    expect(avg(gains)).toBeGreaterThan(1);
  });
  it('without female preference, spots do not increase in predator-free pools', () => {
    expect(final('none', { preference: 0, predation: 0.7 })).toBeLessThan(11);
  });
  it('without predation, cichlid pools become as colourful as the controls', () => {
    expect(Math.abs(final('cichlid', { preference: 0.6, predation: 0 }) - final('none', { preference: 0.6, predation: 0 }))).toBeLessThan(1.2);
  });
  it('is deterministic for a seed', () => {
    expect(runExperiment(DEFAULT_GUPPY, 7)).toEqual(runExperiment(DEFAULT_GUPPY, 7));
  });
});

describe('D4.1 Hardy–Weinberg equation', () => {
  it('p + q = 1 and p² + 2pq + q² = 1 for any allele frequency', () => {
    for (let p = 0; p <= 1.0001; p += 0.05) {
      const h = fromP(p);
      expect(h.p + h.q).toBeCloseTo(1, 12);
      expect(h.AA + h.Aa + h.aa).toBeCloseTo(1, 12);
    }
  });
  it('cystic fibrosis-type example: 1 in 2500 affected → q = 0.02, carriers ≈ 1 in 25', () => {
    const h = fromQ2(1 / 2500);
    expect(h.q).toBeCloseTo(0.02, 10);
    expect(h.p).toBeCloseTo(0.98, 10);
    expect(h.Aa).toBeCloseTo(0.0392, 10);
    expect(oneIn(h.Aa)).toBe('1 in 26');
    expect(h.AA).toBeCloseTo(0.9604, 10);
  });
  it('PKU-type example: 1 in 10 000 affected → q = 0.01, carriers ≈ 1 in 50', () => {
    const h = fromQ2(1 / 10000);
    expect(h.q).toBeCloseTo(0.01, 10);
    expect(h.Aa).toBeCloseTo(0.0198, 10);
    expect(oneIn(h.Aa)).toBe('1 in 51');
  });
  it('phenotype counts: 36 of 400 show the recessive phenotype → q = 0.3, p = 0.7', () => {
    const h = fromPhenotypes(364, 36);
    expect(h.q).toBeCloseTo(0.3, 10);
    expect(h.p).toBeCloseTo(0.7, 10);
    expect(h.Aa).toBeCloseTo(0.42, 10);
    expect(h.AA).toBeCloseTo(0.49, 10);
  });
  it('codominant genotype counts give allele frequencies directly and a χ² test of fit', () => {
    const g = { AA: 298, Aa: 489, aa: 213 };
    const a = allelesFromCounts(g);
    expect(a.p).toBeCloseTo(0.5425, 4);
    expect(a.n).toBe(1000);
    const e = expectedCounts(g);
    expect(e.AA + e.Aa + e.aa).toBeCloseTo(1000, 8);
    expect(chiSquaredHW(g)).toBeLessThan(CRITICAL_1DF);
    // a big heterozygote deficit does not fit
    expect(chiSquaredHW({ AA: 400, Aa: 200, aa: 400 })).toBeGreaterThan(CRITICAL_1DF);
  });
  it('one generation of random mating restores Hardy–Weinberg proportions from any start', () => {
    const g = randomMating({ AA: 0.5, Aa: 0, aa: 0.5 });
    expect(g.AA).toBeCloseTo(0.25);
    expect(g.Aa).toBeCloseTo(0.5);
    expect(g.aa).toBeCloseTo(0.25);
  });
});

describe('D4.1 Hardy–Weinberg simulator', () => {
  it('with every condition met (large population, no forces), allele frequencies do not change', () => {
    const r = simulateHW({ ...DEFAULT_HW, n: Infinity, q0: 0.3 }, 50);
    for (const q of r.q) expect(q).toBeCloseTo(0.3, 12);
    expect(conditions({ ...DEFAULT_HW, n: Infinity })).toEqual({ large: true, random: true, noMigration: true, noSelection: true, noMutation: true });
  });
  it('selection against aa lowers q, ever more slowly as recessive alleles hide in heterozygotes', () => {
    const p = { ...DEFAULT_HW, n: Infinity, s: 1 };
    // complete selection against aa: q′ = q / (1 + q)
    expect(expectedNextQ(0.5, p)).toBeCloseTo(0.5 / 1.5, 12);
    const r = simulateHW({ ...p, q0: 0.5 }, 50);
    expect(r.q[50]).toBeCloseTo(0.5 / (1 + 50 * 0.5), 10);
    expect(r.q[1]! - r.q[0]!).toBeLessThan(r.q[50]! - r.q[49]!); // big drop first, tiny drops later
    expect(r.q[50]).toBeGreaterThan(0);
  });
  it('selection makes adult genotype frequencies depart from Hardy–Weinberg (deficit of aa)', () => {
    const ad = afterSelection(zygotes(0.5, 0), 0.5);
    const q = ad.aa + ad.Aa / 2;
    expect(ad.aa).toBeLessThan(q * q);
  });
  it('non-random mating (inbreeding) gives too few heterozygotes but does not change allele frequency', () => {
    const z = zygotes(0.4, 0.3);
    expect(z.AA + z.Aa + z.aa).toBeCloseTo(1, 12);
    expect(z.Aa).toBeLessThan(2 * 0.6 * 0.4);
    expect(z.aa + z.Aa / 2).toBeCloseTo(0.4, 12);
    expect(expectedNextQ(0.4, { ...DEFAULT_HW, f: 0.3 })).toBeCloseTo(0.4, 12);
  });
  it('migration moves q towards the immigrants\' allele frequency', () => {
    const r = simulateHW({ ...DEFAULT_HW, n: Infinity, q0: 0.1, m: 0.1, qMig: 0.9 }, 50);
    expect(r.q[50]).toBeGreaterThan(0.85);
  });
  it('genetic drift: small populations change far more by chance than large ones, and can lose an allele', () => {
    const spread = (n: number) => {
      const { runs } = replicates({ ...DEFAULT_HW, n }, 30, 11, 30);
      return variance(runs.map((r) => r.q[30]!));
    };
    expect(spread(20)).toBeGreaterThan(5 * spread(1000));
    const { runs } = replicates({ ...DEFAULT_HW, n: 10 }, 50, 2, 30);
    expect(runs.some((r) => r.q[50] === 0 || r.q[50] === 1)).toBe(true);
  });
  it('replicates are reproducible and the expectation has no drift', () => {
    const a = replicates({ ...DEFAULT_HW, n: 50 }, 20, 4);
    const b = replicates({ ...DEFAULT_HW, n: 50 }, 20, 4);
    expect(a).toEqual(b);
    for (const q of a.expected) expect(q).toBeCloseTo(0.5, 12);
    const adults = a.runs[0]!.adults;
    expect(adults.AA + adults.Aa + adults.aa).toBe(50);
  });
});

describe('D4.1 patterns of selection (schematic curves)', () => {
  const start = moments(curve('start'));
  it('the starting population is a normal distribution', () => {
    expect(start.mean).toBeCloseTo(0, 6);
    expect(start.sd).toBeCloseTo(1, 1);
    expect(normal(0)).toBeCloseTo(0.3989, 4);
  });
  it('stabilizing selection keeps the mean but narrows the range', () => {
    const m = moments(curve('stabilizing'));
    expect(m.mean).toBeCloseTo(0, 6);
    expect(m.sd).toBeLessThan(0.75 * start.sd);
  });
  it('directional selection shifts the mean', () => {
    expect(moments(curve('directional')).mean).toBeGreaterThan(0.5);
  });
  it('disruptive selection favours both extremes, widening the spread into two peaks', () => {
    const c = curve('disruptive');
    expect(moments(c).mean).toBeCloseTo(0, 6);
    expect(moments(c).sd).toBeGreaterThan(start.sd);
    expect(peaks(c)).toBe(2);
    expect(patternFitness('disruptive', 0)).toBeLessThan(patternFitness('disruptive', 2));
  });
  it('artificial (truncation) selection shifts the next generation towards the breeders\' choice', () => {
    expect(moments(curve('artificial')).mean).toBeGreaterThan(0.4);
    expect(patternFitness('artificial', 2)).toBeGreaterThan(0.99);
    expect(patternFitness('artificial', -1)).toBeLessThan(0.01);
  });
  it('the removed band is never larger than the population itself', () => {
    for (const pt of removed('directional')) expect(pt.y).toBeLessThanOrEqual(normal(pt.x) + 1e-12);
  });
});
