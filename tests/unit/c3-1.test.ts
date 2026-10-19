import { describe, expect, it } from 'vitest';
import { PH_RANGE, REST, bloodPH, model, pressureName } from '../../src/sims/models/c3-1-heart-rate';

const at = (exercise: number, pressure = 0, feedback = true) => model({ exercise, pressure, feedback });

describe('C3.1 heart-rate and ventilation model', () => {
  it('gives normal resting values', () => {
    const s = at(0);
    expect(bloodPH(REST.pco2, REST.hco3)).toBeCloseTo(7.4, 1);
    expect(s.pH).toBeGreaterThan(PH_RANGE.low);
    expect(s.pH).toBeLessThan(PH_RANGE.high);
    expect(s.heartRate).toBe(70);
    expect(s.breathRate).toBe(12);
    expect(s.ventilation).toBeCloseTo(6);
    expect(s.cardiacOutput).toBeCloseTo(4.9, 1);
  });

  it('heart rate, stroke volume, ventilation rate and depth all rise with exercise', () => {
    for (let e = 10; e <= 100; e += 10) {
      const a = at(e - 10), b = at(e);
      expect(b.heartRate).toBeGreaterThan(a.heartRate);
      expect(b.breathRate).toBeGreaterThan(a.breathRate);
      expect(b.tidalVolume).toBeGreaterThan(a.tidalVolume);
      expect(b.strokeVolume).toBeGreaterThanOrEqual(a.strokeVolume);
      expect(b.sympathetic).toBeGreaterThan(a.sympathetic);
      expect(b.vagus).toBeLessThan(a.vagus);
    }
    expect(at(100).heartRate).toBeLessThanOrEqual(195);
    expect(at(100).breathRate).toBeLessThanOrEqual(45);
  });

  it('exercise lowers blood pH, and chemoreceptor firing rises as pH falls', () => {
    for (let e = 10; e <= 100; e += 10) {
      expect(at(e).pH).toBeLessThan(at(e - 10).pH);
      expect(at(e).chemo).toBeGreaterThan(at(e - 10).chemo);
    }
  });

  it('negative feedback keeps pH close to the normal range; blocking it lets CO₂ build up and pH fall dangerously', () => {
    for (let e = 0; e <= 100; e += 10) {
      expect(at(e).pH).toBeGreaterThan(7.3);
      expect(at(e, 0, false).pco2).toBeGreaterThanOrEqual(at(e).pco2);
    }
    for (let e = 0; e <= 60; e += 10) expect(at(e).pH).toBeGreaterThan(PH_RANGE.low);
    expect(at(100, 0, false).pH).toBeLessThan(7.1);
    expect(at(100, 0, false).breathRate).toBe(REST.breathRate);
  });

  it('a rise in blood pressure increases baroreceptor firing and vagus activity and slows the heart', () => {
    const lo = at(30, -2), mid = at(30, 0), hi = at(30, 2);
    expect(hi.baro).toBeGreaterThan(mid.baro);
    expect(mid.baro).toBeGreaterThan(lo.baro);
    expect(hi.vagus).toBeGreaterThan(mid.vagus);
    expect(hi.sympathetic).toBeLessThan(mid.sympathetic);
    expect(hi.heartRate).toBeLessThan(mid.heartRate);
    expect(lo.heartRate).toBeGreaterThan(mid.heartRate);
    expect(pressureName(2)).toBe('much higher');
    expect(pressureName(0)).toBe('normal');
  });
});
