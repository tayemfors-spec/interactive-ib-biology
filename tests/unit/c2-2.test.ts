import { describe, expect, it } from 'vitest';
import {
  PEAK, REST, STEP_WINDOWS, THRESHOLD, T_PEAK, T_THRESHOLD, UNDERSHOOT, impulseFrequency, kChannelOpen, membranePotential, naChannel,
} from '../../src/sims/models/c2-2-action-potential';
import { conductionSpeed, effectiveDiameter, internodeMm, presets as condPresets, travelTime } from '../../src/sims/models/c2-2-conduction';
import { AP_PEAK, EPSP_MV, IPSP_MV, peakOf, simulate, summed, inputs } from '../../src/sims/models/c2-2-summation';
import { correlation } from '../../src/sims/models/c2-2-correlation';

describe('C2.2 action potential trace', () => {
  it('rests at −70 mV, reaches threshold at −50 mV, peaks at +35 mV and undershoots to −80 mV', () => {
    expect(membranePotential(0)).toBe(REST);
    expect(REST).toBe(-70);
    expect(membranePotential(T_THRESHOLD)).toBeCloseTo(THRESHOLD, 5);
    expect(membranePotential(T_PEAK)).toBeCloseTo(PEAK, 5);
    expect(PEAK).toBeGreaterThanOrEqual(30);
    expect(PEAK).toBeLessThanOrEqual(40);
    const min = Math.min(...Array.from({ length: 600 }, (_, i) => membranePotential(i / 100)));
    expect(min).toBeCloseTo(UNDERSHOOT, 1);
    expect(membranePotential(6)).toBeCloseTo(REST, 0);
  });
  it('rises only while Na⁺ channels are open and falls while K⁺ channels are open', () => {
    expect(naChannel(1.2)).toBe('closed'); // below threshold
    expect(naChannel(1.8)).toBe('open');
    expect(membranePotential(1.9)).toBeGreaterThan(membranePotential(1.7));
    expect(naChannel(2.6)).toBe('inactivated');
    expect(kChannelOpen(2.6)).toBe(true);
    expect(membranePotential(2.8)).toBeLessThan(membranePotential(2.4));
    expect(kChannelOpen(1.0)).toBe(false);
    expect(kChannelOpen(5)).toBe(false);
  });
  it('step windows run in order and cover the whole trace', () => {
    expect(STEP_WINDOWS[0]![0]).toBe(0);
    for (let i = 1; i < STEP_WINDOWS.length; i++) expect(STEP_WINDOWS[i]![0]).toBe(STEP_WINDOWS[i - 1]![1]);
    expect(STEP_WINDOWS.at(-1)![1]).toBe(6);
  });
  it('converts a count of impulses in a time window into impulses per second', () => {
    expect(impulseFrequency(5, 50)).toBeCloseTo(100);
    expect(impulseFrequency(1, 25)).toBeCloseTo(40);
  });
});

describe('C2.2 conduction speed', () => {
  const by = (id: string) => condPresets.find((p) => p.id === id)!.axon;
  it('gives realistic orders of magnitude for the named examples', () => {
    expect(conductionSpeed(by('thin'))).toBeGreaterThan(0.5);
    expect(conductionSpeed(by('thin'))).toBeLessThan(2);
    expect(conductionSpeed(by('squid'))).toBeGreaterThan(20);
    expect(conductionSpeed(by('squid'))).toBeLessThan(30);
    expect(conductionSpeed(by('myelin-large'))).toBeGreaterThan(80);
    expect(conductionSpeed(by('myelin-large'))).toBeLessThanOrEqual(120);
  });
  it('speed rises with diameter for both myelinated and unmyelinated axons', () => {
    for (const myelinated of [true, false]) {
      expect(conductionSpeed({ myelinated, diameterUm: 10 })).toBeGreaterThan(conductionSpeed({ myelinated, diameterUm: 2 }));
    }
  });
  it('myelin makes an axon of the same diameter much faster', () => {
    for (const d of [1, 5, 15]) expect(conductionSpeed({ myelinated: true, diameterUm: d })).toBeGreaterThan(5 * conductionSpeed({ myelinated: false, diameterUm: d }));
  });
  it('a 16 µm myelinated fibre beats the 0.5 mm squid giant axon', () => {
    expect(conductionSpeed(by('myelin-large'))).toBeGreaterThan(3 * conductionSpeed(by('squid')));
    expect(travelTime(by('myelin-large'))).toBeLessThan(travelTime(by('squid')));
  });
  it('limits myelinated fibres to about 1–20 µm and puts nodes about 1 mm apart', () => {
    expect(effectiveDiameter({ myelinated: true, diameterUm: 500 })).toBe(20);
    expect(effectiveDiameter({ myelinated: true, diameterUm: 0.2 })).toBe(1);
    expect(effectiveDiameter({ myelinated: false, diameterUm: 500 })).toBe(500);
    expect(internodeMm({ myelinated: true, diameterUm: 10 })).toBeCloseTo(1);
  });
});

