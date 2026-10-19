import * as THREE from 'three';
import type { PaletteKey, SceneContext } from '../viewer3d/types';

/*
 * Ball-and-stick helpers shared by the B1.1 molecule scenes (no default export).
 * Units are ångströms (1 Å = 0.1 nm). Atoms use the site-wide molecular colour mapping:
 * C → text (dark), O → k (red), H → neutral (light grey), P → head (orange).
 *
 * A "part" is a set of atoms and bonds with its own meshes, so a label can highlight just that part.
 */
export type El = 'C' | 'O' | 'H' | 'P';

export const RADIUS: Record<El, number> = { C: 0.44, O: 0.42, H: 0.26, P: 0.54 };
const KEY: Record<El, PaletteKey> = { C: 'text', O: 'k', H: 'neutral', P: 'head' };
export const STICK = 0.12;

/** Typical bond lengths (Å). */
export const LEN = { CC: 1.52, CdC: 1.34, CO: 1.43, CdO: 1.23, CH: 1.09, OH: 0.96, PO: 1.6, aro: 1.39 } as const;

const UP = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

export interface Part {
  group: THREE.Group;
  atom(el: El, p: THREE.Vector3): THREE.Vector3;
  /** order 2 draws two thinner parallel sticks offset within the plane whose normal is `normal`. */
  bond(a: THREE.Vector3, b: THREE.Vector3, order?: 1 | 2, normal?: THREE.Vector3): void;
  /** A dashed hydrogen bond between two points (drawn surface to surface). */
  hbond(a: THREE.Vector3, b: THREE.Vector3, gapA?: number, gapB?: number): void;
}

