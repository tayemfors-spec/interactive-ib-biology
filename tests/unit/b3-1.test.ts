import { describe, expect, it } from 'vitest';
import {
  LUNG_PO2, STANDARD_PCO2, p50, phFromPco2, saturation, slope, unloading,
} from '../../src/sims/models/b3-1-dissociation';
import {
  REST, answerFor, breathsIn, checkReading, lungVolumes, makePerson, sampleTrace, tracePlan, traceVolume,
} from '../../src/sims/models/b3-1-spirometer';
import { TRUE_DENSITY, density, fieldArea, makeField, mean, poisson, sd, working } from '../../src/sims/models/b3-1-stomata';

/** Deterministic random numbers. */
const seq = (seed: number) => { let a = seed; return () => { a = (a * 16807) % 2147483647; return (a - 1) / 2147483646; }; };

describe('B3.1 oxygen dissociation model', () => {
  it('adult haemoglobin is 50 % saturated at its P50 of about 3.5 kPa (≈ 26–27 mmHg)', () => {
    expect(p50('adult')).toBeCloseTo(3.5, 1);
    expect(p50('adult') * 7.5).toBeGreaterThan(25.5); // 1 kPa ≈ 7.5 mmHg
    expect(p50('adult') * 7.5).toBeLessThan(27.5);
    expect(saturation(p50('adult'))).toBeCloseTo(0.5, 5);
  });

  it('standard conditions give pH 7.4', () => {
    expect(phFromPco2(STANDARD_PCO2)).toBeCloseTo(7.4, 1);
    expect(phFromPco2(9)).toBeLessThan(7.3);
  });

  it('is sigmoid: the slope rises and then falls, with the steepest part in the tissue range', () => {
    const xs = Array.from({ length: 130 }, (_, i) => 0.1 + i * 0.1);
    const slopes = xs.map((x) => slope(x));
    const iMax = slopes.indexOf(Math.max(...slopes));
    expect(iMax).toBeGreaterThan(5); // not steepest at the origin, unlike a hyperbola
    expect(xs[iMax]!).toBeGreaterThan(1.5);
    expect(xs[iMax]!).toBeLessThan(4);
    expect(slopes[0]!).toBeLessThan(slopes[iMax]!);
    expect(slopes[slopes.length - 1]!).toBeLessThan(slopes[iMax]! / 10);
  });

  it('is nearly fully saturated in the lungs and gives up much of its oxygen in respiring tissue', () => {
    expect(saturation(LUNG_PO2)).toBeGreaterThan(0.95);
    expect(saturation(5.3)).toBeGreaterThan(0.65); // resting venous blood ≈ 75 %
    expect(saturation(5.3)).toBeLessThan(0.8);
    expect(saturation(2)).toBeLessThan(0.25);
  });

  it('saturation always increases with pO₂ and stays between 0 and 1', () => {
    let prev = -1;
    for (let x = 0; x <= 20; x += 0.25) {
      const s = saturation(x);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
      expect(s).toBeGreaterThan(prev);
      prev = s;
    }
  });

  it('Bohr shift: more CO₂ raises P50 (curve moves right) and lowers saturation at tissue pO₂', () => {
    expect(p50('adult', 8)).toBeGreaterThan(p50('adult', STANDARD_PCO2));
    expect(p50('adult', 4)).toBeLessThan(p50('adult', STANDARD_PCO2));
    for (const x of [2, 3, 4, 5, 6]) expect(saturation(x, 'adult', 8)).toBeLessThan(saturation(x, 'adult', STANDARD_PCO2));
  });

  it('the Bohr shift increases the oxygen released to actively respiring tissue', () => {
    const resting = unloading(4, STANDARD_PCO2);
    const active = unloading(4, 8);
    expect(active.released).toBeGreaterThan(resting.released);
    // loading in the lungs is unaffected, because it happens at the standard pCO₂ on the plateau
    expect(active.lungs).toBeCloseTo(resting.lungs, 6);
  });

  it('foetal haemoglobin has a higher affinity: curve to the left, more saturated at every pO₂', () => {
    expect(p50('foetal')).toBeLessThan(p50('adult'));
    for (const x of [1, 2, 3, 4, 6, 8]) expect(saturation(x, 'foetal')).toBeGreaterThan(saturation(x, 'adult'));
    // at a placental pO₂ of about 4 kPa, oxygen moves from maternal to foetal haemoglobin
    expect(saturation(4, 'foetal') - saturation(4, 'adult')).toBeGreaterThan(0.15);
  });

  it('myoglobin (no cooperativity) gives a hyperbola: steepest at the origin, far left of haemoglobin', () => {
    expect(slope(0.05, 'myoglobin')).toBeGreaterThan(slope(1, 'myoglobin'));
    expect(saturation(2, 'myoglobin')).toBeGreaterThan(0.8);
    expect(p50('myoglobin', 8)).toBe(p50('myoglobin'));
  });
});

