import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { SARC, SARC_DURATIONS, bandsAt, lengthAt } from '../../src/scenes/b3-3-kit';
import sarcomere from '../../src/scenes/b3-3-sarcomere';
import { LOWERED, RAISED, REST, arm, fibreLengths } from '../../src/anims/b3-3-antagonistic';
import type { SceneContext } from '../../src/viewer3d/types';

const ctx = (): SceneContext => ({
  THREE,
  scene: new THREE.Scene(),
  material: (_key, opts) => new THREE.MeshStandardMaterial(opts),
  track: (r) => r,
  reducedMotion: false,
});

const samples = (index: number) => Array.from({ length: 11 }, (_, i) => lengthAt(index, i / 10));

describe('B3.3 sliding filament geometry', () => {
  it('the A-band equals the myosin length at every sarcomere length', () => {
    for (const L of [SARC.contracted, 2.2, SARC.relaxed, SARC.stretched]) expect(bandsAt(L).A).toBeCloseTo(SARC.myosin);
  });

  it('I-band = L − A-band and H-zone = L − 2 × actin length', () => {
    for (const L of [SARC.contracted, 2.2, SARC.relaxed, SARC.stretched]) {
      const b = bandsAt(L);
      expect(b.I + b.A).toBeCloseTo(L);
      expect(b.H).toBeCloseTo(L - 2 * SARC.actin);
      // the overlap plus the H-zone and the overlap again fill the A-band
      expect(2 * b.overlap + b.H).toBeCloseTo(b.A);
    }
  });

  it('actin and myosin still overlap at every length used, so cross-bridges can always form', () => {
    for (let i = 0; i < SARC_DURATIONS.length; i++) for (const L of samples(i)) expect(bandsAt(L).overlap).toBeGreaterThan(0.2);
  });

  it('during contraction (step 3) the sarcomere, I-band and H-zone shorten while the A-band stays constant', () => {
    const Ls = samples(2);
    expect(Ls[0]).toBeCloseTo(SARC.relaxed);
    expect(Ls[10]).toBeCloseTo(SARC.contracted);
    for (let i = 1; i < Ls.length; i++) {
      const prev = bandsAt(Ls[i - 1]!), cur = bandsAt(Ls[i]!);
      expect(cur.L).toBeLessThanOrEqual(prev.L);
      expect(cur.I).toBeLessThanOrEqual(prev.I);
      expect(cur.H).toBeLessThanOrEqual(prev.H);
      expect(cur.A).toBeCloseTo(prev.A);
    }
    expect(bandsAt(SARC.contracted).H).toBeGreaterThan(0); // the H-zone narrows but has not vanished
  });

  it('stretching (step 5) lengthens the I-band and H-zone but not the A-band', () => {
    const Ls = samples(4);
    expect(Ls[0]).toBeCloseTo(SARC.contracted);
    expect(Ls[10]).toBeCloseTo(SARC.stretched);
    expect(bandsAt(Ls[10]!).I).toBeGreaterThan(bandsAt(Ls[0]!).I);
    expect(bandsAt(Ls[10]!).H).toBeGreaterThan(bandsAt(Ls[0]!).H);
    expect(bandsAt(Ls[10]!).A).toBeCloseTo(bandsAt(Ls[0]!).A);
  });

  it('the 3D scene draws exactly these bands: Z-lines, actin and myosin positions match bandsAt()', async () => {
    const c = ctx();
    const built = await sarcomere.build(c);
    const obj = (n: string) => c.scene.getObjectByName(n)!;
    const myo = obj('myosin') as THREE.InstancedMesh;
    myo.geometry.computeBoundingBox();
    const myoLen = myo.geometry.boundingBox!.max.x - myo.geometry.boundingBox!.min.x;
    const S = SARC.scale;
    const measure = () => {
      const zl = obj('z-left').position.x, zr = obj('z-right').position.x;
      // actin groups sit on the Z-lines; the filaments are SARC.actin long, pointing inwards
      const tipL = obj('actin-left').position.x + SARC.actin * S;
      const tipR = obj('actin-right').position.x - SARC.actin * S;
      return { L: (zr - zl) / S, A: myoLen / S, I: (zr - zl - myoLen) / S, H: Math.max(0, tipR - tipL) / S, zl, zr };
    };
    let prev: ReturnType<typeof measure> | null = null;
    for (const [index, t] of [[0, 0], [1, 1], [2, 0], [2, 0.25], [2, 0.5], [2, 0.75], [2, 1], [3, 1]] as const) {
      built.render!(index, t);
      const m = measure();
      const want = bandsAt(lengthAt(index, t));
      expect(m.zl).toBeCloseTo(-m.zr); // symmetric about the M-line
      expect(m.L).toBeCloseTo(want.L);
      expect(m.A).toBeCloseTo(SARC.myosin, 2);
      expect(m.I).toBeCloseTo(want.I, 2);
      expect(m.H).toBeCloseTo(want.H, 2);
      if (prev) {
        expect(m.A).toBeCloseTo(prev.A, 5);
        expect(m.I).toBeLessThanOrEqual(prev.I + 1e-9);
        expect(m.H).toBeLessThanOrEqual(prev.H + 1e-9);
      }
      prev = m;
    }
    // relaxed → contracted: the I-band and H-zone really are shorter in the drawn scene
    built.render!(0, 1);
    const relaxed = measure();
    built.render!(3, 1);
    const contracted = measure();
    expect(contracted.I).toBeLessThan(relaxed.I - 0.3);
    expect(contracted.H).toBeLessThan(relaxed.H - 0.3);
    expect(contracted.A).toBeCloseTo(relaxed.A, 5);
  });

  it('the scene has one duration per step', async () => {
    const built = await sarcomere.build(ctx());
    expect(built.durations).toEqual(SARC_DURATIONS);
    expect(built.durations).toHaveLength(5);
  });
});

describe('B3.3 antagonistic muscle geometry (animation)', () => {
  it('flexing the elbow shortens the biceps and lengthens the triceps', () => {
    let prev = arm(0);
    for (let phi = 10; phi <= 145; phi += 10) {
      const cur = arm(phi);
      expect(cur.biceps.len).toBeLessThan(prev.biceps.len);
      expect(cur.triceps.len).toBeGreaterThan(prev.triceps.len);
      prev = cur;
    }
  });

  it('raising the ribs shortens external intercostal fibres; lowering them shortens internal fibres', () => {
    const rest = fibreLengths(REST), up = fibreLengths(RAISED), down = fibreLengths(LOWERED);
    expect(up.external).toBeLessThan(rest.external);
    expect(up.internal).toBeGreaterThan(rest.internal); // the relaxed layer is stretched
    expect(down.internal).toBeLessThan(rest.internal);
    expect(down.external).toBeGreaterThan(rest.external);
  });
});
