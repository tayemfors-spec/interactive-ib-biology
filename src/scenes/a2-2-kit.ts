import * as THREE from 'three';
import type { SceneContext } from '../viewer3d/types';
import { rng } from '../viewer3d/kit';

/*
 * Geometry helpers shared by the A2.2 cut-away cell scenes (not a scene module itself).
 *
 * Every cell is cut through by the plane z = 0 and only the half behind it (z ≤ 0) is drawn, so the
 * reader looks into the cell from the +z side. Organelles that cross the cut plane are cut too (their
 * inside and double membranes show at the cut face); organelles behind it are drawn whole.
 */

const V2 = THREE.Vector2;
const EPS = 1e-3;
export type Profile = THREE.Vector2[];

/** Half of an ellipse, from the bottom pole to the top pole (x = radius, y = height). */
export function ellipseProfile(rx: number, ry: number, n = 28): Profile {
  const pts: Profile = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI;
    pts.push(new V2(Math.max(EPS, rx * Math.sin(t)), -ry * Math.cos(t)));
  }
  return pts;
}

/** A capsule standing on the y axis: total length `len`, radius `r`. */
export function capsuleProfile(r: number, len: number, n = 12): Profile {
  const h = Math.max(0, len / 2 - r);
  const pts: Profile = [];
  for (let i = 0; i <= n; i++) { const t = (i / n) * (Math.PI / 2); pts.push(new V2(Math.max(EPS, r * Math.sin(t)), -h - r * Math.cos(t))); }
  for (let i = 0; i <= n; i++) { const t = (i / n) * (Math.PI / 2); pts.push(new V2(Math.max(EPS, r * Math.cos(t)), h + r * Math.sin(t))); }
  return pts;
}

/** A rounded box outline (half-width w, half-height h, corner radius c) for boxy vacuoles. */
export function roundedProfile(w: number, h: number, c: number, n = 8): Profile {
  const pts: Profile = [new V2(EPS, -h)];
  for (let i = 0; i <= n; i++) { const t = -Math.PI / 2 + (i / n) * (Math.PI / 2); pts.push(new V2(w - c + c * Math.cos(t), -h + c + c * Math.sin(t))); }
  for (let i = 0; i <= n; i++) { const t = (i / n) * (Math.PI / 2); pts.push(new V2(w - c + c * Math.cos(t), h - c + c * Math.sin(t))); }
  pts.push(new V2(EPS, h));
  return pts;
}

/** An open-ended tube with a domed tip: straight from y0 to y1, then a hemisphere (hyphae). */
export function tipTubeProfile(r: number, y0: number, y1: number, n = 12): Profile {
  const pts: Profile = [new V2(r, y0), new V2(r, (y0 + y1) / 2)];
  for (let i = 0; i <= n; i++) { const t = (i / n) * (Math.PI / 2); pts.push(new V2(Math.max(EPS, r * Math.cos(t)), y1 + r * Math.sin(t))); }
  return pts;
}

export const scaleProfile = (p: Profile, k: number, ky = k) => p.map((v) => new V2(v.x * k, v.y * ky));
const closedProfile = (p: Profile) => p[0]!.x < 0.01 && p[p.length - 1]!.x < 0.01;

export interface Place { axis?: 'x' | 'y'; zScale?: number; at?: [number, number, number]; rotZ?: number }

/** Apply the standard orientation to a geometry built about the y axis. */
function orient<T extends THREE.BufferGeometry>(g: T, o: Place, scaleZ = true): T {
  if (scaleZ && o.zScale && o.zScale !== 1) g.scale(1, 1, o.zScale);
  if (o.axis === 'x') g.rotateZ(-Math.PI / 2);
  if (o.rotZ) g.rotateZ(o.rotZ);
  if (o.at) g.translate(...o.at);
  return g;
}

