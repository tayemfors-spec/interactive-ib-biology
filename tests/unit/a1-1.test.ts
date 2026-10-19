import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  AIR, METHANE, SEAWATER_DENSITY, WATER, WATER_SUB, buoyancy, conductiveFlux, heatReleasedPerLitre, liquidRange, ratio, sig,
  stateAt, supportedFraction, volumetricRatio,
} from '../../src/sims/models/a1-1-properties';
import type { SceneContext, SceneModule } from '../../src/viewer3d/types';
import molecule from '../../src/scenes/a1-1-molecule';
import liquid from '../../src/scenes/a1-1-liquid';
import ice from '../../src/scenes/a1-1-ice';

describe('A1.1 water versus air', () => {
  it('water is far denser, more viscous and more conductive than air (≈830×, ≈55×, ≈23×)', () => {
    expect(ratio('density')).toBeGreaterThan(800);
    expect(ratio('density')).toBeLessThan(860);
    expect(ratio('viscosity')).toBeGreaterThan(50);
    expect(ratio('viscosity')).toBeLessThan(60);
    expect(ratio('conductivity')).toBeGreaterThan(20);
    expect(ratio('conductivity')).toBeLessThan(26);
  });
  it('specific heat capacity: about 4× per gram but about 3,500× per unit volume', () => {
    expect(ratio('specificHeat')).toBeCloseTo(4.16, 1);
    expect(volumetricRatio()).toBeGreaterThan(3300);
    expect(volumetricRatio()).toBeLessThan(3600);
    // one litre of water cooling by 1 °C releases about 4.2 kJ; a litre of air about 1.2 J
    expect(heatReleasedPerLitre(WATER, 1)).toBeCloseTo(4172, -1);
    expect(heatReleasedPerLitre(AIR, 1)).toBeCloseTo(1.21, 1);
    expect(heatReleasedPerLitre(WATER, 10)).toBeCloseTo(10 * heatReleasedPerLitre(WATER, 1));
  });
  it('heat is conducted away faster through water than air, in proportion to ΔT', () => {
    expect(conductiveFlux(WATER, 20) / conductiveFlux(AIR, 20)).toBeCloseTo(ratio('conductivity'));
    expect(conductiveFlux(WATER, 0)).toBe(0);
    expect(conductiveFlux(WATER, 30)).toBeCloseTo(1.5 * conductiveFlux(WATER, 20));
  });
  it('seawater supports almost all the weight of an animal of similar density; air supports almost none', () => {
    expect(supportedFraction(1030, SEAWATER_DENSITY)).toBeGreaterThan(0.99);
    expect(supportedFraction(1030, AIR.density)).toBeLessThan(0.002);
    expect(supportedFraction(950, SEAWATER_DENSITY)).toBe(1);
    expect(buoyancy(950, SEAWATER_DENSITY)).toBe('floats');
    expect(buoyancy(1080, SEAWATER_DENSITY)).toBe('sinks');
    expect(buoyancy(1025, SEAWATER_DENSITY)).toBe('neutral');
    expect(buoyancy(1000, AIR.density)).toBe('sinks');
  });
});

describe('A1.1 water versus methane', () => {
  it('hydrogen bonding makes water liquid at room temperature; methane is a gas', () => {
    expect(stateAt(WATER_SUB, 20)).toBe('liquid');
    expect(stateAt(METHANE, 20)).toBe('gas');
    expect(stateAt(METHANE, -170)).toBe('liquid');
    expect(stateAt(METHANE, -190)).toBe('solid');
    expect(stateAt(WATER_SUB, -5)).toBe('solid');
    expect(stateAt(WATER_SUB, 100)).toBe('gas');
  });
  it('water has higher melting and boiling points, a wider liquid range and a larger latent heat', () => {
    expect(WATER_SUB.boilingPoint - METHANE.boilingPoint).toBeCloseTo(261.5);
    expect(liquidRange(WATER_SUB)).toBe(100);
    expect(liquidRange(METHANE)).toBeCloseTo(21);
    expect(WATER_SUB.latentHeatVap / METHANE.latentHeatVap).toBeGreaterThan(4);
    expect(WATER_SUB.specificHeatLiquid).toBeGreaterThan(METHANE.specificHeatLiquid);
    // similar small molecules: the difference is not explained by size
    expect(Math.abs(WATER_SUB.molarMass - METHANE.molarMass)).toBeLessThan(3);
  });
  it('formats numbers to three significant figures', () => {
    expect(sig(3448)).toBe('3,450');
    expect(sig(55.25)).toBe('55.3');
    expect(sig(0.001234)).toBe('0.00123');
  });
});

