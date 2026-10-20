import * as THREE from 'three';
import type { SceneContext } from '../viewer3d/types';
import { rng } from '../viewer3d/kit';

/*
 * Shared geometry for the D2.1 division scenes (no default export).
 *
 * A chromatid is drawn as a centromere bead with two arms. Each arm is two capsule segments
 * (proximal + tip) so that a crossover can swap the colour of the tip only. Its pose is
 *   c     centromere position
 *   u     arm axis (arm +1 points along +u, arm −1 along −u)
 *   w     "bend" direction: the arms swing towards w by angle beta (V shapes in anaphase, X splay in prophase)
 *   s     overall scale (0 hides it: used for condensation / decondensation)
 * Poses are plain data so render(index, t) can interpolate between absolute step states.
 */

export type ChromType = 'L' | 'S';
/** Arm segment lengths: [proximal, tip]. Both arms the same length (metacentric, for clarity). */
export const ARM: Record<ChromType, [number, number]> = { L: [0.48, 0.32], S: [0.25, 0.17] };
export const RAD = 0.16;

export interface Pose { c: THREE.Vector3; u: THREE.Vector3; w: THREE.Vector3; beta: number; s: number }
export const pose = (c: [number, number, number], u: [number, number, number], w: [number, number, number], beta: number, s = 1): Pose => ({
  c: new THREE.Vector3(...c),
  u: new THREE.Vector3(...u).normalize(),
  w: new THREE.Vector3(...w).normalize(),
  beta,
  s,
});

/** Interpolate two poses (directions are normalised after the linear blend). */
export function lerpPose(a: Pose, b: Pose, k: number, out?: Pose): Pose {
  const o = out ?? { c: new THREE.Vector3(), u: new THREE.Vector3(), w: new THREE.Vector3(), beta: 0, s: 1 };
  o.c.copy(a.c).lerp(b.c, k);
  o.u.copy(a.u).lerp(b.u, k);
  if (o.u.lengthSq() < 1e-6) o.u.copy(b.u);
  o.u.normalize();
  o.w.copy(a.w).lerp(b.w, k);
  if (o.w.lengthSq() < 1e-6) o.w.copy(b.w);
  o.w.normalize();
  o.beta = a.beta + (b.beta - a.beta) * k;
  o.s = a.s + (b.s - a.s) * k;
  return o;
}

const UP = new THREE.Vector3(0, 1, 0);
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpD = new THREE.Vector3();

/** Place a y-aligned object between a and b (position at the midpoint, rotated to point along a→b). */
export function orient(obj: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3) {
  tmpD.copy(b).sub(a);
  const len = tmpD.length();
  obj.position.copy(a).add(b).multiplyScalar(0.5);
  if (len > 1e-6) obj.quaternion.setFromUnitVectors(UP, tmpD.divideScalar(len));
  return len;
}

export interface Chromatid {
  group: THREE.Group;
  /** [arm][segment] meshes; arm 0 points along +u, arm 1 along −u; segment 0 proximal, 1 tip. */
  segs: THREE.Mesh[][];
  cen: THREE.Mesh;
  type: ChromType;
  /** World-space point where the +u arm's tip segment starts (crossover junction). */
  junction: THREE.Vector3;
  /** World-space tip of the +u arm. */
  tip: THREE.Vector3;
}

export interface ChromKit {
  make(type: ChromType, mat: THREE.Material): Chromatid;
  place(ch: Chromatid, p: Pose): void;
}

