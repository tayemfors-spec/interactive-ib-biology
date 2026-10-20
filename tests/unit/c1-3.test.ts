import { describe, expect, it } from 'vitest';
import {
  CURRENT_CO2, FACE_CO2, T_OPT, bubblesPerMinute, intensityAt, lampDistance, limitingFactor, rate, tempFactor,
} from '../../src/sims/models/c1-3-limiting';
import { absorption, action, actionAboveAbsorption, colourName, explainSpectra, maxAbsorption, peakWavelength, rateFrom } from '../../src/sims/models/c1-3-spectra';
import { identify, pigments, rf, round2, spotDistance } from '../../src/sims/models/c1-3-chromatography';

describe('C1.3 limiting factors model', () => {
  const base = { light: 30, co2: CURRENT_CO2, temp: 25 };
  it('rate rises steeply with light intensity at low light, then plateaus when another factor limits', () => {
    const r = (light: number) => rate({ ...base, light });
    expect(r(0)).toBe(0);
    expect(r(20) - r(10)).toBeGreaterThan(10);
    expect(Math.abs(r(100) - r(90))).toBeLessThan(1.5);
    expect(limitingFactor({ ...base, light: 10 })).toBe('light');
    expect(limitingFactor({ ...base, light: 100 })).not.toBe('light');
  });
  it('no photosynthesis without CO₂, and rate rises with CO₂ until it plateaus', () => {
    const r = (co2: number) => rate({ ...base, light: 100, co2 });
    expect(r(0)).toBe(0);
    expect(r(300)).toBeGreaterThan(r(150));
    expect(Math.abs(r(1200) - r(1000))).toBeLessThan(1.5);
  });
  it('temperature: rate peaks at the optimum and falls steeply above it', () => {
    expect(tempFactor(T_OPT)).toBe(1);
    expect(tempFactor(20)).toBeCloseTo(0.5);
    expect(tempFactor(45)).toBe(0);
    const r = (temp: number) => rate({ light: 100, co2: 1200, temp });
    const best = [0, 10, 20, 25, 30, 35, 40, 45].reduce((a, b) => (r(b) > r(a) ? b : a));
    expect(best).toBe(T_OPT);
    expect(r(T_OPT) - r(T_OPT + 10)).toBeGreaterThan(r(T_OPT) - r(T_OPT - 5));
    expect(r(48)).toBe(0);
  });
  it('raising a non-limiting factor has little effect; raising the limiting one increases the rate', () => {
    const dim = { light: 10, co2: CURRENT_CO2, temp: 25 };
    expect(limitingFactor(dim)).toBe('light');
    expect(rate({ ...dim, co2: FACE_CO2 }) - rate(dim)).toBeLessThan(0.5);
    expect(rate({ ...dim, light: 20 }) - rate(dim)).toBeGreaterThan(8);
  });
  it('CO₂ enrichment (as in FACE) raises the rate in bright light at a warm temperature', () => {
    const bright = { light: 100, co2: CURRENT_CO2, temp: 30 };
    expect(limitingFactor(bright)).toBe('co2');
    expect(rate({ ...bright, co2: FACE_CO2 })).toBeGreaterThan(rate(bright) * 1.1);
  });
  it('lamp distance follows the inverse square law', () => {
    expect(lampDistance(100)).toBeCloseTo(10);
    expect(lampDistance(25)).toBeCloseTo(20);
    expect(intensityAt(20)).toBeCloseTo(25);
    expect(lampDistance(0)).toBe(Infinity);
  });
  it('bubble counts are proportional to the rate', () => {
    expect(bubblesPerMinute(0)).toBe(0);
    expect(bubblesPerMinute(100)).toBe(2 * bubblesPerMinute(50));
  });
});

describe('C1.3 absorption and action spectra', () => {
  it('chlorophyll a peaks in blue-violet and red; chlorophyll b peaks are inside them', () => {
    expect(peakWavelength((n) => absorption('chlA', n), 400, 500)).toBeGreaterThanOrEqual(425);
    expect(peakWavelength((n) => absorption('chlA', n), 400, 500)).toBeLessThanOrEqual(435);
    expect(peakWavelength((n) => absorption('chlA', n), 600, 700)).toBeCloseTo(662, -1);
    expect(peakWavelength((n) => absorption('chlB', n), 400, 500)).toBeCloseTo(453, -1);
    expect(peakWavelength((n) => absorption('chlB', n), 600, 700)).toBeCloseTo(642, -1);
  });
  it('chlorophylls absorb little green light; carotenoids absorb blue but not red', () => {
    expect(absorption('chlA', 540)).toBeLessThan(10);
    expect(absorption('chlB', 540)).toBeLessThan(10);
    expect(absorption('car', 470)).toBeGreaterThan(60);
    expect(absorption('car', 650)).toBeLessThan(1);
  });
  it('the action spectrum has blue and red peaks and a green trough that is above zero', () => {
    const trough = Math.min(...[520, 530, 540, 550, 560, 570].map(action));
    expect(trough).toBeGreaterThan(10);
    expect(trough).toBeLessThan(45);
    expect(action(440)).toBeGreaterThan(80);
    expect(action(670)).toBeGreaterThan(50);
    expect(Math.max(action(440), action(670))).toBeGreaterThan(2 * action(550));
  });
  it('in green-yellow light the action spectrum is above the absorption curves, and the readout says why', () => {
    for (const nm of [530, 550, 570, 590]) {
      expect(action(nm)).toBeGreaterThan(maxAbsorption(nm));
      expect(actionAboveAbsorption(nm)).toBe(true);
      const msg = explainSpectra(nm);
      expect(msg).toMatch(/path/);
      expect(msg).toMatch(/accessory pigments/);
    }
    // at the blue and red peaks absorption is high and no extra explanation is given
    expect(actionAboveAbsorption(430)).toBe(false);
    expect(actionAboveAbsorption(662)).toBe(false);
  });

  it('names colours from wavelength', () => {
    expect(colourName(430)).toBe('violet');
    expect(colourName(470)).toBe('blue');
    expect(colourName(530)).toBe('green');
    expect(colourName(680)).toBe('red');
  });
  it('rate = volume of oxygen ÷ time', () => {
    expect(rateFrom(12, 4)).toBe(3);
  });
});

describe('C1.3 chromatography', () => {
  it('Rf = distance moved by spot ÷ distance moved by solvent, between 0 and 1', () => {
    expect(rf(31, 50)).toBeCloseTo(0.62);
    expect(() => rf(60, 50)).toThrow();
    expect(() => rf(10, 0)).toThrow();
    for (const p of pigments) { expect(p.rf).toBeGreaterThan(0); expect(p.rf).toBeLessThan(1); }
  });
  it('carotene moves furthest and chlorophyll a moves further than chlorophyll b', () => {
    const by = (id: string) => pigments.find((p) => p.id === id)!.rf;
    expect(Math.max(...pigments.map((p) => p.rf))).toBe(by('carotene'));
    expect(by('chla')).toBeGreaterThan(by('chlb'));
    expect(by('chlb')).toBeGreaterThan(by('xanthophyll1'));
  });
  it('spot distance scales with the solvent front, so Rf is unchanged by run length', () => {
    expect(round2(rf(spotDistance(0.5, 40), 40))).toBe(0.5);
    expect(round2(rf(spotDistance(0.5, 80), 80))).toBe(0.5);
  });
  it('identifies pigments from an Rf value, or none if nothing is close', () => {
    expect(identify(0.61)!.id).toBe('chla');
    expect(identify(0.91)!.id).toBe('carotene');
    expect(identify(0.05)).toBeNull();
  });
});