describe('C2.2 summation', () => {
  const none = { train: 0, interval: 5, together: 0, inhibitory: 0 };
  it('stays at the resting potential with no inputs', () => {
    const r = simulate(none);
    expect(r.fired).toBe(false);
    for (const [, v] of r.points) expect(v).toBeCloseTo(-70);
  });
  it('one EPSP depolarises but stays below threshold', () => {
    const r = simulate({ ...none, train: 1 });
    expect(r.fired).toBe(false);
    expect(r.peakSub).toBeCloseTo(-70 + EPSP_MV, 1);
    expect(r.peakSub).toBeLessThan(-50);
  });
  it('spatial summation: three neurons firing together reach threshold', () => {
    expect(simulate({ ...none, train: 1, together: 1 }).fired).toBe(false);
    expect(simulate({ ...none, train: 1, together: 2 }).fired).toBe(true);
  });
  it('temporal summation: rapid impulses from one neuron fire it, widely spaced ones do not', () => {
    expect(simulate({ ...none, train: 3, interval: 2 }).fired).toBe(true);
    expect(simulate({ ...none, train: 3, interval: 15 }).fired).toBe(false);
  });
  it('an IPSP hyperpolarises the membrane below the resting potential', () => {
    const r = simulate({ ...none, inhibitory: 1 });
    expect(r.fired).toBe(false);
    expect(r.min).toBeCloseTo(-70 + IPSP_MV, 1);
    expect(r.min).toBeLessThan(-70);
  });
  it('inhibitory inputs can cancel excitatory ones and prevent firing', () => {
    expect(simulate({ ...none, train: 1, together: 2 }).fired).toBe(true);
    expect(simulate({ ...none, train: 1, together: 2, inhibitory: 2 }).fired).toBe(false);
  });
  it('is all or nothing: the action potential has the same peak however strong the input', () => {
    const three = simulate({ ...none, train: 1, together: 2 });
    const four = simulate({ ...none, train: 1, together: 3 });
    expect(peakOf(three)).toBeCloseTo(AP_PEAK, 0);
    expect(peakOf(four)).toBeCloseTo(AP_PEAK, 0);
    expect(four.tFire!).toBeLessThan(three.tFire!);
  });
  it('PSPs sum linearly before threshold', () => {
    const ins = inputs({ ...none, train: 1, together: 1, inhibitory: 1 });
    expect(summed(14, ins) - -70).toBeCloseTo(2 * EPSP_MV + IPSP_MV, 5);
  });
});

describe('C2.2 correlation figure data', () => {
  it('computes r and R² correctly for a strong positive correlation', () => {
    const c = correlation([[1, 2], [2, 4], [3, 6]]);
    expect(c.r).toBeCloseTo(1);
    expect(c.r2).toBeCloseTo(1);
    const neg = correlation([[1, 3], [2, 2], [3, 1]]);
    expect(neg.r).toBeCloseTo(-1);
  });
});
