import { describe, expect, it } from 'vitest';
import { PRIMARY, SECONDARY, firstExposureSummary, response, secondExposureSummary, titre } from '../../src/sims/models/c3-2-antibody-titre';
import { N, SEEDS, State, simulate as herd, stateAt, threshold } from '../../src/sims/models/c3-2-herd-immunity';
import { GENERATIONS, K, STRAINS, TREAT_FROM, drugsAt, finalResistantFraction, simulate as resist } from '../../src/sims/models/c3-2-resistance';

describe('C3.2 primary and secondary immune responses', () => {
  const p = { second: 60, memory: true, sameAntigen: true };

  it('there are no antibodies before the first exposure and during the lag', () => {
    expect(titre(p, 0).first).toBe(0);
    expect(titre(p, PRIMARY.lag).first).toBe(0);
    expect(response(PRIMARY, -5)).toBe(0);
  });

  it('the secondary response is faster, larger and longer-lasting than the primary', () => {
    const first = firstExposureSummary();
    const second = secondExposureSummary(p);
    expect(second.peak).toBeGreaterThan(5 * first.peak);
    expect(second.daysToPeak).toBeLessThan(first.daysToPeak);
    expect(second.daysAbove).toBeGreaterThan(2 * first.daysAbove);
    // antibodies appear within a few days of the second exposure, but only after about a week the first time
    expect(titre(p, p.second + 4).first).toBeGreaterThan(titre(p, p.second).first + 0.5);
    expect(response(PRIMARY, 4)).toBe(0);
  });

  it('without memory cells the second exposure gives another primary response', () => {
    const noMem = secondExposureSummary({ ...p, memory: false });
    const first = firstExposureSummary();
    expect(noMem.peak).toBeLessThan(first.peak * 1.2);
    expect(noMem.daysToPeak).toBeCloseTo(first.daysToPeak, 0);
  });

  it('a different antigen gets a primary response, not a secondary one', () => {
    const t = titre({ ...p, sameAntigen: false }, p.second + PRIMARY.lag + PRIMARY.rise);
    expect(t.second).toBeCloseTo(PRIMARY.peak, 5);
    expect(SECONDARY.peak).toBeGreaterThan(PRIMARY.peak);
  });

  it('antibody concentration falls after each peak', () => {
    expect(response(PRIMARY, 40)).toBeLessThan(response(PRIMARY, 14));
    expect(response(SECONDARY, 60)).toBeLessThan(response(SECONDARY, 7));
  });
});

describe('C3.2 herd immunity model', () => {
  it('the herd immunity threshold is 1 − 1/R₀', () => {
    expect(threshold(15)).toBeCloseTo(14 / 15);
    expect(threshold(4)).toBeCloseTo(0.75);
    expect(threshold(2)).toBeCloseTo(0.5);
    expect(threshold(1)).toBe(0);
  });

  it('is deterministic for a given seed', () => {
    const a = herd({ r0: 3, coverage: 0.3, seed: 4 });
    expect(herd({ r0: 3, coverage: 0.3, seed: 4 })).toEqual(a);
  });

  it('people are never both vaccinated and infected, and counts add up', () => {
    const r = herd({ r0: 4, coverage: 0.5 });
    let vac = 0;
    for (let i = 0; i < N; i++) {
      if (r.vaccinated[i]) { vac++; expect(r.infectedAt[i]).toBe(-1); }
    }
    expect(vac).toBe(450);
    expect(vac + r.totalInfected + r.protectedUnvaccinated).toBe(N);
    expect(r.newCases.reduce((a, b) => a + b, 0)).toBe(r.totalInfected);
  });

  it('with no vaccination an infection with R₀ = 3 reaches most of the population', () => {
    for (const seed of [1, 2, 3]) expect(herd({ r0: 3, coverage: 0, seed }).totalInfected).toBeGreaterThan(0.8 * N);
  });

  it('above the threshold outbreaks die out quickly', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const r = herd({ r0: 3, coverage: 0.85, seed });
      expect(r.totalInfected).toBeLessThan(0.05 * N);
    }
  });

  it('more vaccination means fewer infections; higher R₀ needs higher coverage', () => {
    const at = (r0: number, c: number) => [1, 2, 3, 4].reduce((a, seed) => a + herd({ r0, coverage: c, seed }).totalInfected, 0);
    expect(at(3, 0.5)).toBeLessThan(at(3, 0.2));
    expect(at(3, 0.8)).toBeLessThan(at(3, 0.5));
    // 80% coverage is enough for R₀ = 3 (threshold 67%) but not for measles-like R₀ = 15 (threshold 93%)
    expect(at(15, 0.8)).toBeGreaterThan(10 * at(3, 0.8));
  });

  it('stateAt tracks infection through the generations', () => {
    const r = herd({ r0: 3, coverage: 0 });
    const seeds = [...Array(N).keys()].filter((i) => r.infectedAt[i] === 0);
    expect(seeds).toHaveLength(SEEDS);
    expect(stateAt(r, seeds[0]!, 0)).toBe(State.Infected);
    expect(stateAt(r, seeds[0]!, 1)).toBe(State.Recovered);
  });
});

describe('C3.2 antibiotic resistance model', () => {
  const last = (a: number[]) => a[a.length - 1]!;

  it('is deterministic for a given seed', () => {
    expect(resist({ treatment: 'A', log10Rate: -7, seed: 3 })).toEqual(resist({ treatment: 'A', log10Rate: -7, seed: 3 }));
  });

  it('without antibiotics resistant strains stay rare (they arise but are not selected)', () => {
    const r = resist({ treatment: 'none', log10Rate: -7 });
    expect(finalResistantFraction(r)).toBeLessThan(0.001);
    expect(last(r.counts.S)).toBeGreaterThan(0.9 * K);
  });

  it('one antibiotic selects for resistance to it: resistant survivors reproduce and take over', () => {
    const r = resist({ treatment: 'A', log10Rate: -7 });
    expect(last(r.counts.A) + last(r.counts.AB)).toBeGreaterThan(0.5 * K);
    expect(last(r.counts.S)).toBe(0);
    expect(r.counts.A[TREAT_FROM - 1]!).toBeLessThan(1e-4 * K); // rare before treatment
  });

  it('with no new variation, an antibiotic clears the infection', () => {
    const r = resist({ treatment: 'A', log10Rate: -10 });
    const total = STRAINS.reduce((a, s) => a + last(r.counts[s]), 0);
    expect(total).toBe(0);
  });

  it('using one antibiotic after another lets a multiresistant strain build up', () => {
    const seeds = [1, 2, 3, 4, 5];
    const seq = seeds.filter((seed) => last(resist({ treatment: 'AthenB', log10Rate: -7, seed }).counts.AB) > 0.5 * K).length;
    const both = seeds.filter((seed) => last(resist({ treatment: 'AandB', log10Rate: -7, seed }).counts.AB) > 0.5 * K).length;
    expect(seq).toBeGreaterThanOrEqual(4);
    expect(both).toBeLessThan(seq);
  });

  it('treatment schedules switch antibiotics at the right time', () => {
    expect(drugsAt('none', 50)).toEqual({ A: false, B: false });
    expect(drugsAt('A', TREAT_FROM - 1)).toEqual({ A: false, B: false });
    expect(drugsAt('AthenB', GENERATIONS)).toEqual({ A: false, B: true });
    expect(drugsAt('AandB', 20)).toEqual({ A: true, B: true });
  });
});