/** The back half (z ≤ 0) of a surface of revolution. */
export function halfShell(ctx: SceneContext, profile: Profile, o: Place = {}, segments = 40) {
  return ctx.track(orient(new THREE.LatheGeometry(profile, segments, Math.PI / 2, Math.PI), o));
}

/** A full (uncut) surface of revolution, for organelles that lie wholly behind the cut. */
export function fullShell(ctx: SceneContext, profile: Profile, o: Place = {}, segments = 32) {
  return ctx.track(orient(new THREE.LatheGeometry(profile, segments), o));
}

/** The outline where a half shell meets the cut plane, as a tube (shows each membrane edge-on). */
export function rim(ctx: SceneContext, profile: Profile, radius: number, mat: THREE.Material, o: Place = {}): THREE.Group {
  const g = new THREE.Group();
  const right = profile.map((p) => new THREE.Vector3(p.x, p.y, 0));
  const left = profile.map((p) => new THREE.Vector3(-p.x, p.y, 0));
  const curves: { pts: THREE.Vector3[]; closed: boolean }[] = closedProfile(profile)
    ? [{ pts: [...right.slice(0, -1), ...left.slice(1).reverse()], closed: true }]
    : [{ pts: right, closed: false }, { pts: left, closed: false }];
  for (const c of curves) {
    const curve = new THREE.CatmullRomCurve3(c.pts, c.closed, 'catmullrom', 0.1);
    const geo = ctx.track(orient(new THREE.TubeGeometry(curve, c.pts.length * 3, radius, 6, c.closed), o, false));
    g.add(new THREE.Mesh(geo, mat));
  }
  return g;
}

/** The flat cut face between two nested profiles (e.g. the thickness of a cell wall). */
export function band(ctx: SceneContext, outer: Profile, inner: Profile, mat: THREE.Material, o: Place = {}): THREE.Group {
  const g = new THREE.Group();
  const add = (shape: THREE.Shape) => g.add(new THREE.Mesh(ctx.track(orient(new THREE.ShapeGeometry(shape, 4), o, false)), mat));
  if (closedProfile(outer) && closedProfile(inner)) {
    const ring = (p: Profile) => [...p.slice(0, -1), ...p.slice(1).reverse().map((v) => new V2(-v.x, v.y))];
    const s = new THREE.Shape(ring(outer));
    s.holes.push(new THREE.Path(ring(inner).reverse()));
    add(s);
  } else {
    for (const sign of [1, -1]) {
      const pts = [...outer.map((v) => new V2(sign * v.x, v.y)), ...inner.slice().reverse().map((v) => new V2(sign * v.x, v.y))];
      add(new THREE.Shape(pts));
    }
  }
  return g;
}

/** A closed, tangled loop (circular DNA): a smooth tube through random points in a box. */
export function loopTube(ctx: SceneContext, seed: number, n: number, size: [number, number, number], centre: [number, number, number], radius: number) {
  const rand = rng(seed);
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < n; i++) {
    // walk round an ellipse with random wobble so the loop is tangled but closed
    const a = (i / n) * Math.PI * 2;
    const k = 0.35 + rand() * 0.65;
    pts.push(new THREE.Vector3(
      centre[0] + size[0] * (Math.cos(a) * k + (rand() - 0.5) * 0.5),
      centre[1] + size[1] * (Math.sin(a * 2) * 0.5 + (rand() - 0.5) * 1.1),
      centre[2] + size[2] * (rand() - 0.5),
    ));
  }
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  return { geometry: ctx.track(new THREE.TubeGeometry(curve, n * 12, radius, 6, true)), curve };
}

/** A small closed ring (plasmid) lying roughly in a plane facing the camera. */
export function ringTube(ctx: SceneContext, r: number, tube: number, wobble = 0.12, seed = 3) {
  const rand = rng(seed);
  const pts: THREE.Vector3[] = [];
  const n = 14;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + (rand() - 0.5) * wobble * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * r * k, Math.sin(a) * r * k, (rand() - 0.5) * r * 0.5));
  }
  return ctx.track(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true, 'centripetal'), 70, tube, 6, true));
}