/** Builds chromatids from shared, tracked geometries. */
export function chromKit(ctx: SceneContext, cenMat: THREE.Material): ChromKit {
  const geo = {} as Record<string, THREE.BufferGeometry>;
  for (const t of ['L', 'S'] as ChromType[]) {
    ARM[t].forEach((len, k) => (geo[`${t}${k}`] = ctx.track(new THREE.CapsuleGeometry(RAD, len, 6, 12))));
  }
  const cenGeo = ctx.track(new THREE.SphereGeometry(RAD * 1.18, 14, 10));
  const dir = new THREE.Vector3();

  return {
    make(type, mat) {
      const group = new THREE.Group();
      const segs = [0, 1].map(() => [0, 1].map((k) => {
        const m = new THREE.Mesh(geo[`${type}${k}`], mat);
        group.add(m);
        return m;
      }));
      const cen = new THREE.Mesh(cenGeo, cenMat);
      group.add(cen);
      return { group, segs, cen, type, junction: new THREE.Vector3(), tip: new THREE.Vector3() };
    },
    place(ch, p) {
      const [l0, l1] = ARM[ch.type];
      const vis = p.s > 0.02;
      ch.group.visible = vis;
      if (!vis) return;
      const s = p.s;
      ch.cen.position.copy(p.c);
      ch.cen.scale.setScalar(s);
      [1, -1].forEach((k, arm) => {
        dir.copy(p.u).multiplyScalar(k * Math.cos(p.beta)).addScaledVector(p.w, Math.sin(p.beta)).normalize();
        tmpA.copy(p.c);
        tmpB.copy(p.c).addScaledVector(dir, l0 * s);
        const seg0 = ch.segs[arm]![0]!, seg1 = ch.segs[arm]![1]!;
        orient(seg0, tmpA, tmpB);
        seg0.scale.setScalar(s);
        if (arm === 0) ch.junction.copy(tmpB);
        tmpA.copy(tmpB);
        tmpB.addScaledVector(dir, l1 * s);
        orient(seg1, tmpA, tmpB);
        seg1.scale.setScalar(s);
        if (arm === 0) ch.tip.copy(tmpB);
      });
    },
  };
}

/** Set a y-aligned unit cylinder instance so it runs from a to b. */
const mtx = new THREE.Matrix4();
const qq = new THREE.Quaternion();
const sc = new THREE.Vector3();
const mid = new THREE.Vector3();
export function segmentInstance(mesh: THREE.InstancedMesh, i: number, a: THREE.Vector3, b: THREE.Vector3) {
  tmpD.copy(b).sub(a);
  const len = tmpD.length();
  mid.copy(a).add(b).multiplyScalar(0.5);
  if (len > 1e-6) qq.setFromUnitVectors(UP, tmpD.divideScalar(len));
  else qq.identity();
  sc.set(1, Math.max(len, 1e-4), 1);
  mtx.compose(mid, qq, sc);
  mesh.setMatrixAt(i, mtx);
}

/**
 * A cell surface that can divide. With furrow f = 0 it is a sphere of radius R; as f → 1 it becomes
 * two overlapping spheres whose shared circle (the cleavage furrow) shrinks, ending as two
 * near-separate daughter cells along `axis`. Volume is roughly conserved (daughter radius 0.8 R).
 */
