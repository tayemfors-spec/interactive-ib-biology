import * as THREE from 'three';
import type { PaletteKey, SceneContext } from '../viewer3d/types';
import { blobGeometry } from '../viewer3d/kit';

/*
 * Shared geometry for the D1.1 replication-fork scenes (no default export).
 *
 * The parental DNA lies along x. Strand "A" runs 5′→3′ towards +x and strand "B" (its complement) runs
 * 5′→3′ towards −x, so they are antiparallel. The fork is at x = F and moves towards +x:
 *   • x > F  — unreplicated parental double helix (right-handed, 10 bp per turn). The twist is measured from
 *              the fork, so the parental helix turns as the fork advances (unwinding).
 *   • x < F  — the strands have been separated (hydrogen bonds broken). Over a fork zone of length L they
 *              diverge into two arms whose axes are at y = +D (strand A, upper arm) and y = −D (strand B, lower arm).
 * New strands pair with each template on the inner side of its arm:
 *   • "A2" pairs with A, so it runs 5′→3′ towards −x (away from the fork): the lagging strand.
 *   • "B2" pairs with B, so it runs 5′→3′ towards +x (towards the fork): the leading strand.
 * Colours: bases follow A1.2 (A blue, T orange, G green, C purple, U amber); the parental backbone is dark
 * ('text'), new DNA backbone red ('k') and RNA primer backbone amber ('glucose'). Hydrogen bonds: 2 per A–T,
 * 3 per G–C, drawn as dashed yellow sticks.
 */

export type Base = 'A' | 'T' | 'G' | 'C' | 'U';
export type Role = 'parent' | 'new' | 'rna';
export type StrandId = 'A' | 'B' | 'A2' | 'B2';

export const BASE_KEY: Record<Base, PaletteKey> = { A: 'protein', T: 'head', G: 'carb', C: 'protein2', U: 'glucose' };
export const ROLE_KEY: Record<Role, PaletteKey> = { parent: 'text', new: 'k', rna: 'glucose' };
const PURINE: Record<Base, boolean> = { A: true, G: true, T: false, C: false, U: false };
/** DNA base that pairs with a template base. */
export const DNA_PAIR: Record<Base, Base> = { A: 'T', T: 'A', G: 'C', C: 'G', U: 'A' };
/** RNA (primer) base that pairs with a DNA template base: uracil replaces thymine. */
export const RNA_PAIR: Record<Base, Base> = { A: 'U', T: 'A', G: 'C', C: 'G', U: 'A' };
export const isPairing = (a: Base, b: Base) => DNA_PAIR[a] === b || RNA_PAIR[a] === b || DNA_PAIR[b] === a;
export const H_BONDS = (a: Base) => (a === 'G' || a === 'C' ? 3 : 2);

export const R = 1.35; // sugar distance from a duplex axis
const SUGAR_OFF = 0.3; // base starts this far from the sugar centre
const GAP = 0.32; // hydrogen-bond gap between paired bases
const RUNG = 2 * R - 2 * SUGAR_OFF - GAP; // purine + pyrimidine length
const TWIST = (36 * Math.PI) / 180;
const X = new THREE.Vector3(1, 0, 0);
const Yv = new THREE.Vector3(0, 1, 0);

export interface ForkState {
  /** x of the fork (where the hydrogen bonds are being broken). */
  F: number;
  /** 0 = separated strands lie in flat arms, 1 = each daughter molecule has rewound into a double helix. */
  tau: number;
  /** distance of each arm's axis from the parental axis. */
  D: number;
  /** length of the fork zone over which the arms diverge. */
  L: number;
}

export interface Frame { sugar: THREE.Vector3; axis: THREE.Vector3; dir: THREE.Vector3; s: number }