/** A smooth open tube through the given points (tubules, microtubules, flagella). */
export function pathTube(ctx: SceneContext, pts: [number, number, number][], radius: number, segments = 48) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, 'centripetal');
  return ctx.track(new THREE.TubeGeometry(curve, segments, radius, 6, false));
}

// ---------- organelles ----------

export interface Mats {
  envelope: THREE.Material;
  dark?: THREE.Material;
  inner?: THREE.Material;
}

/**
 * A nucleus cut through the middle: outer and inner membranes (the nuclear envelope) with a gap,
 * nuclear pores where the two membranes meet, a nucleolus and threads of chromatin.
 */
export function cutNucleus(ctx: SceneContext, r: number, m: { envelope: THREE.Material; pore: THREE.Material; nucleolus: THREE.Material; chromatin: THREE.Material }, seed = 5) {
  const g = new THREE.Group();
  const outerP = ellipseProfile(r, r * 0.92);
  const innerP = ellipseProfile(r * 0.93, r * 0.85);
  const envelope = new THREE.Group();
  envelope.add(new THREE.Mesh(halfShell(ctx, outerP), m.envelope), new THREE.Mesh(halfShell(ctx, innerP), m.envelope));
  envelope.add(rim(ctx, outerP, r * 0.025, m.envelope), rim(ctx, innerP, r * 0.025, m.envelope));
  g.add(envelope);

  // Nuclear pores: where the outer and inner membranes join. Each is drawn as a dark ring on the outer
  // surface and on the inner surface, at the same place; some sit on the cut edge.
  const pores = new THREE.Group();
  const poreGeo = ctx.track(new THREE.TorusGeometry(r * 0.085, r * 0.03, 6, 16));
  const rand = rng(seed);
  const dirs: THREE.Vector3[] = [];
  for (const a of [0.45, 1.35, 2.3, 3.4, 4.3, 5.4]) dirs.push(new THREE.Vector3(Math.cos(a), Math.sin(a), -0.13).normalize()); // along the cut edge
  for (let i = 0; i < 18; i++) dirs.push(new THREE.Vector3(rand() * 2 - 1, rand() * 2 - 1, -0.3 - rand() * 0.9).normalize());
  const zAxis = new THREE.Vector3(0, 0, 1);
  for (const u of dirs) {
    for (const [kx, ky] of [[1.0, 0.92], [0.93, 0.85]] as const) {
      const ring = new THREE.Mesh(poreGeo, m.pore);
      ring.position.set(u.x * r * kx, u.y * r * ky, u.z * r * kx);
      ring.quaternion.setFromUnitVectors(zAxis, u);
      pores.add(ring);
    }
  }
  g.add(pores);

  const nucleolus = new THREE.Mesh(ctx.track(new THREE.SphereGeometry(r * 0.3, 24, 16)), m.nucleolus);
  nucleolus.position.set(-r * 0.15, r * 0.12, -r * 0.42);
  g.add(nucleolus);

  const chromatin = new THREE.Group();
  for (let k = 0; k < 4; k++) {
    const pts: [number, number, number][] = [];
    for (let i = 0; i < 7; i++) {
      const a = rand() * Math.PI * 2;
      const rr = r * (0.25 + rand() * 0.5);
      pts.push([Math.cos(a) * rr, Math.sin(a) * rr * 0.85, -r * (0.15 + rand() * 0.55)]);
    }
    chromatin.add(new THREE.Mesh(pathTube(ctx, pts, r * 0.022, 60), m.chromatin));
  }
  g.add(chromatin);
  return { group: g, envelope, pores, nucleolus, chromatin, firstPore: pores.children[2]!.position.clone() };
}

/**
 * A mitochondrion cut lengthways (long axis along x): outer membrane, inner membrane with cristae
 * (infoldings that alternate from the top and bottom), and the matrix inside.
 */