// ---------- the 3D models must have the right chemistry ----------
const ctx = (): SceneContext => ({
  THREE, scene: new THREE.Scene(), material: (_k, o) => new THREE.MeshStandardMaterial(o), track: (r) => r, reducedMotion: false,
});
const positions = (m: THREE.InstancedMesh) => Array.from({ length: m.count }, (_, i) => {
  const x = new THREE.Matrix4();
  m.getMatrixAt(i, x);
  return new THREE.Vector3().setFromMatrixPosition(x);
});
/** All O and H atom centres in a scene (instanced or single meshes), told apart by sphere radius. */
async function atoms(mod: SceneModule) {
  const c = ctx();
  await mod.build(c);
  c.scene.updateMatrixWorld(true);
  const O: THREE.Vector3[] = [], H: THREE.Vector3[] = [];
  c.scene.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || !(o.geometry instanceof THREE.SphereGeometry)) return;
    const r = o.geometry.parameters.radius;
    const list = r === 0.36 ? O : r === 0.22 ? H : null;
    if (!list) return;
    if (o instanceof THREE.InstancedMesh) list.push(...positions(o));
    else list.push(o.getWorldPosition(new THREE.Vector3()));
  });
  return { O, H };
}

describe('A1.1 3D water models', () => {
  it('single molecule: one O, two H and an H–O–H angle of 104.5°', async () => {
    const { O, H } = await atoms(molecule);
    expect(O).toHaveLength(1);
    expect(H).toHaveLength(2);
    const a = H[0]!.clone().sub(O[0]!), b = H[1]!.clone().sub(O[0]!);
    expect(THREE.MathUtils.radToDeg(a.angleTo(b))).toBeCloseTo(104.5, 1);
  });
  for (const [name, mod] of [['liquid', liquid], ['ice', ice]] as const) {
    it(`${name}: every molecule has exactly two covalently bonded H atoms (0.96 Å), and no H is shared`, async () => {
      const { O, H } = await atoms(mod);
      expect(O.length).toBeGreaterThan(30);
      expect(H).toHaveLength(2 * O.length);
      const count = O.map(() => 0);
      for (const h of H) {
        const near = O.map((o, i) => [o.distanceTo(h), i] as const).sort((p, q) => p[0] - q[0]);
        expect(near[0]![0]).toBeCloseTo(0.96, 2);
        expect(near[1]![0]).toBeGreaterThan(1.4); // any other O is only hydrogen-bonded, much further away
        count[near[0]![1]]!++;
      }
      expect(count.every((n) => n === 2)).toBe(true);
    });
  }
  it('liquid: bonded H–O–H angles are 104.5°', async () => {
    const { O, H } = await atoms(liquid);
    for (const o of O) {
      const hs = H.filter((h) => h.distanceTo(o) < 1.1).map((h) => h.clone().sub(o));
      expect(THREE.MathUtils.radToDeg(hs[0]!.angleTo(hs[1]!))).toBeCloseTo(104.5, 0);
    }
  });
  it('ice: interior molecules have four O neighbours at ≈2.76 Å, arranged tetrahedrally', async () => {
    const { O } = await atoms(ice);
    const nbrs = O.map((o) => O.filter((p) => p !== o && p.distanceTo(o) < 3));
    expect(Math.max(...nbrs.map((n) => n.length))).toBe(4);
    const full = nbrs.findIndex((n) => n.length === 4);
    for (const p of nbrs[full]!) expect(p.distanceTo(O[full]!)).toBeCloseTo(2.76, 1);
    const v = nbrs[full]!.map((p) => p.clone().sub(O[full]!));
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) expect(Math.abs(THREE.MathUtils.radToDeg(v[i]!.angleTo(v[j]!)) - 109.5)).toBeLessThan(1);
  });
  it('ice: on every O···O link there is exactly one H (ice rules), so interior molecules donate 2 and accept 2', async () => {
    const { O, H } = await atoms(ice);
    for (let i = 0; i < O.length; i++) for (let j = i + 1; j < O.length; j++) {
      if (O[i]!.distanceTo(O[j]!) > 3) continue;
      const onLink = H.filter((h) => h.distanceTo(O[i]!) + h.distanceTo(O[j]!) < O[i]!.distanceTo(O[j]!) + 0.01);
      expect(onLink).toHaveLength(1);
    }
  });
  it('the liquid model is denser than the ice model (ice floats)', async () => {
    const perVol = (pts: THREE.Vector3[], r: number) => pts.filter((p) => p.length() < r).length / ((4 / 3) * Math.PI * r ** 3);
    const l = (await atoms(liquid)).O;
    const s = (await atoms(ice)).O;
    expect(perVol(l, 5.5)).toBeGreaterThan(perVol(s, 5.5));
  });
});
