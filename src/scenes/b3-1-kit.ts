import * as THREE from 'three';
import type { SceneContext } from '../viewer3d/types';

/* Geometry helpers shared by the B3.1 scenes (not a scene module itself). */

export type V3 = [number, number, number];
export const vec = (p: V3) => new THREE.Vector3(...p);

/** A smooth tube through points. */
export function tube(ctx: SceneContext, pts: THREE.Vector3[], radius: number, segments = 48, radial = 8, closed = false) {
  const curve = new THREE.CatmullRomCurve3(pts, closed, 'catmullrom', 0.5);
  return { curve, geo: ctx.track(new THREE.TubeGeometry(curve, segments, radius, radial, closed)) };
}

/** Point on a sphere (centre c, radius r) at polar angle θ from +y and azimuth φ (three.js SphereGeometry convention). */
export function onSphere(c: THREE.Vector3, r: number, theta: number, phi: number) {
  return new THREE.Vector3(c.x - r * Math.cos(phi) * Math.sin(theta), c.y + r * Math.cos(theta), c.z + r * Math.sin(phi) * Math.sin(theta));
}

const mtx = new THREE.Matrix4();
const quat = new THREE.Quaternion();
const scl = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
/** Instance transform whose local +y axis points along `dir`, with separate scales. */
export function setOriented(mesh: THREE.InstancedMesh, i: number, pos: THREE.Vector3, dir: THREE.Vector3, sx = 1, sy = 1, sz = sx) {
  quat.setFromUnitVectors(UP, dir.clone().normalize());
  scl.set(sx, sy, sz);
  mtx.compose(pos, quat, scl);
  mesh.setMatrixAt(i, mtx);
}

/** Piecewise-linear position along a list of points, u ∈ [0, 1]. */
export function along(path: THREE.Vector3[], u: number, out = new THREE.Vector3()) {
  const k = Math.max(0, Math.min(0.9999, u)) * (path.length - 1);
  const i = Math.floor(k);
  return out.copy(path[i]!).lerp(path[i + 1]!, k - i);
}