describe('B3.1 spirometer model', () => {
  it('resting volumes are typical adult values and VC = IRV + TV + ERV', () => {
    const v = lungVolumes(0);
    expect(v.tv).toBeCloseTo(0.5);
    expect(v.vc).toBeCloseTo(v.irv + v.tv + v.erv);
    expect(v.vc).toBeGreaterThanOrEqual(4);
    expect(v.vc).toBeLessThanOrEqual(5);
    expect(v.tlc).toBeCloseTo(v.vc + v.rv);
    expect(v.minuteVentilation).toBeCloseTo(6);
  });

  it('exercise increases tidal volume and rate, uses up both reserves, and leaves VC unchanged', () => {
    const rest = lungVolumes(0);
    const ex = lungVolumes(1);
    expect(ex.tv).toBeGreaterThan(rest.tv);
    expect(ex.rate).toBeGreaterThan(rest.rate);
    expect(ex.irv).toBeLessThan(rest.irv);
    expect(ex.erv).toBeLessThan(rest.erv);
    expect(ex.vc).toBeCloseTo(rest.vc);
    expect(ex.erv).toBeGreaterThan(0);
    expect(ex.irv).toBeGreaterThan(0);
    expect(ex.minuteVentilation).toBeCloseTo(ex.tv * ex.rate);
  });

  it('the trace oscillates between FRC and FRC + TV, and the deep breath spans the vital capacity', () => {
    const v = lungVolumes(0);
    const plan = tracePlan(v);
    const tidal = sampleTrace(v).filter(([t]) => t < plan.vcStart).map(([, y]) => y);
    expect(Math.min(...tidal)).toBeCloseTo(v.frc, 2);
    expect(Math.max(...tidal)).toBeCloseTo(v.frc + v.tv, 2);
    expect(traceVolume(plan.vcPeak, v, plan)).toBeCloseTo(v.tlc, 6);
    expect(traceVolume(plan.vcLow, v, plan)).toBeCloseTo(v.rv, 6);
    // never below the residual volume: the lungs cannot be emptied
    for (const [, y] of sampleTrace(v)) expect(y).toBeGreaterThanOrEqual(v.rv - 1e-9);
    expect(breathsIn(v, 60)).toBe(REST.rate);
  });

  it('the trace is continuous at each change of phase', () => {
    for (const e of [0, 0.5, 1]) {
      const v = lungVolumes(e);
      const plan = tracePlan(v);
      for (const t of [plan.vcStart, plan.vcPeak, plan.vcLow, plan.vcEnd]) {
        expect(Math.abs(traceVolume(t - 1e-4, v, plan) - traceVolume(t + 1e-4, v, plan))).toBeLessThan(0.01);
      }
    }
  });

  it('practice people have readable volumes and the checker accepts the right reading', () => {
    const rand = seq(11);
    for (let i = 0; i < 30; i++) {
      const p = makePerson(rand);
      expect(p.v.vc).toBeCloseTo(p.v.irv + p.v.tv + p.v.erv);
      const c = answerFor(p);
      expect(checkReading(p, c).ok).toBe(true);
      expect(checkReading(p, c + 1).ok).toBe(false);
    }
    const tv = makePerson(seq(3), 'tv');
    expect(checkReading(tv, tv.v.tv + 0.1).ok).toBe(true);
    expect(checkReading(tv, tv.v.tv + 0.25).ok).toBe(false);
    // a common error: reading vital capacity as the top of the trace (TLC) is marked wrong
    const vc = makePerson(seq(5), 'vc');
    expect(checkReading(vc, vc.v.tlc).ok).toBe(false);
  });
});

describe('B3.1 stomatal density model', () => {
  it('field area uses the radius: π (d ÷ 2)²', () => {
    expect(fieldArea(0.4)).toBeCloseTo(0.1257, 4);
    expect(fieldArea(1)).toBeCloseTo(Math.PI / 4);
  });

  it('density = mean count ÷ field area (stomata per mm²)', () => {
    expect(density(19, fieldArea(0.4))).toBeCloseTo(151.2, 0);
    const w = working([18, 21, 17, 20], 0.4);
    expect(w.mean).toBeCloseTo(19);
    expect(Math.round(w.density)).toBe(151);
    expect(w.lines.join(' ')).toContain('π × 0.200²');
  });

  it('mean and sample standard deviation', () => {
    expect(mean([2, 4, 6])).toBe(4);
    expect(sd([2, 4, 6])).toBeCloseTo(2);
    expect(Number.isNaN(sd([3]))).toBe(true);
  });

  it('Poisson counts average to λ', () => {
    const rand = seq(42);
    const xs = Array.from({ length: 4000 }, () => poisson(18, rand));
    expect(mean(xs)).toBeGreaterThan(17.5);
    expect(mean(xs)).toBeLessThan(18.5);
  });

  it('fields vary, all stomata lie inside the field, and the mean of many fields estimates the true density', () => {
    const rand = seq(7);
    const d = 0.4;
    const counts = Array.from({ length: 400 }, () => {
      const f = makeField(rand, 'lower', d);
      for (const s of f) expect(Math.hypot(s.x, s.y)).toBeLessThanOrEqual(d / 2 + 1e-12);
      return f.length;
    });
    expect(new Set(counts.slice(0, 10)).size).toBeGreaterThan(2); // single counts differ
    const est = density(mean(counts), fieldArea(d));
    expect(Math.abs(est - TRUE_DENSITY.lower) / TRUE_DENSITY.lower).toBeLessThan(0.06);
    const upper = density(mean(Array.from({ length: 200 }, () => makeField(rand, 'upper', d).length)), fieldArea(d));
    expect(upper).toBeLessThan(est);
  });
});
