import * as THREE from 'three';
import type { PaletteKey, SceneContext, SceneModule } from '../viewer3d/types';
import { anchorAt, setInstance } from '../viewer3d/kit';

/*
 * A1.2 B-DNA double helix, 20 base pairs (two full turns).
 * Built in "helix coordinates" (axis = local +y, 1 unit = one base-pair rise ≈ 0.34 nm), then the whole
 * helix is turned so its axis runs left → right across the stage. The helix is RIGHT-HANDED:
 * nucleotide i sits at angle θ = i·36° (10 bp per turn) and the point (r·sinθ, y, r·cosθ) traces a
 * right-handed screw about +y. Phosphates are on the outside (r ≈ 2.9 units ≈ 1 nm), bases inside.
 * Strand 1 runs 5′→3′ towards +y (left → right on screen); strand 2 runs 5′→3′ towards −y, so the
 * strands are antiparallel. The two glycosidic bonds of a pair are 140° apart around the axis, which
 * gives a narrow minor groove (the 140° side) and a wide major groove.
 * Purines (A, G) are drawn as a fused pentagon + hexagon, pyrimidines (T, C) as a single hexagon,
 * and every pair is purine + pyrimidine so all rungs are the same length. A–T pairs have 2 hydrogen
 * bonds and G–C pairs have 3 (drawn as dashed sticks).
 */

export type Base = 'A' | 'T' | 'G' | 'C' | 'U';
export const BASE_KEY: Record<Base, PaletteKey> = { A: 'protein', T: 'head', G: 'carb', C: 'protein2', U: 'glucose' };
export const PURINE: Record<Base, boolean> = { A: true, G: true, T: false, C: false, U: false };
const PAIR: Record<string, Base> = { A: 'T', T: 'A', G: 'C', C: 'G' };

export const RISE = 1;
export const R_P = 2.9; // phosphate radius
export const R_S = 2.25; // sugar radius
const MINOR = (140 * Math.PI) / 180; // angular separation of the paired sugars (minor-groove side)
const TWIST = (36 * Math.PI) / 180;
const HEX_R = 0.55; // hexagon circumradius (side = 0.55)
const PENT_R = 0.47; // pentagon circumradius (side ≈ 0.55, so the rings share an edge)
const THICK = 0.2; // base slab thickness
const SUGAR_R = 0.42;

/** Strand 1, 5′ → 3′ (left → right). Strand 2 is its complement, read 5′ → 3′ right → left. */
export const SEQ: Base[] = 'ATGCTACTAGGATCCATTGC'.split('') as Base[];

export const pos = (r: number, ang: number, y: number) => new THREE.Vector3(r * Math.sin(ang), y, r * Math.cos(ang));
const yaw = (v: THREE.Vector3) => Math.atan2(v.x, v.z);
const Y = new THREE.Vector3(0, 1, 0);