export const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/** Position of nucleotide slot `x` on a strand for the current fork state. */
export function frameAt(strand: StrandId, x: number, st: ForkState): Frame {
  const upper = strand === 'A' || strand === 'A2';
  const s = ease((st.F - x) / st.L);
  // twist: parental helix ahead of the fork (measured from the fork); daughters rewind by tau
  const phi0 = x > st.F ? TWIST * (x - st.F) : 0;
  const phiD = st.tau * TWIST * (x - st.F);
  let phi = x > st.F ? phi0 : phiD;
  // strand A sits at phi, B opposite; in an arm the template is on the outside, its new partner inside
  const axisY = (upper ? 1 : -1) * st.D * s;
  if (strand === 'B' || strand === 'A2') phi += Math.PI;
  const axis = new THREE.Vector3(x, axisY, 0);
  const sugar = new THREE.Vector3(x, axisY + R * Math.cos(phi), R * Math.sin(phi));
  // in the fork zone the paired partner of a template lies across the opening, not at the axis
  const dir = axis.clone().sub(sugar).normalize();
  return { sugar, axis, dir, s };
}

/** Instanced pools for nucleotides, rebuilt every frame by render(). */
export function nucleotidePools(ctx: SceneContext, root: THREE.Object3D, cap = 260) {
  const sugarGeo = ctx.track(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 5));
  const phosGeo = ctx.track(new THREE.SphereGeometry(0.3, 14, 10));
  const stickGeo = ctx.track(new THREE.CylinderGeometry(0.09, 0.09, 1, 6));
  const baseGeo = ctx.track(new THREE.BoxGeometry(1, 1, 1));
  const hbGeo = ctx.track(new THREE.CylinderGeometry(0.045, 0.045, 1, 5));
  const pool = (geo: THREE.BufferGeometry, key: PaletteKey, n: number, opts: THREE.MeshStandardMaterialParameters = {}): THREE.InstancedMesh => {
    const m = new THREE.InstancedMesh(geo, ctx.material(key, { roughness: 0.5, ...opts }), n);
    m.count = 0;
    m.frustumCulled = false;
    root.add(m);
    return m;
  };
  const roles: Role[] = ['parent', 'new', 'rna'];
  const meshes = {
    sugar: pool(sugarGeo, 'neutral', cap),
    phos: Object.fromEntries(roles.map((r) => [r, pool(phosGeo, ROLE_KEY[r], cap, { roughness: 0.35 })])) as Record<Role, THREE.InstancedMesh>,
    stick: Object.fromEntries(roles.map((r) => [r, pool(stickGeo, ROLE_KEY[r], cap * 2)])) as Record<Role, THREE.InstancedMesh>,
    base: Object.fromEntries((['A', 'T', 'G', 'C', 'U'] as Base[]).map((b) => [b, pool(baseGeo, BASE_KEY[b], cap)])) as Record<Base, THREE.InstancedMesh>,
    hb: pool(hbGeo, 'tail', cap * 6),
  };
  const all = [meshes.sugar, ...Object.values(meshes.phos), ...Object.values(meshes.stick), ...Object.values(meshes.base), meshes.hb];

  const mtx = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const sv = new THREE.Vector3();
  const add = (mesh: THREE.InstancedMesh, m: THREE.Matrix4) => { if (mesh.count < mesh.instanceMatrix.count) mesh.setMatrixAt(mesh.count++, m); };
  const stick = (mesh: THREE.InstancedMesh, a: THREE.Vector3, b: THREE.Vector3, r = 1) => {
    const d = b.clone().sub(a);
    const len = d.length();
    if (len < 1e-4) return;
    q.setFromUnitVectors(Yv, d.divideScalar(len));
    sv.set(r, len, r);
    mtx.compose(a.clone().add(b).multiplyScalar(0.5), q, sv);
    add(mesh, mtx);
  };
  /** Box from `from` along unit `dir` (⊥ x) for `len`, thick along x. */
  const bar = (mesh: THREE.InstancedMesh, from: THREE.Vector3, dir: THREE.Vector3, len: number, k: number) => {
    const w = new THREE.Vector3().crossVectors(dir, X).normalize();
    const zx = new THREE.Vector3().crossVectors(w, dir).normalize();
    const rot = new THREE.Matrix4().makeBasis(w, dir, zx);
    q.setFromRotationMatrix(rot);
    sv.set(0.5 * k, len, 0.46 * k);
    mtx.compose(from.clone().addScaledVector(dir, len / 2), q, sv);
    add(mesh, mtx);
  };

  /**
   * One nucleotide: sugar at `sugar`, base pointing along `dir`. `k` scales it (0 → absent).
   * Returns the tip of the base.
   */
  const nucleotide = (base: Base, sugar: THREE.Vector3, dir: THREE.Vector3, k = 1) => {
    if (k <= 0.001) return sugar.clone();
    const w = new THREE.Vector3().crossVectors(dir, X);
    if (w.lengthSq() < 1e-6) w.set(0, 0, 1);
    w.normalize();
    q.setFromUnitVectors(Yv, w);
    sv.set(k, k, k);
    mtx.compose(sugar, q, sv);
    add(meshes.sugar, mtx);
    const len = RUNG * (PURINE[base] ? 0.58 : 0.42) * k;
    const start = sugar.clone().addScaledVector(dir, SUGAR_OFF * k);
    bar(meshes.base[base], start, dir, len, k);
    stick(meshes.stick.parent, sugar, start, 0.6 * k);
    return start.addScaledVector(dir, len);
  };

  /** Backbone link between two adjacent sugars: phosphate pushed outwards from the strand's axis. */
  const link = (role: Role, s1: THREE.Vector3, s2: THREE.Vector3, out: THREE.Vector3, k = 1) => {
    if (k <= 0.001) return;
    const p = s1.clone().add(s2).multiplyScalar(0.5).addScaledVector(out, 0.28);
    stick(meshes.stick[role], s1, p, k);
    stick(meshes.stick[role], p, s2, k);
    sv.set(k, k, k);
    mtx.compose(p, q.identity(), sv);
    add(meshes.phos[role], mtx);
  };
  /** A phosphate on one side of a sugar that is not bonded to a neighbour (a 5′ end or a nick). */
  const loosePhosphate = (role: Role, s: THREE.Vector3, side: number, out: THREE.Vector3, k = 1) => {
    if (k <= 0.001) return;
    const p = s.clone().add(new THREE.Vector3(side * 0.42, 0, 0)).addScaledVector(out, 0.28);
    stick(meshes.stick[role], s, p, k);
    sv.set(k, k, k);
    mtx.compose(p, q.identity(), sv);
    add(meshes.phos[role], mtx);
  };
  /** Dashed hydrogen bonds between two base tips. */
  const hbonds = (n: number, a: THREE.Vector3, b: THREE.Vector3) => {
    const offs = n === 2 ? [-0.11, 0.11] : [-0.15, 0, 0.15];
    for (const o of offs) {
      const pa = a.clone().add(new THREE.Vector3(o, 0, 0));
      const pb = b.clone().add(new THREE.Vector3(o, 0, 0));
      stick(meshes.hb, pa, pa.clone().lerp(pb, 0.42));
      stick(meshes.hb, pa.clone().lerp(pb, 0.58), pb);
    }
  };
  const begin = () => { for (const m of all) m.count = 0; };
  const end = () => { for (const m of all) m.instanceMatrix.needsUpdate = true; };
  return { meshes, nucleotide, link, loosePhosphate, hbonds, begin, end };
}
export type Pools = ReturnType<typeof nucleotidePools>;

