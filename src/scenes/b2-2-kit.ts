import * as THREE from 'three';
import type { SceneContext } from '../viewer3d/types';
import { rng } from '../viewer3d/kit';

/*
 * Geometry helpers shared by the B2.2 organelle scenes (not a scene module itself).
 *
 * Every organelle is cut open by the plane z = 0 and only the half behind it (z ≤ 0) is drawn, so the
 * reader looks into it from the +z side. Membranes are surfaces of revolution; where a surface meets the
 * cut plane its edge is drawn as a tube, and the space between two membranes is filled on the cut face,
 * so a double membrane always reads as two lines with a space between them.
 */

export type P2 = [number, number];
export const DS = THREE.DoubleSide;

/** Points on a circle arc of radius r around (cx, cy), from angle a0 to a1 (radians). */
export function arc(cx: number, cy: number, r: number, a0: number, a1: number, n = 16): P2[] {
  const out: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return out;
}

/** Points along a straight line, including both ends. */
export function line(a: P2, b: P2, n = 6): P2[] {
  return Array.from({ length: n + 1 }, (_, i) => [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n] as P2);
}

/** Join point lists, dropping duplicated joints. */
export function join(...parts: P2[][]): P2[] {
  const out: P2[] = [];
  for (const p of parts) for (const q of p) {
    const last = out[out.length - 1];
    if (last && Math.hypot(last[0] - q[0], last[1] - q[1]) < 1e-6) continue;
    out.push(q);
  }
  return out;
}

/**
 * Point on a sphere-centred profile given polar angle φ from +y (0 = top pole, π = bottom) and radius r,
 * as (ρ, y) where ρ is the distance from the y axis.
 */
export const polar = (r: number, phi: number): P2 => [r * Math.sin(phi), r * Math.cos(phi)];
export function polarArc(r: number, phi0: number, phi1: number, n = 24): P2[] {
  return Array.from({ length: n + 1 }, (_, i) => polar(r, phi0 + ((phi1 - phi0) * i) / n));
}

/** A tube through 2D points lying in the cut plane z = `z`. */
export function planeTube(ctx: SceneContext, pts: P2[], radius: number, closed = false, z = 0, tension = 'centripetal' as const) {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, z)), closed, tension);
  return ctx.track(new THREE.TubeGeometry(curve, Math.max(24, pts.length * 3), radius, 6, closed));
}

/** A flat filled polygon (optionally with holes) in the plane z = `z`. */
export function planeFill(ctx: SceneContext, outer: P2[], holes: P2[][] = [], z = 0) {
  const s = new THREE.Shape(outer.map(([x, y]) => new THREE.Vector2(x, y)));
  for (const h of holes) s.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
  const g = new THREE.ShapeGeometry(s, 6);
  g.translate(0, 0, z);
  return ctx.track(g);
}

/** Mirror profile points onto the −x side of the cut plane. */
export const mirror = (pts: P2[]): P2[] => pts.map(([x, y]) => [-x, y]);

export interface Hole { axis: THREE.Vector3; r: number }

/**
 * A surface of revolution about the y axis covering azimuths [phi0, phi1] (three.js lathe convention:
 * azimuth π/2 is the +x half of the cut plane, π is −z, 3π/2 is the −x half). Triangles inside any of
 * the `holes` (a cylinder of radius r around a unit axis through the origin) are removed, which is how
 * nuclear pores are opened in the envelope.
 */
export function lathe(ctx: SceneContext, profile: P2[], phi0 = Math.PI / 2, phi1 = Math.PI * 1.5, segments = 64, holes: Hole[] = []) {
  const g = new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(Math.max(1e-4, x), y)), segments, phi0, phi1 - phi0);
  if (holes.length) {
    const pos = g.attributes.position as THREE.BufferAttribute;
    const idx = g.index!;
    const keep: number[] = [];
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    for (let i = 0; i < idx.count; i += 3) {
      a.fromBufferAttribute(pos, idx.getX(i));
      b.fromBufferAttribute(pos, idx.getX(i + 1));
      c.fromBufferAttribute(pos, idx.getX(i + 2));
      const m = a.add(b).add(c).multiplyScalar(1 / 3);
      const inside = holes.some((h) => {
        const along = m.dot(h.axis);
        if (along <= 0) return false;
        return Math.sqrt(Math.max(0, m.lengthSq() - along * along)) < h.r;
      });
      if (!inside) keep.push(idx.getX(i), idx.getX(i + 1), idx.getX(i + 2));
    }
    g.setIndex(keep);
  }
  return ctx.track(g);
}

