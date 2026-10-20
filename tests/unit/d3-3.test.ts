import { describe, expect, it } from 'vitest';
import { RENAL_THRESHOLD, SET_POINT, simulate, summarise, type Condition, type GlucoseEvent } from '../../src/sims/models/d3-3-glucose';
import { model as thermo, SET_POINT as CORE } from '../../src/sims/models/d3-3-thermo';

const run = (condition: Condition, events: GlucoseEvent[], treated = false) => simulate({ condition, treated, events });
const meal: GlucoseEvent[] = [{ kind: 'meal', t: 60 }];
const exercise: GlucoseEvent[] = [{ kind: 'exercise', t: 60 }];

describe('D3.3 blood glucose model', () => {
  it('a healthy person rests at the set point with fasting hormone levels', () => {
    const r = run('healthy', []);
    for (const s of r) {
      expect(s.glucose).toBeCloseTo(SET_POINT, 1);
      expect(s.insulin).toBeCloseTo(1, 1);
      expect(s.glucagon).toBeCloseTo(1, 1);
    }
  });

  it('after a meal glucose rises, insulin rises, glucagon falls and glycogen is stored; negative feedback restores the set point', () => {
    const r = run('healthy', meal);
    const peak = r.reduce((a, b) => (b.glucose > a.glucose ? b : a));
    expect(peak.glucose).toBeGreaterThan(6.2);
    expect(peak.glucose).toBeLessThan(8.5);
    expect(peak.insulin).toBeGreaterThan(2);
    expect(peak.glucagon).toBeLessThan(1);
    expect(peak.glycogenFlux).toBeGreaterThan(0);
    expect(Math.abs(r[300]!.glucose - SET_POINT)).toBeLessThan(0.3);
    expect(summarise(r).timeOutside).toBe(0);
  });

  it('during exercise glucose dips, insulin falls and glucagon rises (glycogenolysis), and glucose recovers', () => {
    const r = run('healthy', exercise);
    const low = r.reduce((a, b) => (b.glucose < a.glucose ? b : a));
    expect(low.glucose).toBeLessThan(SET_POINT - 0.1);
    expect(low.glucose).toBeGreaterThan(4);
    expect(low.glucagon).toBeGreaterThan(1);
    expect(low.insulin).toBeLessThan(1);
    expect(low.glycogenFlux).toBeLessThan(0);
    expect(Math.abs(r[300]!.glucose - SET_POINT)).toBeLessThan(0.2);
  });

  it('untreated type 1 diabetes: no insulin, persistently high glucose and glucose in the urine', () => {
    const r = run('type1', meal);
    expect(r.every((s) => s.insulin === 0)).toBe(true);
    const s = summarise(r);
    expect(s.fasting).toBeGreaterThan(RENAL_THRESHOLD);
    expect(s.peak).toBeGreaterThan(s.fasting + 3);
    expect(s.urineMinutes).toBe(r.length);
  });

  it('insulin injections bring type 1 glucose back near the normal range', () => {
    const untreated = summarise(run('type1', meal));
    const treated = summarise(run('type1', meal, true));
    expect(treated.peak).toBeLessThan(untreated.peak);
    expect(treated.peak).toBeLessThan(RENAL_THRESHOLD);
    expect(treated.fasting).toBeLessThan(6);
  });

  it('type 2 diabetes: insulin resistance gives raised fasting glucose and a high, slow peak despite more insulin', () => {
    const healthy = run('healthy', meal), t2 = run('type2', meal);
    const h = summarise(healthy), d = summarise(t2);
    expect(d.fasting).toBeGreaterThanOrEqual(7);
    expect(d.peak).toBeGreaterThan(11);
    expect(t2[0]!.insulin).toBeGreaterThan(healthy[0]!.insulin);
    expect(d.timeOutside).toBeGreaterThan(h.timeOutside);
  });

  it('two meals give two peaks in a healthy person', () => {
    const r = run('healthy', [{ kind: 'meal', t: 30 }, { kind: 'meal', t: 300 }]);
    expect(r[70]!.glucose).toBeGreaterThan(6);
    expect(r[260]!.glucose).toBeLessThan(5.5);
    expect(r[340]!.glucose).toBeGreaterThan(6);
  });
});

describe('D3.3 thermoregulation model', () => {
  const at = (air: number, activity = 0, feedback = true) => thermo({ air, activity, feedback });

  it('negative feedback keeps core temperature close to 37 °C from −10 to 45 °C at rest', () => {
    for (let a = -10; a <= 45; a += 5) expect(Math.abs(at(a).core - CORE)).toBeLessThan(0.4);
  });

  it('without feedback core temperature drifts into hypothermia or hyperthermia', () => {
    expect(at(-10, 0, false).core).toBeLessThan(35);
    expect(at(45, 2, false).core).toBeGreaterThan(40);
  });

  it('cold: vasoconstriction, hair erection, shivering, brown fat and more thyroxin; no sweating', () => {
    const n = at(24), c = at(-5);
    expect(c.skinFlow).toBeLessThan(n.skinFlow);
    expect(c.hair).toBeGreaterThan(0.5);
    expect(c.shiver).toBeGreaterThan(0);
    expect(c.brownFat).toBeGreaterThan(0);
    expect(c.thyroxin).toBeGreaterThan(1);
    expect(c.sweat).toBe(0);
  });

  it('heat and exercise: vasodilation and sweating; no shivering or hair erection', () => {
    const n = at(24);
    for (const h of [at(40), at(20, 2)]) {
      expect(h.skinFlow).toBeGreaterThan(n.skinFlow);
      expect(h.sweat).toBeGreaterThan(0.5);
      expect(h.shiver).toBe(0);
      expect(h.hair).toBe(0);
      expect(h.brownFat).toBe(0);
      expect(h.sweat).toBeLessThanOrEqual(2);
    }
  });

  it('responses grow as the deviation grows', () => {
    for (let a = 20; a >= -10; a -= 5) {
      expect(at(a - 5).skinFlow).toBeLessThanOrEqual(at(a).skinFlow);
      expect(at(a - 5).shiver).toBeGreaterThanOrEqual(at(a).shiver);
    }
    for (let a = 25; a <= 40; a += 5) expect(at(a + 5).sweat).toBeGreaterThan(at(a).sweat);
  });

  it('at the neutral temperature there is no sweating, shivering or brown-fat heat', () => {
    const n = at(24);
    expect(n.sweat).toBe(0);
    expect(n.shiver).toBe(0);
    expect(n.brownFat).toBe(0);
    expect(n.thyroxin).toBeCloseTo(1);
  });
});
