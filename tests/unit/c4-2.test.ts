import { describe, expect, it } from 'vitest';
import { LOSS_SHARES, efficiency, pyramid, silverSprings, transfers } from '../../src/sims/models/c4-2-pyramid';
import { ANCHORS, MONTHS, SEASONAL, annualMean, growthRate, monthly, series, yearSummary } from '../../src/sims/models/c4-2-keeling';

describe('C4.2 energy pyramid', () => {
  it('a 10% efficiency leaves 10%, 1% and 0.1% of producer energy at successive consumer levels', () => {
    const p = pyramid(50_000, 10);
    expect(p.map((l) => l.energy)).toEqual([50_000, 5_000, 500, 50, 5].map((v) => expect.closeTo(v, 6)));
    expect(p[3]!.percentOfProducers).toBeCloseTo(0.1);
  });
  it('energy falls at every level, for every efficiency in the slider range', () => {
    for (let e = 5; e <= 20; e++) {
      const p = pyramid(20_000, e);
      for (let i = 1; i < p.length; i++) expect(p[i]!.energy).toBeLessThan(p[i - 1]!.energy);
    }
  });
  it('energy is conserved: passed on + lost = energy in the level, and the three losses add up to the loss', () => {
    expect(LOSS_SHARES.respiration + LOSS_SHARES.uneaten + LOSS_SHARES.faeces).toBeCloseTo(1);
    for (const t of transfers(pyramid(30_000, 12))) {
      expect(t.passed + t.lost).toBeCloseTo(t.passed / (t.efficiency / 100));
      expect(t.heat + t.uneaten + t.faeces).toBeCloseTo(t.lost);
      expect(t.efficiency).toBeCloseTo(12);
    }
  });
  it('higher efficiency supports more energy at the top of the chain', () => {
    expect(pyramid(10_000, 20)[3]!.energy).toBeGreaterThan(pyramid(10_000, 5)[3]!.energy);
  });
  it('Silver Springs data form a pyramid with efficiencies between 5% and 20%', () => {
    const lv = silverSprings.levels;
    expect(lv.map((l) => l.energy)).toEqual([87_100, 14_100, 1_600, 87.9]);
    for (const t of transfers(lv)) {
      expect(t.efficiency).toBeGreaterThan(5);
      expect(t.efficiency).toBeLessThan(20);
    }
    expect(efficiency(lv[1]!.energy, lv[2]!.energy)).toBeCloseTo(11.3, 1);
    // producers fix only about 1% of the sunlight reaching them
    expect(efficiency(silverSprings.sunlight, lv[0]!.energy)).toBeLessThan(2);
  });
});

describe('C4.2 Keeling curve', () => {
  it('starts near 316 ppm in 1959 and passes 420 ppm in the 2020s', () => {
    expect(annualMean(1959)).toBeCloseTo(316, 0);
    expect(annualMean(2023)).toBeGreaterThan(420);
  });
  it('the annual mean rises every year', () => {
    for (let y = 1960; y <= 2024; y++) expect(annualMean(y)).toBeGreaterThan(annualMean(y - 1));
    for (let i = 1; i < ANCHORS.length; i++) expect(ANCHORS[i]![1]).toBeGreaterThan(ANCHORS[i - 1]![1]);
  });
  it('the rate of increase has accelerated', () => {
    expect(growthRate(2010)).toBeGreaterThan(2 * growthRate(1960));
  });
  it('the seasonal cycle averages to zero, peaks in May and is lowest in late September–October', () => {
    expect(SEASONAL.reduce((a, b) => a + b, 0)).toBeCloseTo(0, 5);
    const s = yearSummary(1990);
    expect(s.maxMonth).toBe('May');
    expect(['Sep', 'Oct']).toContain(s.minMonth);
    expect(s.swing).toBeGreaterThan(5);
    expect(s.swing).toBeLessThan(8);
  });
  it('CO₂ in December is higher than in the previous December (the rise is not reversed)', () => {
    for (let y = 1960; y <= 2024; y++) expect(monthly(y, 11)).toBeGreaterThan(monthly(y - 1, 11));
  });
  it('produces 12 values per year', () => {
    expect(series().length).toBe(12 * (2024 - 1959 + 1));
    expect(MONTHS.length).toBe(12);
  });
});