export function molKit(ctx: SceneContext) {
  const sphere = (r: number, w: number, h: number) => ctx.track(new THREE.SphereGeometry(r, w, h));
  const geo: Record<El, THREE.BufferGeometry> = { C: sphere(RADIUS.C, 18, 12), O: sphere(RADIUS.O, 18, 12), H: sphere(RADIUS.H, 12, 8), P: sphere(RADIUS.P, 20, 14) };
  const rod = ctx.track(new THREE.CylinderGeometry(1, 1, 1, 8, 1));
  const mats: Partial<Record<El, THREE.MeshStandardMaterial>> = {};
  const mat = (el: El) => {
    if (!mats[el]) {
      const m = ctx.material(KEY[el], { roughness: 0.38 });
      // H atoms glow slightly in their own colour so they stay visible on dark backgrounds (as in A1.1)
      if (el === 'H') { m.emissive.copy(m.color); m.emissiveIntensity = 0.45; }
      mats[el] = m;
    }
    return mats[el]!;
  };
  const mBond = (() => { const m = ctx.material('neutral', { roughness: 0.6 }); m.emissive.copy(m.color); m.emissiveIntensity = 0.25; return m; })();
  const mHB = ctx.material('water', { roughness: 0.5 });
  const parts: { group: THREE.Group; atoms: { el: El; p: THREE.Vector3 }[]; rods: { a: THREE.Vector3; b: THREE.Vector3; r: number }[]; dashes: { a: THREE.Vector3; b: THREE.Vector3 }[] }[] = [];

  const part = (parent: THREE.Object3D): Part => {
    const group = new THREE.Group();
    parent.add(group);
    const rec = { group, atoms: [] as { el: El; p: THREE.Vector3 }[], rods: [] as { a: THREE.Vector3; b: THREE.Vector3; r: number }[], dashes: [] as { a: THREE.Vector3; b: THREE.Vector3 }[] };
    parts.push(rec);
    return {
      group,
      atom(el, p) { rec.atoms.push({ el, p: p.clone() }); return p.clone(); },
      bond(a, b, order = 1, normal = Z) {
        if (order === 1) { rec.rods.push({ a: a.clone(), b: b.clone(), r: STICK }); return; }
        const d = b.clone().sub(a).normalize();
        let off = new THREE.Vector3().crossVectors(d, normal);
        if (off.lengthSq() < 1e-6) off = new THREE.Vector3().crossVectors(d, UP);
        off.normalize().multiplyScalar(0.15);
        rec.rods.push({ a: a.clone().add(off), b: b.clone().add(off), r: STICK * 0.7 });
        rec.rods.push({ a: a.clone().sub(off), b: b.clone().sub(off), r: STICK * 0.7 });
      },
      hbond(a, b, gapA = 0.35, gapB = 0.45) {
        const d = b.clone().sub(a);
        const len = d.length();
        d.normalize();
        const usable = Math.max(0.2, len - gapA - gapB);
        const n = 4;
        const seg = usable / (2 * n - 1);
        for (let k = 0; k < n; k++) {
          rec.dashes.push({ a: a.clone().addScaledVector(d, gapA + 2 * k * seg), b: a.clone().addScaledVector(d, gapA + (2 * k + 1) * seg) });
        }
      },
    };
  };

  const q = new THREE.Quaternion();
  const m4 = new THREE.Matrix4();
  const sv = new THREE.Vector3();
  const placeRod = (mesh: THREE.InstancedMesh, i: number, a: THREE.Vector3, b: THREE.Vector3, r: number) => {
    const d = b.clone().sub(a);
    q.setFromUnitVectors(UP, d.clone().normalize());
    sv.set(r, Math.max(1e-4, d.length()), r);
    m4.compose(a.clone().add(b).multiplyScalar(0.5), q, sv);
    mesh.setMatrixAt(i, m4);
  };

  /** Create the instanced meshes for every part (call once, after all atoms and bonds are added). */
  const finish = () => {
    for (const rec of parts) {
      for (const el of ['C', 'O', 'H', 'P'] as El[]) {
        const list = rec.atoms.filter((a) => a.el === el);
        if (!list.length) continue;
        const mesh = new THREE.InstancedMesh(geo[el], mat(el), list.length);
        list.forEach((a, i) => { m4.makeTranslation(a.p.x, a.p.y, a.p.z); mesh.setMatrixAt(i, m4); });
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
        rec.group.add(mesh);
      }
      if (rec.rods.length) {
        const mesh = new THREE.InstancedMesh(rod, mBond, rec.rods.length);
        rec.rods.forEach((r, i) => placeRod(mesh, i, r.a, r.b, r.r));
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
        rec.group.add(mesh);
      }
      if (rec.dashes.length) {
        const mesh = new THREE.InstancedMesh(rod, mHB, rec.dashes.length);
        rec.dashes.forEach((r, i) => placeRod(mesh, i, r.a, r.b, 0.06));
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
        rec.group.add(mesh);
      }
    }
  };

  return { part, finish };
}

/** Unit vector at angle `deg` (degrees) in the plane spanned by unit vectors u (0°) and v (90°). */
export const inPlane = (u: THREE.Vector3, v: THREE.Vector3, deg: number) => {
  const a = THREE.MathUtils.degToRad(deg);
  return u.clone().multiplyScalar(Math.cos(a)).addScaledVector(v, Math.sin(a));
};

/** Direction of the outward bisector at atom c with neighbours a and b (pointing away from both). */
export const outward = (c: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3) => {
  const s = a.clone().sub(c).normalize().add(b.clone().sub(c).normalize());
  return s.lengthSq() < 1e-8 ? new THREE.Vector3(0, 1, 0) : s.negate().normalize();
};

/** Tetrahedral directions for the two H atoms of a CH₂ group whose carbon has neighbours a and b; `n` is the plane normal. */
export const ch2Dirs = (c: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3, n: THREE.Vector3): [THREE.Vector3, THREE.Vector3] => {
  const u = outward(c, a, b);
  const ca = Math.cos(THREE.MathUtils.degToRad(54.75));
  const sa = Math.sin(THREE.MathUtils.degToRad(54.75));
  return [u.clone().multiplyScalar(ca).addScaledVector(n, sa).normalize(), u.clone().multiplyScalar(ca).addScaledVector(n, -sa).normalize()];
};