/** One slot of a strand as drawn this frame. */
export interface Slot {
  base: Base;
  role: Role;
  /** 0 = absent, 1 = fully in place. */
  k: number;
  /** bonded (sugar–phosphate) to the slot at index + 1. */
  linkNext: boolean;
  /** optional displacement (e.g. a mismatched or excised nucleotide). */
  offset?: THREE.Vector3;
  /** no hydrogen bonds to the template (mismatch). */
  mismatch?: boolean;
}

/** Strand 5′→3′ direction along x: A and B2 towards +x, B and A2 towards −x. */
export const STRAND_DIR: Record<StrandId, 1 | -1> = { A: 1, B2: 1, B: -1, A2: -1 };

/**
 * Draw the four strands. `slots[strand][i]` may be null (no nucleotide). Parental hydrogen bonds are drawn where
 * the strands are still paired (x ≥ F); template–new bonds where a new nucleotide is fully in place.
 */
export function drawStrands(p: Pools, xs: number[], st: ForkState, slots: Record<StrandId, (Slot | null)[]>) {
  const frames = {} as Record<StrandId, Frame[]>;
  const tips = {} as Record<StrandId, (THREE.Vector3 | null)[]>;
  for (const id of ['A', 'B', 'A2', 'B2'] as StrandId[]) {
    frames[id] = xs.map((x) => frameAt(id, x, st));
    tips[id] = xs.map((_, i) => {
      const sl = slots[id][i];
      if (!sl || sl.k <= 0.001) return null;
      const f = frames[id][i]!;
      const s = f.sugar.clone();
      if (sl.offset) s.add(sl.offset);
      // free (incoming) nucleotides come in from the open side of the template
      if (sl.k < 1) s.addScaledVector(f.dir, -(1 - sl.k) * 1.4);
      return p.nucleotide(sl.base, s, f.dir, Math.min(1, sl.k * 1.15));
    });
  }
  for (const id of ['A', 'B', 'A2', 'B2'] as StrandId[]) {
    const fr = frames[id];
    const arr = slots[id];
    const dir5to3 = STRAND_DIR[id];
    for (let i = 0; i < xs.length; i++) {
      const sl = arr[i];
      if (!sl || sl.k <= 0.001) continue;
      const pos = (j: number) => { const f = fr[j]!; const s = f.sugar.clone(); const o = arr[j]?.offset; if (o) s.add(o); const k = arr[j]?.k ?? 1; if (k < 1) s.addScaledVector(f.dir, -(1 - k) * 1.4); return s; };
      const out = fr[i]!.dir.clone().negate();
      const nx = arr[i + 1];
      if (sl.linkNext && nx && nx.k > 0.001) {
        // the phosphate between i and i+1 belongs to whichever nucleotide has its 5′ end on that side
        const owner = dir5to3 === 1 ? nx : sl;
        p.link(owner.role, pos(i), pos(i + 1), out, Math.min(sl.k, nx.k));
      } else if (dir5to3 === -1 && sl.k >= 0.999 && !sl.mismatch) {
        // 5′ end (or the 5′ side of a nick) of a strand running towards −x is on its +x side
        p.loosePhosphate(sl.role, pos(i), 1, out);
      }
      const pv = arr[i - 1];
      const prevLinked = !!pv && pv.linkNext && pv.k > 0.001;
      if (dir5to3 === 1 && !prevLinked && sl.k >= 0.999 && !sl.mismatch) p.loosePhosphate(sl.role, pos(i), -1, out);
    }
  }
  // hydrogen bonds
  for (let i = 0; i < xs.length; i++) {
    const a = tips.A[i], b = tips.B[i];
    if (a && b && xs[i]! >= st.F - 0.05) p.hbonds(H_BONDS(slots.A[i]!.base), a, b);
    for (const [t, n] of [['A', 'A2'], ['B', 'B2']] as [StrandId, StrandId][]) {
      const ta = tips[t][i], tn = tips[n][i];
      const sn = slots[n][i];
      if (ta && tn && sn && sn.k >= 0.999 && !sn.mismatch && frames[t][i]!.s > 0.98) p.hbonds(H_BONDS(sn.base), ta, tn);
    }
  }
  return { frames, tips };
}