/** Instanced meshes for nucleotides, created on demand per material key. */
export function nucleotideKit(ctx: SceneContext, root: THREE.Object3D, cap: number) {
  const hexGeo = ctx.track(new THREE.CylinderGeometry(HEX_R, HEX_R, THICK, 6));
  const pentGeo = ctx.track(new THREE.CylinderGeometry(PENT_R, PENT_R, THICK, 5));
  const sugarGeo = ctx.track(new THREE.CylinderGeometry(SUGAR_R, SUGAR_R, 0.26, 5));
  const phosGeo = ctx.track(new THREE.SphereGeometry(0.42, 16, 12));
  const stickGeo = ctx.track(new THREE.CylinderGeometry(0.1, 0.1, 1, 8));
  const hbGeo = ctx.track(new THREE.CylinderGeometry(0.075, 0.075, 1, 6));
  const ohGeo = ctx.track(new THREE.SphereGeometry(0.24, 12, 8));
  const make = (geo: THREE.BufferGeometry, key: PaletteKey, n: number, opts: THREE.MeshStandardMaterialParameters = {}) => {
    const m = new THREE.InstancedMesh(geo, ctx.material(key, { roughness: 0.5, ...opts }), n);
    m.count = 0;
    root.add(m);
    return m;
  };
  const meshes = {
    sugar: make(sugarGeo, 'neutral', cap),
    phos: make(phosGeo, 'text', cap, { roughness: 0.35 }),
    stick: make(stickGeo, 'neutral', cap * 4),
    oh: make(ohGeo, 'k', cap),
    hbAT: make(hbGeo, 'tail', cap * 4),
    hbGC: make(hbGeo, 'tail', cap * 6),
    hex: {} as Record<Base, THREE.InstancedMesh>,
    pent: {} as Record<Base, THREE.InstancedMesh>,
  };
  for (const b of ['A', 'T', 'G', 'C', 'U'] as Base[]) {
    meshes.hex[b] = make(hexGeo, BASE_KEY[b], cap);
    if (PURINE[b]) meshes.pent[b] = make(pentGeo, BASE_KEY[b], cap);
  }
  const q = new THREE.Quaternion();
  const mtx = new THREE.Matrix4();
  const sv = new THREE.Vector3();
  const push = (mesh: THREE.InstancedMesh, p: THREE.Vector3, rotY = 0) => {
    setInstance(mesh, mesh.count++, p, new THREE.Euler(0, rotY, 0));
  };
  /** A stick (cylinder) from a to b. */
  const stick = (mesh: THREE.InstancedMesh, a: THREE.Vector3, b: THREE.Vector3, radius = 1) => {
    const d = b.clone().sub(a);
    q.setFromUnitVectors(Y, d.clone().normalize());
    sv.set(radius, d.length(), radius);
    mtx.compose(a.clone().add(b).multiplyScalar(0.5), q, sv);
    mesh.setMatrixAt(mesh.count++, mtx);
  };
  /**
   * A base starting just inside the sugar at `from`, pointing along unit vector `dir` (horizontal).
   * Purines: pentagon (bonded to the sugar) then hexagon. Pyrimidines: one hexagon. Returns where the base ends.
   */
  const base = (b: Base, from: THREE.Vector3, dir: THREE.Vector3) => {
    const s0 = SUGAR_R + 0.06;
    const apHex = (Math.sqrt(3) / 2) * HEX_R;
    const dYaw = yaw(dir);
    let s = s0;
    // glycosidic bond (sugar C1′ → base N)
    stick(meshes.stick, from.clone().addScaledVector(dir, SUGAR_R * 0.8), from.clone().addScaledVector(dir, s0 + 0.08), 0.8);
    if (PURINE[b]) {
      // pentagon: a vertex towards the sugar, an edge towards the hexagon
      push(meshes.pent[b]!, from.clone().addScaledVector(dir, s + PENT_R), dYaw - Math.PI);
      s += PENT_R * (1 + Math.cos(Math.PI / 5));
    }
    // hexagon with flat edges facing along dir
    push(meshes.hex[b], from.clone().addScaledVector(dir, s + apHex), dYaw - Math.PI / 2);
    s += 2 * apHex;
    return s;
  };
  /** n dashed hydrogen bonds across the gap that starts `s` along dir from `from`. */
  const hbonds = (mesh: THREE.InstancedMesh, n: number, from: THREE.Vector3, dir: THREE.Vector3, s: number, gap: number) => {
    const w = new THREE.Vector3().crossVectors(Y, dir).normalize();
    const offs = n === 2 ? [-0.24, 0.24] : [-0.36, 0, 0.36];
    for (const o of offs) {
      const c = from.clone().addScaledVector(dir, s + gap / 2).addScaledVector(w, o);
      for (const k of [-1, 1]) {
        const a = c.clone().addScaledVector(dir, k * gap * 0.06);
        const e = c.clone().addScaledVector(dir, k * gap * 0.46);
        stick(mesh, a, e);
      }
    }
  };
  const finish = () => {
    const all: THREE.InstancedMesh[] = [meshes.sugar, meshes.phos, meshes.stick, meshes.oh, meshes.hbAT, meshes.hbGC, ...Object.values(meshes.hex), ...Object.values(meshes.pent)];
    for (const m of all) { m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); }
  };
  return { meshes, push, stick, base, hbonds, finish };
}

