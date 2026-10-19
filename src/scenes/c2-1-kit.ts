import * as THREE from 'three';
import type { SceneContext } from '../viewer3d/types';
import { rng, setInstance } from '../viewer3d/kit';

/*
 * Shared geometry for the C2.1 receptor scenes (no default export, so it is not treated as a scene).
 * +y is the extracellular side; the bilayer is centred on `y`.
 */
export const HEAD_DY = 1.7; // head centre distance from the bilayer mid-plane

export interface Hole { x: number; z: number; r: number }
export interface Bilayer {
  heads: THREE.InstancedMesh;
  tails: THREE.InstancedMesh;
  /** Hide (or show again) the lipids within radius r of (x, z), e.g. where a protein is inserted later. */
  clear(x: number, z: number, r: number, hidden: boolean): void;
  /** Lipid head positions in the outer (1) or inner (-1) leaflet, for anchors. */
  y: number;
}

/** A rectangular patch of phospholipid bilayer, with gaps where proteins sit. */
export function bilayer(
  ctx: SceneContext,
  root: THREE.Object3D,
  opts: { y?: number; x: [number, number]; z: [number, number]; holes?: Hole[]; seed?: number; step?: number },
): Bilayer {
  const y = opts.y ?? 0;
  const step = opts.step ?? 0.72;
  const rand = rng(opts.seed ?? 3);
  const holes = opts.holes ?? [];
  const mHead = ctx.material('head', { roughness: 0.5 });
  const mTail = ctx.material('tail', { roughness: 0.75 });
  const headGeo = ctx.track(new THREE.SphereGeometry(0.33, 12, 8));
  const tailGeo = ctx.track(new THREE.CylinderGeometry(0.07, 0.07, 1.25, 5));
  const slots: { x: number; z: number; s: 1 | -1 }[] = [];
  for (const s of [1, -1] as const)
    for (let x = opts.x[0]; x <= opts.x[1] + 0.01; x += step)
      for (let z = opts.z[0]; z <= opts.z[1] + 0.01; z += step) {
        if (holes.some((h) => Math.hypot(x - h.x, z - h.z) < h.r)) continue;
        slots.push({ x: x + (rand() - 0.5) * 0.12, z: z + (rand() - 0.5) * 0.12, s });
      }
  const heads = new THREE.InstancedMesh(headGeo, mHead, slots.length);
  const tails = new THREE.InstancedMesh(tailGeo, mTail, slots.length * 2);
  const place = (i: number, scale: number) => {
    const p = slots[i]!;
    setInstance(heads, i, new THREE.Vector3(p.x, y + p.s * HEAD_DY, p.z), undefined, scale);
    const yT = y + p.s * (HEAD_DY - 0.25 - 0.62);
    setInstance(tails, 2 * i, new THREE.Vector3(p.x - 0.1, yT, p.z), undefined, scale);
    setInstance(tails, 2 * i + 1, new THREE.Vector3(p.x + 0.1, yT, p.z), undefined, scale);
  };
  slots.forEach((_, i) => place(i, 1));
  root.add(heads, tails);
  return {
    heads,
    tails,
    y,
    clear(x, z, r, hidden) {
      slots.forEach((p, i) => { if (Math.hypot(p.x - x, p.z - z) < r) place(i, hidden ? 0.001 : 1); });
      heads.instanceMatrix.needsUpdate = true;
      tails.instanceMatrix.needsUpdate = true;
    },
  };
}

/**
 * A nucleotide drawn as a base blob plus a short chain of phosphate spheres,
 * so GDP (2 phosphates), GTP and ATP (3) and ADP can be told apart by counting.
 */
export function nucleotide(ctx: SceneContext, phosphates: number, baseKey: 'neutral' | 'carb' = 'neutral') {
  const g = new THREE.Group();
  const base = new THREE.Mesh(ctx.track(new THREE.SphereGeometry(0.26, 12, 8)), ctx.material(baseKey, { roughness: 0.4 }));
  g.add(base);
  const pGeo = ctx.track(new THREE.SphereGeometry(0.16, 10, 8));
  const pMat = ctx.material('head', { roughness: 0.35 });
  for (let i = 0; i < phosphates; i++) {
    const m = new THREE.Mesh(pGeo, pMat);
    m.position.set(0.36 + i * 0.27, 0, 0);
    g.add(m);
  }
  return g;
}

/**
 * Instanced meshes here move their instances every frame (and park unused ones far away), so a bounding
 * sphere computed once would cull them wrongly. Turn frustum culling off for them.
 */
export function noCull(root: THREE.Object3D) {
  root.traverse((o) => { if (o instanceof THREE.InstancedMesh) o.frustumCulled = false; });
}

/** Place an object at a point interpolated along a polyline. */
export function along(path: THREE.Vector3[], u: number, out = new THREE.Vector3()) {
  const k = Math.max(0, Math.min(0.9999, u)) * (path.length - 1);
  const i = Math.floor(k);
  return out.copy(path[i]!).lerp(path[i + 1]!, k - i);
}