/**
 * A planar zigzag hydrocarbon chain (all bonds anti) in the plane spanned by `axis` (the chain direction)
 * and `side`, with plane normal `n`. Carbon 1 is at `c1`; bonds alternate ±30° about the axis, starting
 * with +30° (towards `side`). `doubles` lists double bonds Ck=Ck+1 by k, with their geometry:
 *  - trans: the zigzag continues, so the chain stays straight;
 *  - cis: the turn at Ck+1 repeats the turn at Ck, so the chain bends by 60° (the kink).
 * Returns carbon positions [C1 … Cn].
 */
export function zigzag(c1: THREE.Vector3, axis: THREE.Vector3, side: THREE.Vector3, n: number, doubles: Record<number, 'cis' | 'trans'> = {}) {
  const pts = [c1.clone()];
  const ax = axis.clone().normalize();
  const sd = side.clone().normalize();
  let ang = 30; // direction of bond C1→C2, measured from the axis towards `side`
  let turn = 60; // virtual turn "at C1", so the turn at C2 is −60°
  for (let k = 1; k < n; k++) {
    if (k > 1) {
      // turn at carbon Ck: repeat the previous turn if bond C(k−1)=Ck is a cis double bond, otherwise alternate
      turn = doubles[k - 1] === 'cis' ? turn : -turn;
      ang += turn;
    }
    pts.push(pts[k - 1]!.clone().addScaledVector(inPlane(ax, sd, ang), doubles[k] ? LEN.CdC : LEN.CC));
  }
  return pts;
}

/**
 * Add the carbon atoms, C–C bonds and hydrogen atoms of a hydrocarbon chain to `part`, starting at
 * carbon `from` (1-based; earlier carbons are drawn by the caller, e.g. a carboxyl or ester carbon).
 * sp² carbons of C=C bonds get one in-plane H; CH₂ groups two tetrahedral H; the terminal CH₃ three.
 */
export function chainAtoms(part: Part, pts: THREE.Vector3[], n: THREE.Vector3, doubles: Record<number, 'cis' | 'trans'> = {}, from = 2) {
  const last = pts.length;
  for (let j = from; j <= last; j++) {
    const c = pts[j - 1]!;
    const prev = pts[j - 2]!;
    part.atom('C', c);
    part.bond(prev, c, doubles[j - 1] ? 2 : 1, n);
    if (j === last) {
      // methyl: three H at 109.5° to the C–C bond, one of them in the plane, anti to the chain
      const d0 = c.clone().sub(prev).normalize();
      const before = pts[j - 3] ?? prev.clone().sub(d0);
      const p1 = before.clone().sub(prev);
      p1.addScaledVector(d0, -p1.dot(d0)).normalize().negate();
      const p2 = new THREE.Vector3().crossVectors(d0, p1).normalize();
      const ca = Math.cos(THREE.MathUtils.degToRad(70.5));
      const sa = Math.sin(THREE.MathUtils.degToRad(70.5));
      for (const deg of [0, 120, 240]) {
        const dir = d0.clone().multiplyScalar(ca).addScaledVector(inPlane(p1, p2, deg), sa).normalize();
        const h = c.clone().addScaledVector(dir, LEN.CH);
        part.atom('H', h);
        part.bond(c, h);
      }
      continue;
    }
    const next = pts[j]!;
    const dirs = doubles[j] || doubles[j - 1] ? [outward(c, prev, next)] : ch2Dirs(c, prev, next, n);
    for (const d of dirs) {
      const h = c.clone().addScaledVector(d, LEN.CH);
      part.atom('H', h);
      part.bond(c, h);
    }
  }
}