const scene: SceneModule = {
  camera: { position: [2.3, 3.5, 27], target: [1.8, 0.3, 0], fov: 38, minDistance: 6, maxDistance: 45 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    const helix = new THREE.Group();
    helix.rotation.z = -Math.PI / 2 + 0.55; // local +y (5′→3′ of strand 1) → right and slightly up (a diagonal fits the 4:3 stage)
    root.add(helix);
    const body = new THREE.Group(); // spins about the helix axis when "Animate movement" is on
    helix.add(body);

    const N = SEQ.length;
    const kit = nucleotideKit(ctx, body, N * 2 + 2);
    const { meshes, push, stick } = kit;
    const yOf = (i: number) => (i - (N - 1) / 2) * RISE;
    const th = (i: number) => i * TWIST;
    const half = TWIST / 2;

    const s1: THREE.Vector3[] = [];
    const s2: THREE.Vector3[] = [];
    const p1: THREE.Vector3[] = [];
    const p2: THREE.Vector3[] = [];
    for (let i = 0; i < N; i++) {
      s1.push(pos(R_S, th(i), yOf(i)));
      s2.push(pos(R_S, th(i) + MINOR, yOf(i)));
      // strand 1: phosphate on the 5′ side (below); strand 2 runs the other way, so its phosphate is above
      p1.push(pos(R_P, th(i) - half, yOf(i) - RISE / 2));
      p2.push(pos(R_P, th(i) + MINOR + half, yOf(i) + RISE / 2));
    }
    const gapCentre: THREE.Vector3[] = [];
    for (let i = 0; i < N; i++) {
      push(meshes.sugar, s1[i]!, th(i));
      push(meshes.sugar, s2[i]!, th(i) + MINOR);
      push(meshes.phos, p1[i]!);
      push(meshes.phos, p2[i]!);
      // sugar–phosphate covalent bonds: C5′–O–P of its own nucleotide, and P–O–C3′ of the previous one
      stick(meshes.stick, p1[i]!, s1[i]!);
      if (i > 0) stick(meshes.stick, p1[i]!, s1[i - 1]!);
      stick(meshes.stick, p2[i]!, s2[i]!);
      if (i < N - 1) stick(meshes.stick, p2[i]!, s2[i + 1]!);

      const b1 = SEQ[i]!;
      const b2 = PAIR[b1]!;
      const dir = s2[i]!.clone().sub(s1[i]!).normalize();
      const end1 = kit.base(b1, s1[i]!, dir);
      const end2 = kit.base(b2, s2[i]!, dir.clone().negate());
      const gap = s1[i]!.distanceTo(s2[i]!) - end1 - end2;
      gapCentre.push(s1[i]!.clone().addScaledVector(dir, end1 + gap / 2));
      const gc = b1 === 'G' || b1 === 'C';
      kit.hbonds(gc ? meshes.hbGC : meshes.hbAT, gc ? 3 : 2, s1[i]!, dir, end1, gap);
    }
    // free 3′-OH groups: top of strand 1 (right), bottom of strand 2 (left)
    const oh1 = pos(R_P - 0.35, th(N - 1) + half, yOf(N - 1) + RISE / 2);
    const oh2 = pos(R_P - 0.35, th(0) + MINOR - half, yOf(0) - RISE / 2);
    push(meshes.oh, oh1); push(meshes.oh, oh2);
    stick(meshes.stick, s1[N - 1]!, oh1);
    stick(meshes.stick, s2[0]!, oh2);
    kit.finish();

    // ---------- anchors ----------
    const out = (v: THREE.Vector3, k: number) => new THREE.Vector3(v.x * k, v.y, v.z * k);
    const at = (name: string, v: THREE.Vector3) => anchorAt(body, v.x, v.y, v.z, name);
    const baseCentre = (i: number, strand: 1 | 2, f: number) => {
      const a = strand === 1 ? s1[i]! : s2[i]!;
      const b = strand === 1 ? s2[i]! : s1[i]!;
      return a.clone().lerp(b, f);
    };
    // groove centres facing the camera (yaw 0): minor groove at i ≈ 8.06, major groove at i ≈ 3.06 (see header)
    const grooveMinor = pos(2.45, 0, yOf(8.06));
    const grooveMajor = pos(2.2, 0, yOf(3.06));
    const hex = meshes.hex;
    const pent = meshes.pent;
    const anchors = {
      'five-1': { object: at('five-1', out(p1[0]!, 1.15)), highlight: [] },
      'three-1': { object: at('three-1', out(oh1, 1.2)), highlight: [meshes.oh] },
      'five-2': { object: at('five-2', out(p2[N - 1]!, 1.15)), highlight: [] },
      'three-2': { object: at('three-2', out(oh2, 1.2)), highlight: [meshes.oh] },
      backbone: { object: at('backbone', out(p2[15]!, 1.12)), highlight: [meshes.phos, meshes.sugar, meshes.stick] },
      deoxyribose: { object: at('deoxyribose', out(s2[17]!, 1.2)), highlight: [meshes.sugar] },
      adenine: { object: at('adenine', baseCentre(8, 1, 0.3)), highlight: [hex.A, pent.A!] },
      thymine: { object: at('thymine', baseCentre(8, 2, 0.22)), highlight: [hex.T] },
      guanine: { object: at('guanine', baseCentre(13, 2, 0.3)), highlight: [hex.G, pent.G!] },
      cytosine: { object: at('cytosine', baseCentre(13, 1, 0.22)), highlight: [hex.C] },
      hbonds: { object: at('hbonds', gapCentre[13]!.clone().add(new THREE.Vector3(0, 0, 0.35))), highlight: [meshes.hbAT, meshes.hbGC] },
      'major-groove': { object: at('major-groove', grooveMajor), highlight: [] },
      'minor-groove': { object: at('minor-groove', grooveMinor), highlight: [] },
    };

    return {
      anchors,
      idle(dt) { body.rotation.y += dt * 0.3; },
      dispose() { root.removeFromParent(); },
    };
  },
};

export default scene;
