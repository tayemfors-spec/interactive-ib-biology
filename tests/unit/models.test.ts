import { describe, expect, it } from 'vitest';
import { activeRate, facilitatedRate, simpleRate } from '../../src/sims/models/transport';
import { classify, fluidity, meltingPoint } from '../../src/sims/models/fluidity';
import { particles } from '../../src/sims/models/permeability';

describe('transport model', () => {
  it('simple diffusion is proportional to the concentration difference and reverses with it', () => {
    expect(simpleRate(0)).toBe(0);
    expect(simpleRate(8)).toBeCloseTo(2 * simpleRate(4));
    expect(simpleRate(-3)).toBeLessThan(0);
  });
  it('facilitated diffusion is passive (zero at no gradient) and saturates', () => {
    expect(facilitatedRate(0, 5)).toBe(0);
    const gainLow = facilitatedRate(2, 5) - facilitatedRate(0, 5);
    const gainHigh = facilitatedRate(10, 5) - facilitatedRate(8, 5);
    expect(gainHigh).toBeLessThan(gainLow / 3);
    expect(facilitatedRate(10, 0)).toBe(0);
    expect(facilitatedRate(10, 8)).toBeGreaterThan(facilitatedRate(10, 4));
  });
  it('active transport works against a gradient and stops without ATP or pumps', () => {
    expect(activeRate(-4, 4, 1)).toBeGreaterThan(0);
    expect(activeRate(5, 4, 0)).toBe(0);
    expect(activeRate(5, 0, 1)).toBe(0);
    expect(activeRate(5, 4, 1)).toBeGreaterThan(activeRate(5, 4, 0.3));
  });
});

describe('fluidity model', () => {
  it('unsaturated fatty acids lower the melting point', () => {
    expect(meltingPoint(80)).toBeLessThan(meltingPoint(10));
  });
  it('fluidity rises with temperature and with unsaturation', () => {
    expect(fluidity({ temp: 30, unsat: 40, chol: 0 })).toBeGreaterThan(fluidity({ temp: 5, unsat: 40, chol: 0 }));
    expect(fluidity({ temp: 10, unsat: 80, chol: 0 })).toBeGreaterThan(fluidity({ temp: 10, unsat: 10, chol: 0 }));
  });
  it('cholesterol reduces fluidity when warm and increases it when cold (buffer)', () => {
    const warm = { temp: 40, unsat: 40 };
    const cold = { temp: 0, unsat: 10 };
    expect(fluidity({ ...warm, chol: 30 })).toBeLessThan(fluidity({ ...warm, chol: 0 }));
    expect(fluidity({ ...cold, chol: 30 })).toBeGreaterThan(fluidity({ ...cold, chol: 0 }));
  });
  it('classifies the extremes', () => {
    expect(classify(fluidity({ temp: 0, unsat: 0, chol: 0 }))).toBe('rigid');
    expect(classify(fluidity({ temp: 45, unsat: 100, chol: 0 }))).toBe('leaky');
    expect(classify(fluidity({ temp: 37, unsat: 40, chol: 30 }))).toBe('fluid');
  });
});

describe('permeability data', () => {
  it('only small non-polar (or lipid) particles cross the bilayer freely', () => {
    for (const p of particles) {
      if (p.polarity === 'charged') expect(p.crossesBilayer).toBe(false);
      if (p.route === 'bilayer') expect(p.polarity).toBe('non-polar');
    }
    expect(particles.find((p) => p.id === 'water')!.route).toBe('bilayer-slow');
    expect(particles.find((p) => p.id === 'protein')!.route).toBe('vesicle');
  });
});