export function cutMitochondrion(ctx: SceneContext, len: number, r: number, mat: THREE.Material, cristaMat: THREE.Material, cut = true) {
  const g = new THREE.Group();
  const outerP = capsuleProfile(r, len);
  const innerP = capsuleProfile(r * 0.84, len - r * 0.32);
  const o: Place = { axis: 'x' };
  if (!cut) {
    g.add(new THREE.Mesh(fullShell(ctx, outerP, o, 20), mat));
    return { group: g, cristae: g };
  }
  g.add(new THREE.Mesh(halfShell(ctx, outerP, o, 20), mat), new THREE.Mesh(halfShell(ctx, innerP, o, 20), cristaMat));
  g.add(rim(ctx, outerP, r * 0.05, mat, o), rim(ctx, innerP, r * 0.05, cristaMat, o));
  const R = r * 0.84;
  const cristae = new THREE.Group();
  const straight = len / 2 - r;
  const n = Math.max(2, Math.round((straight * 2) / (r * 0.55)));
  for (let i = 0; i < n; i++) {
    const x = -straight + ((i + 0.5) / n) * straight * 2;
    const top = i % 2 === 0;
    const h = R * 1.15;
    const v0 = R - h; // the crista reaches from the wall to v0
    const s = new THREE.Shape();
    s.moveTo(0, v0);
    s.lineTo(0, R);
    s.absarc(0, 0, R, Math.PI / 2, Math.PI - Math.asin(Math.max(-1, Math.min(1, v0 / R))), false);
    s.lineTo(0, v0);
    const geo = new THREE.ExtrudeGeometry(s, { depth: r * 0.09, bevelEnabled: false, curveSegments: 10 });
    geo.translate(0, 0, -r * 0.045);
    geo.rotateY(-Math.PI / 2);
    if (!top) geo.scale(1, -1, 1);
    geo.translate(x, 0, 0);
    cristae.add(new THREE.Mesh(ctx.track(geo), cristaMat));
  }
  g.add(cristae);
  return { group: g, cristae };
}

/**
 * A chloroplast: a lens/disc shape (long radius rx along x, thickness radius ry along y, depth radius
 * zr along z). When cut, it shows a double membrane (envelope) around the stroma, grana (stacks of
 * disc-shaped thylakoids, cut at the face and whole further back) linked by single intergranal
 * lamellae, and a starch grain.
 */
