import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { H, K_FAT, KJ_PER_G, formatMass, heatLoss, relativeLoss, storageMass } from '../../src/sims/models/b1-1-energy';
import { zigzag } from '../../src/scenes/b1-1-kit';

describe('B1.1 fat versus glycogen as an energy store', () => {
  it('uses the standard energy values (≈ 37 vs ≈ 17 kJ per gram)', () => {
    expect(KJ_PER_G.fat).toBeGreaterThanOrEqual(37);
    expect(KJ_PER_G.fat).toBeLessThanOrEqual(39);
    expect(KJ_PER_G.glycogen).toBeCloseTo(17, 0);
  });
  it('dry glycogen needs about 2.2× the mass of fat for the same energy', () => {
    const m = storageMass(10000, 0);
    expect(m.glycogenDry / m.fat).toBeCloseTo(37 / 17, 5);
    expect(m.ratio).toBeCloseTo(2.18, 2);
  });
  it('with ≈ 3 g of water per gram, a glycogen store is about 8.7× heavier than fat', () => {
    const m = storageMass(10000, 3);
    expect(m.fat).toBeCloseTo(270.3, 1);
    expect(m.glycogenDry).toBeCloseTo(588.2, 1);
    expect(m.glycogenWet).toBeCloseTo(2352.9, 1);
    expect(m.ratio).toBeGreaterThan(8.5);
    expect(m.ratio).toBeLessThan(8.9);
  });
  it('masses scale in proportion to the energy stored, and more bound water means a heavier store', () => {
    expect(storageMass(2000).fat * 5).toBeCloseTo(storageMass(10000).fat, 6);
    expect(storageMass(5000, 4).glycogenWet).toBeGreaterThan(storageMass(5000, 2).glycogenWet);
    // the fat store is always the lightest
    for (const w of [0, 1, 2, 3, 4]) expect(storageMass(5000, w).fat).toBeLessThan(storageMass(5000, w).glycogenDry);
  });
  it('formats masses with SI prefixes', () => {
    expect(formatMass(54.06)).toBe('54.1 g');
    expect(formatMass(588.2)).toBe('588 g');
    expect(formatMass(2352.9)).toBe('2.35 kg');
  });
});

describe('B1.1 fat as a heat insulator (qualitative model)', () => {
  it('adipose tissue conducts heat poorly (≈ 0.2 W m⁻¹ K⁻¹)', () => {
    expect(K_FAT).toBeGreaterThan(0.15);
    expect(K_FAT).toBeLessThan(0.3);
  });
  it('a thicker fat layer always reduces heat loss', () => {
    let prev = Infinity;
    for (let d = 0; d <= 8; d += 0.5) {
      const q = heatLoss(d, 0, 'water');
      expect(q).toBeLessThan(prev);
      prev = q;
    }
    expect(relativeLoss(0, 0, 'water')).toBeCloseTo(100, 6);
    expect(relativeLoss(6, 0, 'water')).toBeLessThan(25);
  });
  it('heat is lost faster in cold water than in air at the same temperature', () => {
    expect(H.water).toBeGreaterThan(H.air);
    expect(heatLoss(1, 0, 'water')).toBeGreaterThan(heatLoss(1, 0, 'air'));
    // and insulation matters more (a bigger proportional saving) in water
    expect(relativeLoss(5, 0, 'water')).toBeLessThan(relativeLoss(5, 0, 'air'));
  });
  it('no heat is lost when the surroundings are at body temperature, and loss rises as they get colder', () => {
    expect(heatLoss(2, 37, 'air')).toBe(0);
    expect(heatLoss(2, 0, 'air')).toBeGreaterThan(heatLoss(2, 20, 'air'));
  });
});

describe('B1.1 fatty acid chain geometry', () => {
  const X = new THREE.Vector3(1, 0, 0);
  const Y = new THREE.Vector3(0, 1, 0);
  const direction = (pts: THREE.Vector3[], a: number, b: number) => pts[b]!.clone().sub(pts[a]!).normalize();
  it('a saturated chain is straight: the overall direction stays along the axis', () => {
    const pts = zigzag(new THREE.Vector3(), X, Y, 18);
    expect(pts).toHaveLength(18);
    expect(direction(pts, 0, 16).angleTo(X)).toBeLessThan(0.05);
  });
  it('a trans double bond keeps the chain straight', () => {
    const pts = zigzag(new THREE.Vector3(), X, Y, 18, { 9: 'trans' });
    expect(direction(pts, 0, 16).angleTo(X)).toBeLessThan(0.05);
  });
  it('a cis double bond bends the chain by about 60° beyond the double bond', () => {
    const pts = zigzag(new THREE.Vector3(), X, Y, 18, { 9: 'cis' });
    const before = direction(pts, 0, 8);
    const after = direction(pts, 10, 16);
    expect(THREE.MathUtils.radToDeg(before.angleTo(after))).toBeGreaterThan(50);
    expect(THREE.MathUtils.radToDeg(before.angleTo(after))).toBeLessThan(70);
    // the C=C bond is shorter than C–C
    expect(pts[8]!.distanceTo(pts[9]!)).toBeLessThan(pts[7]!.distanceTo(pts[8]!));
  });
});
