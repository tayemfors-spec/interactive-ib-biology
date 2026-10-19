import { describe, expect, it } from 'vitest';
import {
  CAPILLARY_RADIUS_MM, START_READING, capillaryArea, distanceMoved, dropSpeed, o2Uptake, offScale, optimumTemp, rateFromReadings,
  readingAt, relativeRate, volumeFall, type Setup,
} from '../../src/sims/models/c1-2-respirometer';

const seeds = (tempC = 20, extra: Partial<Setup> = {}): Setup => ({ tempC, massG: 5, sample: 'germinating', absorber: true, ...extra });

describe('C1.2 respirometer model', () => {
  it('rate rises with temperature below the optimum (roughly doubling per 10 °C)', () => {
    expect(relativeRate(20)).toBeCloseTo(1, 1);
    expect(relativeRate(30) / relativeRate(20)).toBeGreaterThan(1.7);
    expect(relativeRate(30) / relativeRate(20)).toBeLessThan(2.1);
    for (let t = 5; t < 34; t++) expect(relativeRate(t + 1)).toBeGreaterThan(relativeRate(t));
  });

  it('rate peaks in the mid to high 30s and then falls as enzymes denature', () => {
    const opt = optimumTemp();
    expect(opt).toBeGreaterThanOrEqual(33);
    expect(opt).toBeLessThanOrEqual(39);
    expect(relativeRate(45)).toBeLessThan(relativeRate(opt) / 2);
    for (let t = opt + 1; t < 50; t++) expect(relativeRate(t + 1)).toBeLessThan(relativeRate(t));
  });

  it('controls: boiled seeds and glass beads cause no movement', () => {
    expect(o2Uptake(seeds(25, { sample: 'boiled' }))).toBe(0);
    expect(distanceMoved(seeds(25, { sample: 'beads' }), 10)).toBe(0);
  });

  it('without a CO₂ absorber the drop hardly moves, because CO₂ released replaces O₂ used (RQ = 1)', () => {
    expect(volumeFall(seeds(25, { absorber: false }))).toBeCloseTo(0);
    expect(volumeFall(seeds(25))).toBeGreaterThan(0);
  });

  it('distance moved is proportional to time and to mass (until the drop leaves the scale)', () => {
    const s = seeds(20);
    expect(distanceMoved(s, 6)).toBeCloseTo(2 * distanceMoved(s, 3));
    expect(distanceMoved(seeds(20, { massG: 4 }), 5)).toBeCloseTo(2 * distanceMoved(seeds(20, { massG: 2 }), 5));
    expect(readingAt(s, 0)).toBe(START_READING);
    expect(readingAt(s, 5)).toBeLessThan(START_READING);
  });

  it('the drop stops at the end of the scale and this is flagged', () => {
    const hot = seeds(36, { massG: 10 });
    expect(distanceMoved(hot, 10)).toBe(START_READING);
    expect(offScale(hot, 10)).toBe(true);
    expect(offScale(seeds(20), 10)).toBe(false);
  });

  it('rate calculation: volume = πr²d, then divide by time and mass', () => {
    const r = rateFromReadings(90, 70, 10, 5, 0.5);
    expect(r.distance).toBe(20);
    expect(r.volume).toBeCloseTo(Math.PI * 0.25 * 20); // 15.7 mm³
    expect(r.perMin).toBeCloseTo(1.571, 2);
    expect(r.perGramPerMin).toBeCloseTo(0.314, 2);
  });

  it('calculating from the simulated readings recovers the O₂ uptake that produced them', () => {
    const s = seeds(25, { massG: 6 });
    const end = readingAt(s, 8);
    const r = rateFromReadings(START_READING, end, 8, s.massG, CAPILLARY_RADIUS_MM);
    expect(r.perMin).toBeCloseTo(o2Uptake(s), 6);
    expect(dropSpeed(s) * capillaryArea()).toBeCloseTo(o2Uptake(s), 6);
  });
});