export function cutChloroplast(ctx: SceneContext, rx: number, ry: number, m: { envelope: THREE.Material; thylakoid: THREE.Material; starch: THREE.Material; stroma?: THREE.Material }, cut = true, zr = rx * 0.8) {
  const g = new THREE.Group();
  const outerP = ellipseProfile(ry, rx);
  const o: Place = { axis: 'x', zScale: zr / ry };
  if (!cut) {
    g.add(new THREE.Mesh(fullShell(ctx, outerP, o, 24), m.envelope));
    return { group: g, grana: g, starch: g };
  }
  const k = 0.86;
  const innerP = ellipseProfile(ry * k, rx * 0.95);
  g.add(new THREE.Mesh(halfShell(ctx, outerP, o, 28), m.envelope), new THREE.Mesh(halfShell(ctx, innerP, { ...o, zScale: (zr * 0.93) / (ry * k) }, 28), m.stroma ?? m.envelope));
  g.add(rim(ctx, outerP, ry * 0.035, m.envelope, o), rim(ctx, innerP, ry * 0.035, m.envelope, o));
  const grana = new THREE.Group();
  const discR = rx * 0.12;
  const discH = ry * 0.075;
  const gap = ry * 0.05;
  const halfDisc = ctx.track(new THREE.CylinderGeometry(discR, discR, discH, 18, 1, false, Math.PI / 2, Math.PI));
  const fullDisc = ctx.track(new THREE.CylinderGeometry(discR, discR, discH, 18));
  const iRx = rx * 0.95, iRy = ry * k, iRz = zr * 0.93;
  /** Add one granum at (x, yOff, z); its height is limited by the inner membrane there. */
  const stack = (x: number, yOff: number, z: number, half: boolean) => {
    const f = 1 - (x / iRx) ** 2 - (z / iRz) ** 2;
    if (f <= 0.05) return null;
    const halfH = iRy * Math.sqrt(f) - discH;
    const count = Math.max(2, Math.min(7, Math.floor((halfH * 2 * 0.75) / (discH + gap))));
    const y0 = yOff - ((count - 1) * (discH + gap)) / 2;
    for (let i = 0; i < count; i++) {
      const d = new THREE.Mesh(half ? halfDisc : fullDisc, m.thylakoid);
      d.position.set(x, y0 + i * (discH + gap), z);
      grana.add(d);
    }
    return y0;
  };
  const xs = [-0.62, -0.21, 0.21, 0.62].map((f) => f * rx);
  const yOff = [0.1, -0.15, 0.12, -0.08].map((f) => f * ry);
  const bases = xs.map((x, i) => stack(x, yOff[i]!, 0, true));
  xs.forEach((x, i) => {
    if (i === xs.length - 1) return;
    const nx = xs[i + 1]!;
    const b0 = bases[i], b1 = bases[i + 1];
    if (b0 == null || b1 == null) return;
    // intergranal lamella: a single thylakoid joining neighbouring grana
    const y0 = b0 + discH + gap, y1 = b1 + discH + gap;
    const lam = new THREE.Mesh(ctx.track(new THREE.BoxGeometry(Math.hypot(nx - x, y1 - y0), discH * 0.55, discR * 0.9)), m.thylakoid);
    lam.position.set((x + nx) / 2, (y0 + y1) / 2, -discR * 0.45);
    lam.rotation.z = Math.atan2(y1 - y0, nx - x);
    grana.add(lam);
  });
  // a second row of whole grana further back inside the chloroplast
  [-0.42, 0, 0.42].forEach((f, i) => stack(f * rx, (i % 2 ? 0.1 : -0.1) * ry, -iRz * 0.5, false));
  g.add(grana);
  const starch = new THREE.Mesh(ctx.track(new THREE.SphereGeometry(1, 16, 10).scale(rx * 0.16, ry * 0.17, rx * 0.16)), m.starch);
  starch.position.set(rx * 0.02, -ry * 0.55, -rx * 0.2);
  g.add(starch);
  return { group: g, grana, starch };
}

/**
 * A Golgi apparatus: a stack of parallel, curved, flattened cisternae (concentric arcs, so they never
 * touch) with vesicles budding from their rims. The stack is centred on the group origin.
 */
export function golgi(ctx: SceneContext, size: number, mat: THREE.Material, vesicleMat: THREE.Material, vesicles = 8) {
  const g = new THREE.Group();
  const stack = new THREE.Group();
  const n = 5;
  const radii: number[] = [];
  const arcs: number[] = [];
  for (let i = 0; i < n; i++) {
    const R = size * (1.0 + i * 0.2);
    const arc = 1.45 - i * 0.13;
    radii.push(R); arcs.push(arc);
    const geo = new THREE.TorusGeometry(R, size * 0.055, 10, 36, arc);
    geo.rotateZ(Math.PI * 1.5 - arc / 2); // arc centred on the bottom of its circle (a shallow ∪)
    geo.scale(1, 1, 9);
    stack.add(new THREE.Mesh(ctx.track(geo), mat));
  }
  const shift = size * 1.35;
  stack.position.y = shift;
  g.add(stack);
  const vg = new THREE.Group();
  const vGeo = ctx.track(new THREE.SphereGeometry(size * 0.12, 12, 8));
  const rand = rng(17);
  for (let i = 0; i < vesicles; i++) {
    const side = i % 2 ? 1 : -1;
    const k = i % n;
    const a = arcs[k]! / 2 + 0.16 + rand() * 0.12;
    const R = radii[k]!;
    const v = new THREE.Mesh(vGeo, vesicleMat);
    v.position.set(side * R * Math.sin(a), shift - R * Math.cos(a), (rand() - 0.5) * size * 0.6);
    vg.add(v);
  }
  g.add(vg);
  return { group: g, stack, vesicles: vg };
}