export interface DividingCell {
  mesh: THREE.Mesh;
  /** Returns the distance of each daughter centre from the cell centre, and the furrow radius. */
  set(center: THREE.Vector3, axis: THREE.Vector3, R: number, f: number): { s: number; neck: number; r: number };
}
export function dividingCell(ctx: SceneContext, mat: THREE.Material): DividingCell {
  const geo = ctx.track(new THREE.SphereGeometry(1, 56, 36));
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const base = Float32Array.from(pos.array as Float32Array);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 2;
  const d = new THREE.Vector3();
  const perp = new THREE.Vector3();
  const p = new THREE.Vector3();
  return {
    mesh,
    set(center, axis, R, f) {
      const ff = Math.max(0, Math.min(0.985, f));
      const thM = Math.PI / 2 + ff * (Math.PI / 2);
      const r = R * (1 - 0.2 * ff);
      const s = -r * Math.cos(thM);
      for (let i = 0; i < pos.count; i++) {
        d.set(base[3 * i]!, base[3 * i + 1]!, base[3 * i + 2]!).normalize();
        const c = d.dot(axis);
        perp.copy(d).addScaledVector(axis, -c);
        const pl = perp.length();
        if (pl > 1e-6) perp.divideScalar(pl);
        const side = c >= 0 ? 1 : -1;
        const phi = Math.acos(Math.min(1, Math.abs(c))); // 0 at the pole … π/2 at the equator
        const th = (phi / (Math.PI / 2)) * thM;
        p.copy(center).addScaledVector(axis, side * (s + r * Math.cos(th))).addScaledVector(perp, r * Math.sin(th));
        pos.setXYZ(i, p.x, p.y, p.z);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
      geo.computeBoundingSphere();
      return { s, neck: r * Math.sin(thM), r };
    },
  };
}

/**
 * An uncondensed chromatin thread: a random walk out from the centromere in two directions,
 * kept inside a sphere of radius `bound`. A sister copy (offset by `off` along `v`, joined at the
 * centromere) shows a replicated chromosome. Returns tube geometries.
 */
export function chromatinThreads(
  ctx: SceneContext, seed: number, start: THREE.Vector3, steps: number, stepLen: number, bound: number,
  sister: { v: THREE.Vector3; off: number } | null, radius = 0.05,
): THREE.TubeGeometry[] {
  const r = rng(seed);
  const walk = (dirSeed: THREE.Vector3) => {
    const pts: THREE.Vector3[] = [];
    let p = start.clone();
    let dir = dirSeed.clone().normalize();
    for (let i = 0; i < steps; i++) {
      dir.add(new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(1.6)).normalize();
      let q = p.clone().addScaledVector(dir, stepLen);
      if (q.length() > bound) { dir.addScaledVector(q.clone().normalize(), -1.4).normalize(); q = p.clone().addScaledVector(dir, stepLen); }
      if (q.length() > bound) q.setLength(bound);
      pts.push(q);
      p = q;
    }
    return pts;
  };
  const d0 = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5);
  const a = walk(d0), b = walk(d0.clone().negate());
  const pts = [...b.reverse(), start.clone(), ...a];
  const mid = b.length;
  const mk = (ps: THREE.Vector3[]) => ctx.track(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ps), steps * 10, radius, 5, false));
  const out = [mk(pts)];
  if (sister) {
    out.push(mk(pts.map((q, j) => q.clone().addScaledVector(sister.v, sister.off * Math.min(1, Math.abs(j - mid) / 2)))));
  }
  return out;
}

/** Reveal the first fraction u of a tube geometry (used to show DNA replication progressing). */
export function revealTube(g: THREE.TubeGeometry, u: number) {
  const total = g.index ? g.index.count : 0;
  const tri = g.parameters.radialSegments * 6;
  g.setDrawRange(0, Math.round((total / tri) * Math.max(0, Math.min(1, u))) * tri);
}

/** Fade a transparent material (and stop it writing depth when faint). */
export function fade(mat: THREE.Material, opacity: number, base = 1) {
  const m = mat as THREE.MeshStandardMaterial;
  m.opacity = opacity * base;
  m.visible = opacity > 0.01;
  m.depthWrite = opacity * base > 0.6;
}

/** The actin–myosin contractile ring: a torus in the plane x = 0 whose radius can be set without thickening it. */
export function contractileRing(ctx: SceneContext, mat: THREE.Material, tube = 0.09) {
  const geo = ctx.track(new THREE.TorusGeometry(1, tube, 8, 64));
  geo.rotateY(Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const base = Float32Array.from(pos.array as Float32Array);
  const mesh = new THREE.Mesh(geo, mat);
  const c = new THREE.Vector2();
  return {
    mesh,
    set(radius: number) {
      for (let i = 0; i < pos.count; i++) {
        const x = base[3 * i]!, y = base[3 * i + 1]!, z = base[3 * i + 2]!;
        c.set(y, z).normalize();
        pos.setXYZ(i, x, y - c.x + c.x * radius, z - c.y + c.y * radius);
      }
      pos.needsUpdate = true;
      geo.computeBoundingSphere();
    },
  };
}

/**
 * Make label-occlusion raycasts ignore what the reader cannot see: hidden objects and hidden or
 * see-through materials (translucent membranes, faded envelopes). Call once at the end of build().
 */
export function honestRaycast(root: THREE.Object3D) {
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const original = o.raycast.bind(o);
    o.raycast = (rc, hits) => {
      for (let n: THREE.Object3D | null = o; n; n = n.parent) if (!n.visible) return;
      const m = (Array.isArray(o.material) ? o.material[0] : o.material) as THREE.Material | undefined;
      if (!m || !m.visible || (m.transparent && m.opacity < 0.5)) return;
      original(rc, hits);
    };
  });
}
