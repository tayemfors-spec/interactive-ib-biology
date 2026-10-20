import * as THREE from 'three';
import type { SceneContext } from '../viewer3d/types';

/*
 * Geometry helpers shared by the D3.3 kidney scenes (not a scene module itself).
 */

export type V3 = [number, number, number];

export const curve = (pts: V3[], closed = false, tension = 0.5) =>
  new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), closed, 'catmullrom', tension);

/** A tube along a curve, added to `parent`. */
export function tube(ctx: SceneContext, parent: THREE.Object3D, c: THREE.Curve<THREE.Vector3>, r: number, mat: THREE.Material, segs = 120, radial = 14) {
  const m = new THREE.Mesh(ctx.track(new THREE.TubeGeometry(c, segs, r, radial, false)), mat);
  parent.add(m);
  return m;
}

/** A sphere used to round off the joint between two tubes. */
export function joint(ctx: SceneContext, parent: THREE.Object3D, at: THREE.Vector3, r: number, mat: THREE.Material) {
  const m = new THREE.Mesh(ctx.track(new THREE.SphereGeometry(r, 16, 12)), mat);
  m.position.copy(at);
  parent.add(m);
  return m;
}

/**
 * A curve that winds around another curve (like a capillary wrapped round a tubule):
 * offset `dist` from it, turning `turns` times round it along its length.
 */
export function windAround(c: THREE.Curve<THREE.Vector3>, dist: number, turns: number, phase = 0, from = 0, to = 1, n = 140) {
  const pts: THREE.Vector3[] = [];
  const frames = c.computeFrenetFrames(n, false);
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    if (u < from || u > to) continue;
    const a = phase + turns * Math.PI * 2 * u;
    const p = c.getPointAt(u);
    p.addScaledVector(frames.normals[i]!, Math.cos(a) * dist).addScaledVector(frames.binormals[i]!, Math.sin(a) * dist);
    pts.push(p);
  }
  return new THREE.CatmullRomCurve3(pts);
}

/** Draw `count` instances of a particle mesh spread along a curve, moving with progress t. */
export function flowAlong(im: THREE.InstancedMesh, start: number, curves: THREE.Curve<THREE.Vector3>[], perUnit: number, t: number, speed = 1, scale = 1) {
  const o = new THREE.Object3D();
  let n = start;
  for (const c of curves) {
    const count = Math.max(3, Math.round(c.getLength() * perUnit));
    for (let i = 0; i < count && n < im.instanceMatrix.count; i++) {
      const u = (((i + t * speed * count * 0.25) / count) % 1 + 1) % 1;
      o.position.copy(c.getPointAt(u));
      o.scale.setScalar(scale);
      o.updateMatrix();
      im.setMatrixAt(n++, o.matrix);
    }
  }
  return n;
}

export function placeAt(im: THREE.InstancedMesh, i: number, p: THREE.Vector3, s = 1) {
  const o = new THREE.Object3D();
  o.position.copy(p);
  o.scale.setScalar(s);
  o.updateMatrix();
  im.setMatrixAt(i, o.matrix);
}
