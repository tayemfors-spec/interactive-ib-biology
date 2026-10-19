import { describe, expect, it } from 'vitest';
import { cube, cubeTable, divide, fmt, measure, plateOfVolume, ratioAt, sphereOfVolume } from '../../src/sims/models/b2-3-sav';

describe('B2.3 surface area-to-volume model', () => {
  it('a cube of side L has SA = 6L², V = L³ and SA:V = 6/L', () => {
    expect(cube(1)).toEqual({ sa: 6, v: 1, ratio: 6 });
    const c3 = cube(3);
    expect(c3.sa).toBe(54);
    expect(c3.v).toBe(27);
    expect(c3.ratio).toBeCloseTo(2);
    expect(cube(10).ratio).toBeCloseTo(0.6);
    expect(cube(10).ratio).toBeCloseTo(cube(10).sa / cube(10).v);
  });

  it('volume grows faster than surface area: doubling L multiplies SA by 4 but V by 8', () => {
    const a = cube(2), b = cube(4);
    expect(b.sa / a.sa).toBeCloseTo(4);
    expect(b.v / a.v).toBeCloseTo(8);
    expect(b.ratio / a.ratio).toBeCloseTo(0.5);
  });

  it('SA:V falls steadily as the cell gets bigger, and drops below 1 µm⁻¹ once L exceeds 6 µm', () => {
    const rows = cubeTable([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (let i = 1; i < rows.length; i++) expect(rows[i]!.ratio).toBeLessThan(rows[i - 1]!.ratio);
    expect(cube(6).ratio).toBeCloseTo(1);
    expect(cube(5.5).ratio).toBeGreaterThan(1);
    expect(cube(6.5).ratio).toBeLessThan(1);
  });

  it('at equal volume a sphere has the smallest SA:V and flattening raises it', () => {
    for (const L of [1, 2.5, 7, 10]) {
      const s = measure('sphere', L), c = measure('cube', L), f = measure('flat', L);
      expect(s.v).toBeCloseTo(c.v);
      expect(f.v).toBeCloseTo(c.v);
      expect(s.ratio).toBeLessThan(c.ratio);
      expect(f.ratio).toBeGreaterThan(c.ratio);
    }
    // a sphere of volume 1 has SA ≈ 4.84
    expect(sphereOfVolume(1).sa).toBeCloseTo(4.836, 2);
  });

  it('a plate one unit wide per unit thick is just a cube', () => {
    const p = plateOfVolume(27, 1);
    expect(p.h).toBeCloseTo(3);
    expect(p.sa).toBeCloseTo(54);
    // an 8:1 plate of the same volume as a unit cube has SA:V = 10
    expect(plateOfVolume(1, 8).ratio).toBeCloseTo(10);
    expect(ratioAt('flat', 5)).toBeCloseTo(2);
  });

  it('dividing into 8 cells keeps the total volume but doubles total SA and SA:V', () => {
    for (const shape of ['cube', 'sphere', 'flat'] as const) {
      const whole = measure(shape, 8), parts = divide(shape, 8);
      expect(parts.v).toBeCloseTo(whole.v);
      expect(parts.sa).toBeCloseTo(2 * whole.sa);
      expect(parts.ratio).toBeCloseTo(2 * whole.ratio);
    }
    expect(divide('cube', 4).each.sa).toBeCloseTo(24); // eight 2 × 2 × 2 cubes
  });

  it('formats numbers to three significant figures', () => {
    expect(fmt(0.6000000001)).toBe('0.6');
    expect(fmt(4.8359)).toBe('4.84');
    expect(fmt(1000)).toBe('1,000');
  });
});
