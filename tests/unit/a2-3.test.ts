import { describe, expect, it } from 'vitest';
import { GENOME_BASES, mulberry32, mutationsPerCopy, poisson, rateText, simulate } from '../../src/sims/models/a2-3-evolution';

const base = { log10Rate: -4.5, generations: 60, population: 400, sites: 1, pressure: false, seed: 7 };
const last = (a: number[]) => a[a.length - 1]!;

describe('A2.3 virus evolution model', () => {
  it('is deterministic for a given seed (seeded randomness)', () => {
    expect(simulate(base)).toEqual(simulate(base));
    expect(simulate({ ...base, seed: 8 }).meanMutations).not.toEqual(simulate(base).meanMutations);
  });

  it('starts from a single genetically uniform ancestor', () => {
    const r = simulate(base);
    expect(r.mutated[0]).toBe(0);
    expect(r.escaped[0]).toBe(0);
    expect(r.variants[0]).toBe(1);
    expect(r.mutated).toHaveLength(base.generations + 1);
  });

  it('produces no variation without mutation', () => {
    const r = simulate({ ...base, log10Rate: -9, generations: 50, population: 200 });
    expect(last(r.mutated)).toBeLessThan(0.05);
    expect(last(r.variants)).toBeLessThanOrEqual(3);
  });

  it('a higher mutation rate gives faster accumulation of mutations and more variants', () => {
    const lo = simulate({ ...base, log10Rate: -7 });
    const hi = simulate({ ...base, log10Rate: -4 });
    expect(last(hi.meanMutations)).toBeGreaterThan(50 * last(lo.meanMutations) + 1);
    expect(last(hi.variants)).toBeGreaterThan(last(lo.variants));
    expect(last(hi.mutated)).toBeGreaterThan(0.99);
  });

  it('mean mutations per genome grow at about (rate × genome length) per generation', () => {
    const r = simulate({ ...base, log10Rate: -4, generations: 100, population: 1000 });
    const expected = mutationsPerCopy(-4) * 100; // 1 per copy × 100 generations
    expect(mutationsPerCopy(-4)).toBeCloseTo(1e-4 * GENOME_BASES);
    expect(last(r.meanMutations)).toBeGreaterThan(expected * 0.85);
    expect(last(r.meanMutations)).toBeLessThan(expected * 1.15);
    // and it rises with every extra generation on average
    expect(r.meanMutations[50]!).toBeLessThan(r.meanMutations[100]!);
  });

  it('more generations give more accumulated change', () => {
    const short = simulate({ ...base, generations: 20 });
    const long = simulate({ ...base, generations: 150 });
    expect(last(long.meanMutations)).toBeGreaterThan(last(short.meanMutations));
  });

  it('a larger population holds more distinct variants', () => {
    const small = simulate({ ...base, population: 100 });
    const large = simulate({ ...base, population: 1500 });
    expect(last(large.variants)).toBeGreaterThan(last(small.variants));
  });

  it('selection by antibodies or drugs makes escape variants spread', () => {
    const p = { ...base, log10Rate: -4, generations: 80, population: 600 };
    const neutral = simulate(p);
    const selected = simulate({ ...p, pressure: true });
    expect(last(selected.escaped)).toBeGreaterThan(last(neutral.escaped) + 0.2);
    expect(last(selected.escaped)).toBeGreaterThan(0.8);
  });

  it('needing several target sites to change at once (combination therapy) delays escape', () => {
    const p = { ...base, log10Rate: -4, generations: 150, population: 800, pressure: true };
    const halfway = (r: { escaped: number[] }) => { const g = r.escaped.findIndex((x) => x >= 0.5); return g < 0 ? Infinity : g; };
    const one = halfway(simulate({ ...p, sites: 1 }));
    const two = halfway(simulate({ ...p, sites: 2 }));
    const three = halfway(simulate({ ...p, sites: 3 }));
    expect(one).toBeLessThan(two);
    expect(two).toBeLessThan(three);
  });

  it('helpers behave', () => {
    const rand = mulberry32(1);
    const draws = Array.from({ length: 20000 }, () => poisson(0.5, rand));
    const mean = draws.reduce((a, b) => a + b, 0) / draws.length;
    expect(mean).toBeGreaterThan(0.47);
    expect(mean).toBeLessThan(0.53);
    expect(poisson(0, rand)).toBe(0);
    expect(rateText(-8)).toBe('10⁻⁸');
    expect(rateText(-4.5)).toBe('3.2 × 10⁻⁵');
  });
});