/** Orthonormal frame with local y along `u` and local z along `back` (projected to be perpendicular). */
export function frame(u: THREE.Vector3, back = new THREE.Vector3(0, 0, -1)) {
  const y = u.clone().normalize();
  let z = back.clone().sub(y.clone().multiplyScalar(back.dot(y)));
  if (z.lengthSq() < 1e-6) z = new THREE.Vector3(1, 0, 0).sub(y.clone().multiplyScalar(y.x));
  z.normalize();
  const x = new THREE.Vector3().crossVectors(y, z);
  return new THREE.Matrix4().makeBasis(x, y, z);
}

/**
 * The membrane lining a nuclear pore: where the outer and inner membranes of the envelope meet. It is the
 * half of a torus that faces the pore's axis (a semicircle of radius `rho` lathed round the axis at
 * distance `a`), so it joins the inner membrane to the outer membrane. `half` keeps only the part behind
 * the cut plane (for a pore on the cut edge).
 */
export function poreMembrane(ctx: SceneContext, a: number, rho: number, half: boolean) {
  const prof: P2[] = [];
  for (let i = 0; i <= 12; i++) {
    const s = (i / 12) * Math.PI;
    prof.push([a - rho * Math.sin(s), -rho * Math.cos(s)]);
  }
  const g = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), half ? 12 : 24, half ? -Math.PI / 2 : 0, half ? Math.PI : Math.PI * 2);
  return { geometry: ctx.track(g), profile: prof };
}

/** Random points accepted by `inside`, inside the box, at least `gap` apart from each other. */
export function scatter(rand: () => number, count: number, box: [THREE.Vector3, THREE.Vector3], inside: (p: THREE.Vector3) => boolean, gap = 0) {
  const out: THREE.Vector3[] = [];
  let guard = 0;
  while (out.length < count && guard++ < count * 80) {
    const p = new THREE.Vector3(
      box[0].x + rand() * (box[1].x - box[0].x),
      box[0].y + rand() * (box[1].y - box[0].y),
      box[0].z + rand() * (box[1].z - box[0].z),
    );
    if (!inside(p)) continue;
    if (gap > 0 && out.some((q) => q.distanceTo(p) < gap)) continue;
    out.push(p);
  }
  return out;
}

/** An InstancedMesh with one instance at each point (count set to the number used). */
export function instanced(geo: THREE.BufferGeometry, mat: THREE.Material, pts: THREE.Vector3[]) {
  const im = new THREE.InstancedMesh(geo, mat, Math.max(1, pts.length));
  const m4 = new THREE.Matrix4();
  pts.forEach((p, i) => { m4.makeTranslation(p.x, p.y, p.z); im.setMatrixAt(i, m4); });
  im.count = pts.length;
  im.instanceMatrix.needsUpdate = true;
  return im;
}

/**
 * Membrane proteins drawn as "lollipops" (ATP synthase: a stalk in the membrane and a head that projects
 * from one face). Each item is a base point on the membrane and the unit direction the head points.
 */
export function lollipops(ctx: SceneContext, items: { at: THREE.Vector3; dir: THREE.Vector3 }[], headMat: THREE.Material, stalkMat: THREE.Material, size = 1) {
  const g = new THREE.Group();
  const head = new THREE.InstancedMesh(ctx.track(new THREE.SphereGeometry(0.11 * size, 10, 8)), headMat, Math.max(1, items.length));
  const stalk = new THREE.InstancedMesh(ctx.track(new THREE.CylinderGeometry(0.035 * size, 0.035 * size, 0.2 * size, 6)), stalkMat, Math.max(1, items.length));
  const q = new THREE.Quaternion();
  const m4 = new THREE.Matrix4();
  const up = new THREE.Vector3(0, 1, 0);
  const one = new THREE.Vector3(1, 1, 1);
  items.forEach(({ at, dir }, i) => {
    q.setFromUnitVectors(up, dir);
    m4.compose(at.clone().addScaledVector(dir, 0.08 * size), q, one);
    stalk.setMatrixAt(i, m4);
    m4.compose(at.clone().addScaledVector(dir, 0.24 * size), q, one);
    head.setMatrixAt(i, m4);
  });
  head.count = stalk.count = items.length;
  g.add(stalk, head);
  return { group: g, heads: head };
}

/** A small closed, slightly wobbly loop (circular DNA). */
export function dnaLoop(ctx: SceneContext, r: number, tube: number, seed = 3) {
  const rand = rng(seed);
  const pts: THREE.Vector3[] = [];
  const n = 16;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + (rand() - 0.5) * 0.45;
    pts.push(new THREE.Vector3(Math.cos(a) * r * k, Math.sin(a) * r * k * 0.8, (rand() - 0.5) * r * 0.6));
  }
  return ctx.track(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true, 'centripetal'), 90, tube, 6, true));
}

/** Point-in-polygon test (even–odd rule) for 2D profiles. */
export function inPoly(x: number, y: number, poly: P2[]) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!, [xj, yj] = poly[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
