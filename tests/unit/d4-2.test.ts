import { describe, expect, it } from 'vitest';
import { DEFAULTS as H, at as hAt, collapseYear, effortYield, equilibria, msy, nAtMsy, simulate as harvest, surplus, totalCatch } from '../../src/sims/models/d4-2-harvest';
import { BASELINE, SPECIES, at, percentOf, simulate, speciesChanged, type KeystoneRun } from '../../src/sims/models/d4-2-keystone';

describe('D4.2 sustainable harvesting (logistic model)', () => {
  const r = 0.4, K = 1000;
  it('MSY = rK/4 and occurs at N = K/2', () => {
    expect(msy(r, K)).toBeCloseTo(100);
    expect(nAtMsy(K)).toBe(500);
    expect(surplus(r, K, K / 2)).toBeCloseTo(msy(r, K));
    for (const N of [100, 250, 400, 600, 750, 900]) expect(surplus(r, K, N)).toBeLessThan(surplus(r, K, K / 2));
  });
  it('there is no surplus to harvest at zero or at carrying capacity', () => {
    expect(surplus(r, K, 0)).toBe(0);
    expect(surplus(r, K, K)).toBeCloseTo(0);
    expect(surplus(r, K, 1.2 * K)).toBeLessThan(0);
  });
  it('with no fishing an unfished stock stays at K', () => {
    const s = harvest({ ...H, quota: 0 }, 60);
    expect(s.at(-1)!.N).toBeCloseTo(K, 3);
  });
  it('a quota below MSY is sustainable: the stock settles at the upper equilibrium', () => {
    const p = { ...H, quota: 60 };
    const eq = equilibria(p);
    expect(eq.stable!).toBeGreaterThan(K / 2);
    expect(eq.unstable!).toBeLessThan(K / 2);
    expect(surplus(r, K, eq.stable!)).toBeCloseTo(60);
    const s = harvest(p, 200);
    expect(collapseYear(s)).toBeNull();
    expect(s.at(-1)!.N).toBeCloseTo(eq.stable!, 0);
  });
  it('a quota above MSY always leads to collapse', () => {
    for (const q of [105, 120, 150]) {
      const p = { ...H, quota: q };
      expect(equilibria(p).stable).toBeNull();
      expect(collapseYear(harvest(p, 120))).not.toBeNull();
    }
    // a larger overshoot collapses sooner
    expect(collapseYear(harvest({ ...H, quota: 150 }, 120))!).toBeLessThan(collapseYear(harvest({ ...H, quota: 110 }, 120))!);
  });
  it('the stock never becomes negative and stops being caught once it is gone', () => {
    const s = harvest({ ...H, quota: 200 }, 60);
    for (const p of s) expect(p.N).toBeGreaterThanOrEqual(0);
    expect(s.at(-1)!.catch).toBe(0);
  });
  it('a fixed effort of r/2 gives the MSY and holds the stock at K/2', () => {
    expect(effortYield(r, K, r / 2)).toBeCloseTo(msy(r, K));
    expect(effortYield(r, K, 0.1)).toBeLessThan(msy(r, K));
    expect(effortYield(r, K, 0.3)).toBeLessThan(msy(r, K));
    const s = harvest({ ...H, mode: 'effort', effort: r / 2 }, 200);
    expect(s.at(-1)!.N).toBeCloseTo(K / 2, 0);
    expect(s.at(-1)!.catch).toBeCloseTo(msy(r, K), 0);
  });
  it('an effort at or above r drives the stock towards zero', () => {
    const s = harvest({ ...H, mode: 'effort', effort: 0.5 }, 200);
    expect(s.at(-1)!.N).toBeLessThan(10);
  });
  it('overfishing gives a smaller total catch in the long run than fishing at MSY', () => {
    const atMsy = totalCatch(harvest({ ...H, mode: 'effort', effort: r / 2 }, 100));
    const over = totalCatch(harvest({ ...H, quota: 150 }, 100));
    expect(atMsy).toBeGreaterThan(over);
    expect(hAt(harvest({ ...H, quota: 150 }, 100), 100).N).toBe(0);
  });
});

describe('D4.2 keystone species (kelp-forest model)', () => {
  const runOf = (remove: KeystoneRun['remove'], reintroduceAt: number | null = null): KeystoneRun => ({ remove, removeAt: 10, reintroduceAt, years: 80 });
  it('the intact community is at a steady state with plentiful kelp and scarce urchins', () => {
    const s = simulate(runOf(null));
    for (const id of SPECIES) expect(percentOf(id, s.at(-1)!.s[id])).toBeCloseTo(100, 0);
    expect(BASELINE.kelp).toBeGreaterThan(0.8);
    expect(BASELINE.urchin).toBeLessThan(0.1);
  });
  it('removing sea otters (keystone) triggers a trophic cascade: urchins boom, kelp and rockfish crash', () => {
    const s = simulate(runOf('otter'));
    const end = s.at(-1)!.s;
    expect(end.otter).toBe(0);
    expect(percentOf('urchin', end.urchin)).toBeGreaterThan(400);
    expect(percentOf('kelp', end.kelp)).toBeLessThan(15);
    expect(percentOf('fish', end.fish)).toBeLessThan(40);
    expect(speciesChanged(s, runOf('otter'), 80)).toHaveLength(4);
  });
  it('removing a non-keystone species (crabs or rockfish) leaves the kelp forest intact', () => {
    for (const sp of ['crab', 'fish'] as const) {
      const end = simulate(runOf(sp)).at(-1)!.s;
      expect(percentOf('kelp', end.kelp)).toBeGreaterThan(90);
      expect(percentOf('urchin', end.urchin)).toBeLessThan(150);
    }
    expect(speciesChanged(simulate(runOf('fish')), runOf('fish'), 80)).toHaveLength(0);
  });
  it('removing otters affects kelp far more than removing crabs, although otters are fewer', () => {
    const kelpLossOtter = 100 - percentOf('kelp', simulate(runOf('otter')).at(-1)!.s.kelp);
    const kelpLossCrab = 100 - percentOf('kelp', simulate(runOf('crab')).at(-1)!.s.kelp);
    expect(kelpLossOtter).toBeGreaterThan(10 * kelpLossCrab);
  });
  it('reintroducing otters lets the kelp forest recover', () => {
    const s = simulate(runOf('otter', 40));
    expect(percentOf('kelp', at(s, 39).s.kelp)).toBeLessThan(15);
    expect(percentOf('kelp', s.at(-1)!.s.kelp)).toBeGreaterThan(90);
    expect(percentOf('urchin', s.at(-1)!.s.urchin)).toBeLessThan(150);
  });
  it('populations never go negative', () => {
    for (const sp of [null, 'otter', 'crab', 'fish'] as const) {
      for (const p of simulate(runOf(sp, 40))) for (const id of SPECIES) expect(p.s[id]).toBeGreaterThanOrEqual(0);
    }
  });
});
