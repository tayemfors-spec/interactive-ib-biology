import * as THREE from 'three';
import type { SceneContext } from '../viewer3d/types';

/*
 * Geometry helpers shared by the B3.2 scenes (not a scene module itself).
 */

export type Edge = (a: number) => [number, number];

/** A ring-shaped boundary: radius r (+ optional ripple), squashed to an ellipse by ex/ey. */
export const ringEdge = (r: number, ex = 1, ey = 1, ripple = 0, folds = 0, phase = 0): Edge => (a) => {
  const rr = r + ripple * Math.sin(folds * a + phase);
  return [rr * Math.cos(a) * ex, rr * Math.sin(a) * ey];
};

/**
 * An annulus (or an arc of one, from angle a0 to a1) between two edges, extruded along z from z0 to z1.
 * The flat face at z1 is the cut face the reader sees.
 */
export function bandGeometry(ctx: SceneContext, inner: Edge, outer: Edge, z0: number, z1: number, a0 = 0, a1 = Math.PI * 2, n = 120) {
  const full = Math.abs(a1 - a0 - Math.PI * 2) < 1e-6;
  const pts = (e: Edge, from: number, to: number) => {
    const out: THREE.Vector2[] = [];
    const k = Math.max(8, Math.round((n * Math.abs(to - from)) / (Math.PI * 2)));
    for (let i = 0; i <= k; i++) { if (full && i === k) break; const [x, y] = e(from + ((to - from) * i) / k); out.push(new THREE.Vector2(x, y)); }
    return out;
  };
  let shape: THREE.Shape;
  if (full) {
    shape = new THREE.Shape(pts(outer, a0, a1));
    shape.holes.push(new THREE.Path(pts(inner, a0, a1).reverse()));
  } else {
    shape = new THREE.Shape([...pts(outer, a0, a1), ...pts(inner, a1, a0)]);
  }
  const g = new THREE.ExtrudeGeometry(shape, { depth: z1 - z0, bevelEnabled: false, curveSegments: 1, steps: 1 });
  g.translate(0, 0, z0);
  return ctx.track(g);
}

/** Orient a unit-height cylinder (or any y-axis mesh) so it runs from a to b. */
export function between(mesh: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, thick = 1) {
  const d = new THREE.Vector3().subVectors(b, a);
  mesh.position.copy(a).addScaledVector(d, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  mesh.scale.set(thick, Math.max(1e-4, d.length()), thick);
}

/** An arrow (shaft + head) pointing along `dir` from `from`, total length `len`. */
export function arrow(ctx: SceneContext, mat: THREE.Material, from: THREE.Vector3, dir: THREE.Vector3, len: number, r = 0.08) {
  const g = new THREE.Group();
  const head = Math.min(len * 0.45, r * 5);
  const shaft = new THREE.Mesh(ctx.track(new THREE.CylinderGeometry(r, r, len - head, 10)), mat);
  shaft.position.y = (len - head) / 2;
  const tip = new THREE.Mesh(ctx.track(new THREE.ConeGeometry(r * 2.6, head, 14)), mat);
  tip.position.y = len - head / 2;
  g.add(shaft, tip);
  g.position.copy(from);
  g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return g;
}

/**
 * The back half of a tube along a curve: the half on the −B side of each cross-section, where
 * N = T × ẑ and B = N × T (so for a curve in the xy-plane, the half with z below the centreline).
 * Used for vessels that are "cut open" by the section plane. Double-sided material recommended.
 */
export function halfTube(ctx: SceneContext, curve: THREE.Curve<THREE.Vector3>, radius: number | ((u: number) => number), segs = 64, radial = 18) {
  const pos: number[] = [];
  const idx: number[] = [];
  const rad = typeof radius === 'number' ? () => radius : radius;
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const { P, N, B } = frameAt(curve, u);
    const r = rad(u);
    for (let j = 0; j <= radial; j++) {
      const th = Math.PI + (Math.PI * j) / radial; // π..2π → the −B half
      const v = P.clone().addScaledVector(N, r * Math.cos(th)).addScaledVector(B, r * Math.sin(th));
      pos.push(v.x, v.y, v.z);
    }
  }
  const w = radial + 1;
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) {
    const a = i * w + j, b = a + 1, c = a + w, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return ctx.track(g);
}

/** Position, tangent and the N/B axes used by halfTube at parameter u. */
export function frameAt(curve: THREE.Curve<THREE.Vector3>, u: number) {
  const P = curve.getPointAt(u);
  const T = curve.getTangentAt(u).normalize();
  const z = new THREE.Vector3(0, 0, 1);
  let N = new THREE.Vector3().crossVectors(T, z);
  if (N.lengthSq() < 1e-6) N = new THREE.Vector3(1, 0, 0);
  N.normalize();
  const B = new THREE.Vector3().crossVectors(N, T).normalize();
  return { P, T, N, B };
}

export const curve3 = (pts: [number, number, number][], tension = 0.5) =>
  new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', tension);
