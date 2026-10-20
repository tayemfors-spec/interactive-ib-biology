import * as THREE from 'three';
import type { PaletteKey, SceneContext } from '../viewer3d/types';

/*
 * Shared geometry helpers for the D1.2 process scenes (no default export).
 * Nucleotides use the same colour code as A1.2: A blue, T orange, G green, C purple, U amber.
 * Purines (A, G) are drawn as longer slabs than pyrimidines (T, C, U), so every base pair spans the
 * same width (purine + pyrimidine). A–T and A–U pairs get two hydrogen bonds, G–C pairs three.
 * Everything is instanced and rebuilt on each render, so render(index, t) can stay absolute.
 */
export type NBase = 'A' | 'T' | 'G' | 'C' | 'U';
export const BASE_KEY: Record<NBase, PaletteKey> = { A: 'protein', T: 'head', G: 'carb', C: 'protein2', U: 'glucose' };
export const PURINE: Record<NBase, boolean> = { A: true, G: true, T: false, C: false, U: false };
export const DNA_PAIR: Record<string, NBase> = { A: 'T', T: 'A', G: 'C', C: 'G' };
export const RNA_OF_TEMPLATE: Record<string, NBase> = { A: 'U', T: 'A', G: 'C', C: 'G' };
export const H_BONDS = (a: NBase, b: NBase) => ((a === 'G' && b === 'C') || (a === 'C' && b === 'G') ? 3 : 2);

const Y = new THREE.Vector3(0, 1, 0);

/** An instanced mesh whose instances are re-filled each frame: begin(), add…, end(). */
export function pool(ctx: SceneContext, parent: THREE.Object3D, geo: THREE.BufferGeometry, key: PaletteKey, cap: number, opts: THREE.MeshStandardMaterialParameters = {}) {
  const mesh = new THREE.InstancedMesh(geo, ctx.material(key, { roughness: 0.5, ...opts }), cap);
  mesh.count = 0;
  mesh.frustumCulled = false;
  parent.add(mesh);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  let n = 0;
  return {
    mesh,
    begin() { n = 0; },
    /** A sphere-like instance at p with uniform scale. */
    dot(p: THREE.Vector3, scale = 1) {
      if (n >= cap) return;
      q.identity(); s.set(scale, scale, scale);
      m.compose(p, q, s); mesh.setMatrixAt(n++, m);
    },
    /** A unit-height geometry stretched from a to b (cylinder or slab), with x/z scale `w`. */
    span(a: THREE.Vector3, b: THREE.Vector3, w = 1) {
      if (n >= cap) return;
      const d = b.clone().sub(a);
      const len = d.length();
      if (len < 1e-4) return;
      q.setFromUnitVectors(Y, d.divideScalar(len));
      s.set(w, len, w);
      m.compose(a.clone().add(b).multiplyScalar(0.5), q, s); mesh.setMatrixAt(n++, m);
    },
    end() { mesh.count = n; mesh.instanceMatrix.needsUpdate = true; },
  };
}
export type Pool = ReturnType<typeof pool>;

/** One pool of base slabs per base letter, plus helpers to draw a base or a pair. */
export function baseKit(ctx: SceneContext, parent: THREE.Object3D, cap: number) {
  const slab = ctx.track(new THREE.BoxGeometry(0.46, 1, 0.16));
  const pools = {} as Record<NBase, Pool>;
  for (const b of ['A', 'T', 'G', 'C', 'U'] as NBase[]) pools[b] = pool(ctx, parent, slab, BASE_KEY[b], cap);
  const hb = pool(ctx, parent, ctx.track(new THREE.CylinderGeometry(0.05, 0.05, 1, 6)), 'tail', cap * 3);
  const all = [...Object.values(pools), hb];
  return {
    pools,
    hb,
    begin() { for (const p of all) p.begin(); },
    end() { for (const p of all) p.end(); },
    /** A base on the backbone point `from`, pointing along unit `dir`; `gap` is the full pair span. Returns its tip. */
    base(b: NBase, from: THREE.Vector3, dir: THREE.Vector3, gap: number) {
      const len = gap * (PURINE[b] ? 0.56 : 0.36);
      const a = from.clone().addScaledVector(dir, 0.18);
      const tip = a.clone().addScaledVector(dir, len);
      pools[b].span(a, tip);
      return tip;
    },
    /** Dashed hydrogen bonds between two base tips (2 or 3 of them, spread across the slab width). */
    bonds(n: number, tipA: THREE.Vector3, tipB: THREE.Vector3, across: THREE.Vector3) {
      const offs = n === 2 ? [-0.11, 0.11] : [-0.16, 0, 0.16];
      for (const o of offs) {
        const a = tipA.clone().addScaledVector(across, o);
        const b = tipB.clone().addScaledVector(across, o);
        hb.span(a.clone().lerp(b, 0.12), b.clone().lerp(a, 0.12));
      }
    },
  };
}