/** Rough ER cisterna: a flattened sac studded with ribosomes on its outer (cytoplasmic) surface. */
export function roughER(ctx: SceneContext, sheets: { at: [number, number, number]; size: [number, number, number]; rot?: number }[], mat: THREE.Material, riboMat: THREE.Material, seed = 9) {
  const g = new THREE.Group();
  const sheetGroup = new THREE.Group();
  const rand = rng(seed);
  const unit = ctx.track(new THREE.SphereGeometry(1, 32, 12));
  const perSheet = 70;
  const ribo = new THREE.InstancedMesh(ctx.track(new THREE.SphereGeometry(0.075, 8, 6)), riboMat, sheets.length * perSheet);
  let n = 0;
  const m4 = new THREE.Matrix4();
  for (const s of sheets) {
    const mesh = new THREE.Mesh(unit, mat);
    mesh.scale.set(...s.size);
    mesh.position.set(...s.at);
    mesh.rotation.z = s.rot ?? 0;
    sheetGroup.add(mesh);
    mesh.updateMatrix();
    for (let i = 0; i < perSheet; i++) {
      // random point on the ellipsoid surface, skipping the thin rim
      const u = rand() * Math.PI * 2;
      const vv = Math.acos(rand() * 2 - 1);
      const p = new THREE.Vector3(Math.sin(vv) * Math.cos(u), Math.cos(vv), Math.sin(vv) * Math.sin(u));
      if (Math.abs(p.y) < 0.25) { i--; continue; }
      p.multiplyScalar(1.0).applyMatrix4(mesh.matrix);
      // push the ribosome just outside the membrane surface
      const out = p.clone().sub(mesh.position).normalize().multiplyScalar(0.06);
      m4.makeTranslation(p.x + out.x, p.y + out.y, p.z + out.z);
      ribo.setMatrixAt(n++, m4);
    }
  }
  ribo.count = n;
  ribo.instanceMatrix.needsUpdate = true;
  g.add(sheetGroup, ribo);
  return { group: g, sheets: sheetGroup, ribosomes: ribo };
}

/** Scatter `count` small spheres inside a test region, avoiding exclusion spheres. */
export function scatter(rand: () => number, count: number, inside: (p: THREE.Vector3) => boolean, box: [THREE.Vector3, THREE.Vector3], avoid: { c: THREE.Vector3; r: number }[]) {
  const out: THREE.Vector3[] = [];
  let guard = 0;
  while (out.length < count && guard++ < count * 60) {
    const p = new THREE.Vector3(
      box[0].x + rand() * (box[1].x - box[0].x),
      box[0].y + rand() * (box[1].y - box[0].y),
      box[0].z + rand() * (box[1].z - box[0].z),
    );
    if (!inside(p)) continue;
    if (avoid.some((a) => p.distanceTo(a.c) < a.r)) continue;
    out.push(p);
  }
  return out;
}

export function instanced(geo: THREE.BufferGeometry, mat: THREE.Material, pts: THREE.Vector3[]) {
  const im = new THREE.InstancedMesh(geo, mat, Math.max(1, pts.length));
  const m4 = new THREE.Matrix4();
  pts.forEach((p, i) => { m4.makeTranslation(p.x, p.y, p.z); im.setMatrixAt(i, m4); });
  im.count = pts.length;
  im.instanceMatrix.needsUpdate = true;
  return im;
}

export const DS = THREE.DoubleSide;