/** Translucent globular enzyme (a group so labels can ride on it). */
export function enzyme(ctx: SceneContext, root: THREE.Object3D, key: PaletteKey, radius: number, height: number, seed: number) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(ctx.track(blobGeometry(radius, height, seed, 0.14, 20)), ctx.material(key, { roughness: 0.45, transparent: true, opacity: 0.72, depthWrite: false }));
  m.rotation.z = Math.PI / 2;
  g.add(m);
  root.add(g);
  return g;
}

/** Helicase drawn as a hexameric ring that encircles one template strand (axis along x). */
export function helicaseRing(ctx: SceneContext, root: THREE.Object3D) {
  const g = new THREE.Group();
  const mat = ctx.material('na', { roughness: 0.4, transparent: true, opacity: 0.8 });
  const lobe = ctx.track(new THREE.SphereGeometry(0.5, 16, 12));
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    const m = new THREE.Mesh(lobe, mat);
    m.position.set(0, Math.cos(a) * 0.95, Math.sin(a) * 0.95);
    m.scale.set(1.25, 0.9, 0.9);
    g.add(m);
  }
  root.add(g);
  return g;
}

export const xsFor = (n: number) => Array.from({ length: n }, (_, i) => i - (n - 1) / 2);
export const complementOf = (seq: Base[]) => seq.map((b) => DNA_PAIR[b]);
