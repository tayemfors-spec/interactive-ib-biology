import { describe, expect, it } from 'vitest';
import { PRESETS, activeFraction, optimumTemp, preset, rate } from '../../src/sims/models/c1-1-rate';
import { V_FINAL, gradient, initialRate, mean, reading, timeTo, volume } from '../../src/sims/models/c1-1-measuring';
import { VMAX, competitive, none, nonCompetitive, states } from '../../src/sims/models/c1-1-inhibition';

const base = { temp: 37, ph: 7, substrate: 10, enzyme: 5 };
const amylase = preset('amylase');

describe('C1.1 enzyme activity model', () => {
  it('temperature: rate rises to an optimum near 40 °C for human enzymes, then falls steeply', () => {
    const opt = optimumTemp(amylase);
    expect(opt).toBeGreaterThan(36);
    expect(opt).toBeLessThan(43);
    const r = (t: number) => rate({ ...base, temp: t }, amylase);
    expect(r(20)).toBeLessThan(r(30));
    expect(r(30)).toBeLessThan(r(opt));
    expect(r(opt + 5)).toBeLessThan(r(opt));
    // the fall above the optimum is steeper than the rise below it
    expect(r(opt) - r(opt + 10)).toBeGreaterThan(r(opt) - r(opt - 10));
    expect(r(60)).toBeLessThan(1);
  });

  it('a thermophile enzyme has a much higher optimum temperature', () => {
    expect(optimumTemp(preset('thermophile'))).toBeGreaterThan(65);
  });

  it('heat denaturation is irreversible: cooling does not restore the rate', () => {
    const fresh = rate({ ...base }, amylase);
    const afterHeating = rate({ ...base, maxTemp: 65 }, amylase);
    expect(afterHeating).toBeLessThan(fresh * 0.01);
    expect(activeFraction(37, amylase.tm, 37)).toBeGreaterThan(0.95);
    expect(activeFraction(37, amylase.tm, 65)).toBeLessThan(0.001);
  });

  it('pH: each enzyme has a bell-shaped curve that peaks at its own optimum', () => {
    for (const p of PRESETS) {
      const r = (ph: number) => rate({ ...base, ph }, p);
      const peak = Math.max(...Array.from({ length: 141 }, (_, i) => r(i / 10)));
      expect(r(p.optPH)).toBeCloseTo(peak, 6);
      expect(r(p.optPH - 2)).toBeLessThan(r(p.optPH));
      expect(r(p.optPH + 2)).toBeLessThan(r(p.optPH));
    }
    expect(preset('pepsin').optPH).toBeLessThan(3);
    expect(rate({ ...base, ph: 2 }, preset('pepsin'))).toBeGreaterThan(rate({ ...base, ph: 7 }, preset('pepsin')));
  });

  it('substrate concentration: rate rises then levels off when active sites are saturated', () => {
    const r = (s: number) => rate({ ...base, substrate: s }, amylase);
    expect(r(0)).toBe(0);
    expect(r(2) - r(1)).toBeGreaterThan(r(20) - r(19));
    expect(r(19)).toBeLessThan(r(20));
    expect(r(1000) / r(20)).toBeLessThan(1.15);
  });

  it('enzyme concentration: doubling the enzyme doubles the rate', () => {
    expect(rate({ ...base, enzyme: 8 }, amylase)).toBeCloseTo(2 * rate({ ...base, enzyme: 4 }, amylase), 6);
  });
});

describe('C1.1 catalase measuring model', () => {
  it('more enzyme gives a faster initial rate but the same final volume of oxygen', () => {
    expect(initialRate(4)).toBeCloseTo(2 * initialRate(2), 9);
    expect(volume(5000, 1)).toBeCloseTo(V_FINAL, 3);
    expect(volume(5000, 4)).toBeCloseTo(V_FINAL, 3);
  });
  it('the curve is steepest at the start (substrate is being used up)', () => {
    expect(gradient(0, 2)).toBeGreaterThan(gradient(30, 2));
    expect(gradient(30, 2)).toBeGreaterThan(gradient(90, 2));
    const h = 1e-4;
    expect((volume(h, 2) - volume(0, 2)) / h).toBeCloseTo(initialRate(2), 3);
  });
  it('time to collect a set volume falls as enzyme rises, so 1/time rises', () => {
    expect(timeTo(10, 4)).toBeLessThan(timeTo(10, 2));
    expect(1 / timeTo(10, 4)).toBeCloseTo(2 / timeTo(10, 2), 9);
    expect(timeTo(V_FINAL + 1, 3)).toBe(Infinity);
  });
  it('repeat readings scatter around the model and never decrease', () => {
    for (let r = 0; r < 3; r++) {
      let prev = 0;
      for (let t = 0; t <= 180; t += 10) {
        const v = reading(r, t, 2);
        expect(v).toBeGreaterThanOrEqual(prev);
        prev = v;
      }
    }
    const m = mean([0, 1, 2].map((r) => reading(r, 60, 2)));
    expect(Math.abs(m - volume(60, 2))).toBeLessThan(2);
  });
});

describe('C1.1 inhibition model (AHL)', () => {
  it('competitive inhibition is overcome by high substrate concentration (same Vmax)', () => {
    expect(competitive(1, 2)).toBeLessThan(none(1) * 0.5);
    expect(competitive(10000, 2) / VMAX).toBeGreaterThan(0.99);
  });
  it('non-competitive inhibition lowers Vmax, whatever the substrate concentration', () => {
    expect(nonCompetitive(10000, 1) / VMAX).toBeCloseTo(0.5, 2);
    expect(nonCompetitive(10000, 3) / VMAX).toBeCloseTo(0.25, 2);
    // the same fraction of the uninhibited rate at every [S]
    expect(nonCompetitive(1, 1) / none(1)).toBeCloseTo(nonCompetitive(50, 1) / none(50), 9);
  });
  it('raising [S] displaces a competitive inhibitor but not a non-competitive one', () => {
    expect(states('competitive', 50, 2).inhibitor).toBeLessThan(states('competitive', 1, 2).inhibitor);
    expect(states('noncompetitive', 50, 2).inhibitor).toBeCloseTo(states('noncompetitive', 1, 2).inhibitor, 9);
    for (const m of ['competitive', 'noncompetitive'] as const) {
      const s = states(m, 3, 1);
      expect(s.free + s.substrate + s.inhibitor).toBeCloseTo(1, 9);
    }
  });
  it('no inhibitor means no inhibition', () => {
    expect(competitive(3, 0)).toBeCloseTo(none(3), 9);
    expect(nonCompetitive(3, 0)).toBeCloseTo(none(3), 9);
  });
});
