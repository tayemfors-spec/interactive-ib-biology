import { describe, expect, it } from 'vitest';
import {
  actualSize, bestUnit, checkAnswer, fmt, fromUm, imageSize, magFromScaleBar, magnification, makeQuestion, niceScaleBar,
  readScaleBarWorking, scaleBarMm, scaleBarWorking, solve, toUm,
} from '../../src/sims/models/a2-2-magnification';

/** Deterministic random numbers for the practice generator. */
const seq = (seed: number) => { let a = seed; return () => { a = (a * 16807) % 2147483647; return (a - 1) / 2147483646; }; };

describe('A2.2 magnification model', () => {
  it('converts units: 1 mm = 1000 µm and 1 µm = 1000 nm', () => {
    expect(toUm(1, 'mm')).toBe(1000);
    expect(toUm(250, 'nm')).toBeCloseTo(0.25);
    expect(fromUm(12, 'mm')).toBeCloseTo(0.012);
    expect(fromUm(0.025, 'nm')).toBeCloseTo(25);
  });

  it('magnification = image size ÷ actual size, in the same units', () => {
    // a 3 µm mitochondrion drawn 36 mm long is magnified ×12,000
    expect(magnification(toUm(36, 'mm'), 3)).toBeCloseTo(12000);
    // the units must be converted first: a 32 mm image of an 80 µm leaf section is ×400
    expect(magnification(toUm(32, 'mm'), 80)).toBeCloseTo(400);
  });

  it('the three rearrangements are consistent with each other', () => {
    for (const [I, A] of [[30000, 2.5], [12, 0.004], [45000, 60]] as const) {
      const M = magnification(I, A);
      expect(actualSize(I, M)).toBeCloseTo(A);
      expect(imageSize(A, M)).toBeCloseTo(I);
    }
  });

  it('solves for any one quantity and shows the unit conversion in the working', () => {
    const m = solve('magnification', { image: { value: 18, unit: 'mm' }, actual: { value: 3, unit: 'µm' } });
    expect(m.ok).toBe(true);
    expect(m.result).toBeCloseTo(6000);
    expect(m.steps.join(' ')).toContain('18,000 µm');
    const a = solve('actual', { image: { value: 12, unit: 'mm' }, mag: 1000 });
    expect(a.result).toBeCloseTo(12); // µm: a nucleus 12 mm wide in a ×1,000 drawing
    expect(a.text).toContain('12 µm');
    const small = solve('actual', { image: { value: 25, unit: 'mm' }, mag: 1_000_000 });
    expect(small.text).toContain('25 nm');
    const i = solve('image', { actual: { value: 7.5, unit: 'µm' }, mag: 4000 });
    expect(i.text).toContain('30 mm');
  });

  it('rejects zero, negative or missing values', () => {
    expect(solve('magnification', { image: { value: 0, unit: 'mm' }, actual: { value: 3, unit: 'µm' } }).ok).toBe(false);
    expect(solve('actual', { image: { value: 10, unit: 'mm' }, mag: -5 }).ok).toBe(false);
    expect(solve('image', { mag: 100 }).ok).toBe(false);
  });

  it('chooses sensible units and formats numbers', () => {
    expect(bestUnit(0.025)).toBe('nm');
    expect(bestUnit(7.5)).toBe('µm');
    expect(bestUnit(1500)).toBe('mm');
    expect(fmt(12000)).toBe('12,000');
    expect(fmt(2.4999999999)).toBe('2.5');
  });

  it('scale bars: bar length = length represented × magnification', () => {
    expect(scaleBarMm(10, 1000)).toBeCloseTo(10); // 10 µm at ×1,000 → 10 mm
    expect(magFromScaleBar(20, 5)).toBeCloseTo(4000);
    expect(scaleBarWorking(10, 1000).text).toContain('10 mm');
    expect(readScaleBarWorking(20, 5).result).toBeCloseTo(4000);
    for (const M of [40, 400, 2500, 12000, 250000]) {
      const b = niceScaleBar(M);
      expect(b.barMm).toBeGreaterThanOrEqual(10);
      expect(b.barMm).toBeLessThanOrEqual(50);
      const lead = Number(b.representsUm.toExponential().split('e')[0]);
      expect([1, 2, 5]).toContain(lead);
    }
  });

  it('practice questions have consistent, checkable answers', () => {
    const rand = seq(42);
    for (let n = 0; n < 200; n++) {
      const q = makeQuestion(rand);
      expect(q.answer).toBeGreaterThan(0);
      expect(checkAnswer(q.answer, q)).toBe(true);
      expect(checkAnswer(q.answer * 1.1, q)).toBe(false);
      expect(checkAnswer(q.answer * 1000, q)).toBe(false); // a missed unit conversion is marked wrong
      expect(q.working.length).toBeGreaterThan(1);
    }
  });
});
