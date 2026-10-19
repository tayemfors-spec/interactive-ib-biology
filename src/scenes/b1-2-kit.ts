import * as THREE from 'three';
import type { PaletteKey, SceneContext } from '../viewer3d/types';
import { setInstance } from '../viewer3d/kit';

/*
 * Geometry helpers shared by the B1.2 protein scenes (not a scene module itself). Units are ångströms.
 *
 * Backbones are built from ideal bond lengths and angles with the NeRF method (each atom placed from
 * the three before it by bond length, bond angle and torsion angle), so the secondary structures are
 * real geometry rather than drawings:
 *  - α-helix: φ = −57.8°, ψ = −47°  → right-handed, 3.6 residues per turn, 1.5 Å rise per residue,
 *    and the C=O of residue i points at the N–H of residue i + 4 (O···H ≈ 2.0 Å).
 *  - β-strand: φ = −139°, ψ = +136.5° → a flat (two-fold) pleated strand.
 * The R-group direction is the ideal Cβ position computed from N, Cα and C, which gives the
 * L-configuration found in proteins.
 */

export type V3 = THREE.Vector3;
export const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const DEG = Math.PI / 180;

/** One residue: backbone atoms, the carbonyl O, the amide H and the centre of the R-group bead. */
export interface Res { N: V3; CA: V3; C: V3; O: V3; H: V3; R: V3 }
export type Backbone = Pick<Res, 'N' | 'CA' | 'C'>;

export const HELIX = { phi: -57.8, psi: -47 };
export const STRAND = { phi: -139, psi: 136.5 };
export const R_REACH = 2.4; // Cα → R-group bead centre

/** Place atom d bonded to c, with |cd| = bond, angle b–c–d = ang and torsion a–b–c–d = tor (degrees). */
export function nerf(a: V3, b: V3, c: V3, bond: number, ang: number, tor: number): V3 {
  const bc = c.clone().sub(b).normalize();
  const n = new THREE.Vector3().crossVectors(b.clone().sub(a), bc).normalize();
  const m = new THREE.Vector3().crossVectors(n, bc);
  const x = -bond * Math.cos(ang * DEG);
  const y = bond * Math.sin(ang * DEG) * Math.cos(tor * DEG);
  const z = bond * Math.sin(ang * DEG) * Math.sin(tor * DEG);
  return c.clone().addScaledVector(bc, x).addScaledVector(m, y).addScaledVector(n, z);
}

/** Torsion angle a–b–c–d in degrees. */
export function torsion(a: V3, b: V3, c: V3, d: V3): number {
  const b0 = a.clone().sub(b);
  const b1 = c.clone().sub(b).normalize();
  const b2 = d.clone().sub(c);
  const v = b0.sub(b1.clone().multiplyScalar(b0.dot(b1)));
  const w = b2.sub(b1.clone().multiplyScalar(b2.dot(b1)));
  return Math.atan2(new THREE.Vector3().crossVectors(b1, v).dot(w), v.dot(w)) / DEG;
}

/** Backbone N, Cα, C for n residues with constant φ/ψ (trans peptide bonds, ω = 180°). */
export function regularBackbone(n: number, phi: number, psi: number): Backbone[] {
  const out: Backbone[] = [];
  let N = v3(0, 0, 0);
  let CA = v3(1.458, 0, 0);
  let C = nerf(v3(0, 1, 0), N, CA, 1.525, 111.2, -60);
  for (let i = 0; i < n; i++) {
    if (i > 0) {
      const p = out[i - 1]!;
      N = nerf(p.N, p.CA, p.C, 1.329, 116.2, psi);
      CA = nerf(p.CA, p.C, N, 1.458, 121.7, 180);
      C = nerf(p.C, N, CA, 1.525, 111.2, phi);
    }
    out.push({ N, CA, C });
  }
  return out;
}

/** Ideal Cβ direction (unit vector from Cα) for an L-amino acid. */
export function cbDir(r: Backbone): V3 {
  const b = r.CA.clone().sub(r.N);
  const c = r.C.clone().sub(r.CA);
  const a = new THREE.Vector3().crossVectors(b, c);
  return a.multiplyScalar(-0.58273431).addScaledVector(b, 0.56802827).addScaledVector(c, -0.54067466).normalize();
}

/**
 * Add the carbonyl O, amide H and R-group bead to a whole chain. O and H lie in the peptide plane
 * (bisecting the external angle at C and N), so O and H of one peptide bond are trans to each other.
 */
export function finish(chain: Backbone[]): Res[] {
  return chain.map((r, i) => {
    const next = chain[i + 1];
    const prev = chain[i - 1];
    const O = next
      ? r.C.clone().add(r.C.clone().sub(r.CA).normalize().add(r.C.clone().sub(next.N).normalize()).normalize().multiplyScalar(1.231))
      : nerf(r.N, r.CA, r.C, 1.231, 120.5, 180 + STRAND.psi);
    const H = prev
      ? r.N.clone().add(r.N.clone().sub(prev.C).normalize().add(r.N.clone().sub(r.CA).normalize()).normalize().multiplyScalar(1.01))
      : nerf(r.C, r.CA, r.N, 1.01, 119, 180 + STRAND.phi);
    return { ...r, O, H, R: r.CA.clone().addScaledVector(cbDir(r), R_REACH) };
  });
}

/**
 * Backbone along a smooth path (for loops, termini and the unfolded chain). Cα atoms sit on the curve,
 * N and C either side of it, zig-zagging about the side vector `side` so the chain looks extended.
 */
export function pathBackbone(points: V3[], n: number, side: V3): Backbone[] {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const out: Backbone[] = [];
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0.5 : i / (n - 1);
    const p = curve.getPointAt(u);
    const t = curve.getTangentAt(u);
    const w = side.clone().sub(t.clone().multiplyScalar(side.dot(t))).normalize();
    const s = i % 2 === 0 ? 1 : -1;
    const CA = p.clone().addScaledVector(w, 0.45 * s);
    out.push({ N: p.clone().addScaledVector(t, -1.3).addScaledVector(w, -0.35 * s), CA, C: p.clone().addScaledVector(t, 1.3).addScaledVector(w, -0.35 * s) });
  }
  return out;
}

export const mapBackbone = (chain: Backbone[], m: THREE.Matrix4): Backbone[] =>
  chain.map((r) => ({ N: r.N.clone().applyMatrix4(m), CA: r.CA.clone().applyMatrix4(m), C: r.C.clone().applyMatrix4(m) }));

/** Matrix taking a local frame (origin o, unit axes x, y, z) to world. */
export const frame = (o: V3, x: V3, y: V3, z: V3) => new THREE.Matrix4().makeBasis(x, y, z).setPosition(o);

/** Axis (unit) and centre of an ideal α-helix backbone. */
export function helixAxis(chain: Backbone[]) {
  const centre = new THREE.Vector3();
  for (const r of chain) centre.add(r.CA);
  centre.divideScalar(chain.length);
  // the mean of 4 consecutive Cα (≈ one turn) lies close to the axis
  const mean = (k: number) => chain.slice(k, k + 4).reduce((s, r) => s.add(r.CA), new THREE.Vector3()).divideScalar(4);
  const axis = mean(chain.length - 4).sub(mean(0)).normalize();
  return { axis, centre };
}

// ---------- drawing ----------

/** Instanced spheres and sticks for ball-and-stick models; counts reset each frame for absolute rendering. */
export function ballStick(ctx: SceneContext, root: THREE.Object3D, cap: number) {
  const sphere = ctx.track(new THREE.SphereGeometry(1, 18, 12));
  const cyl = ctx.track(new THREE.CylinderGeometry(1, 1, 1, 8));
  const pool = new Map<string, THREE.InstancedMesh>();
  const mesh = (name: string, kind: 'ball' | 'stick', key: PaletteKey, n = cap, opts: THREE.MeshStandardMaterialParameters = {}): THREE.InstancedMesh => {
    const m = new THREE.InstancedMesh(kind === 'ball' ? sphere : cyl, ctx.material(key, { roughness: 0.45, ...opts }), n);
    m.count = 0;
    m.frustumCulled = false;
    m.name = name;
    root.add(m);
    pool.set(name, m);
    return m;
  };
  const Y = new THREE.Vector3(0, 1, 0);
  const q = new THREE.Quaternion();
  const mtx = new THREE.Matrix4();
  const sv = new THREE.Vector3();
  const mid = new THREE.Vector3();
  const d = new THREE.Vector3();
  const ball = (m: THREE.InstancedMesh, p: V3, r: number) => setInstance(m, m.count++, p, undefined, r);
  const stick = (m: THREE.InstancedMesh, a: V3, b: V3, r: number) => {
    d.copy(b).sub(a);
    const l = d.length();
    if (l < 1e-6) return;
    q.setFromUnitVectors(Y, d.divideScalar(l));
    sv.set(r, l, r);
    mtx.compose(mid.copy(a).add(b).multiplyScalar(0.5), q, sv);
    m.setMatrixAt(m.count++, mtx);
  };
  /** A dashed line of `n` dashes from a to b (hydrogen bonds, ionic bonds). */
  const dashes = (m: THREE.InstancedMesh, a: V3, b: V3, r: number, n = 3) => {
    const e = new THREE.Vector3();
    const f = new THREE.Vector3();
    for (let k = 0; k < n; k++) {
      const u0 = (k + 0.18) / n;
      const u1 = (k + 0.82) / n;
      stick(m, e.copy(a).lerp(b, u0), f.copy(a).lerp(b, u1), r);
    }
  };
  const begin = () => { for (const m of pool.values()) m.count = 0; };
  const end = () => { for (const m of pool.values()) { m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); } };
  return { mesh, ball, stick, dashes, begin, end, pool };
}

/** Somewhere no camera will look: moving an anchor here hides its label for steps it doesn't apply to. */
export const OFFSTAGE = new THREE.Vector3(0, 1e5, 0);

// ---------- the folding model used by the "levels of structure" scene ----------

export type RClass = 'hydrophobic' | 'polar' | 'acidic' | 'basic' | 'cys';
export interface Segment { kind: 'coil' | 'helix' | 'strand' | 'turn'; from: number; to: number } // residue indices, inclusive

const D_SHEET = 4.3; // axis-to-axis distance between neighbouring antiparallel strands (Å)
const SHIFT = 0.65; // offset of the pairing axis along the strand (Å), from an O···H optimisation
const HELIX_H = 9.6; // helix axis above the sheet's mid-plane in the folded protein (Å)
export const LEVELS = { nTerm: 2, helix: 14, loop: 5, strand: 6, turn: 2, cTerm: 2 };

/**
 * Three states of one 45-residue polypeptide: [0] primary (unfolded chain laid out in rows),
 * [1] secondary (helix and three-stranded antiparallel sheet formed but not packed),
 * [2] tertiary (helix packed on the sheet with hydrophobic R groups between them).
 * The R-group classes are chosen so the sequence is consistent with the fold: residues whose R groups
 * point into the space between helix and sheet are hydrophobic.
 */
export function levelsModel() {
  const L = LEVELS;
  const seg: Segment[] = [];
  let k = 0;
  const push = (kind: Segment['kind'], n: number) => { seg.push({ kind, from: k, to: k + n - 1 }); k += n; };
  push('coil', L.nTerm); push('helix', L.helix); push('coil', L.loop);
  push('strand', L.strand); push('turn', L.turn); push('strand', L.strand); push('turn', L.turn); push('strand', L.strand);
  push('coil', L.cTerm);
  const n = k;
  const [, sHelix, sLoop, sA, , sB, , sC] = seg as [Segment, Segment, Segment, Segment, Segment, Segment, Segment, Segment, Segment];
  const inRange = (i: number, s: Segment) => i >= s.from && i <= s.to;
  const isHelix = (i: number) => inRange(i, sHelix);
  const isSheet = (i: number) => [sA, sB, sC].some((s) => inRange(i, s));

  // --- sheet in its own frame: x along strand A, y = sheet normal (R groups up/down), z = across the sheet
  const raw = regularBackbone(L.strand + 2, STRAND.phi, STRAND.psi);
  const t = raw[6]!.CA.clone().sub(raw[0]!.CA).normalize();
  const mid = raw[1]!.CA.clone().add(raw[3]!.CA).multiplyScalar(0.5);
  const p0 = raw[2]!.CA.clone().sub(mid);
  const p = p0.sub(t.clone().multiplyScalar(p0.dot(t))).normalize();
  const q = new THREE.Vector3().crossVectors(t, p);
  const toSheet = new THREE.Matrix4().makeBasis(t, p, q).setPosition(raw[0]!.CA).invert();
  const A = mapBackbone(raw.slice(0, L.strand), toSheet);
  const tk = A[3]!.CA.x + SHIFT;
  const rot = (x: V3) => v3(2 * tk - x.x, x.y, D_SHEET - x.z); // 180° about the y axis through (tk, ·, D/2)
  const B = A.map((r) => ({ N: rot(r.N), CA: rot(r.CA), C: rot(r.C) }));
  const shiftZ = (x: V3) => v3(x.x, x.y, x.z + 2 * D_SHEET);
  const C = A.map((r) => ({ N: shiftZ(r.N), CA: shiftZ(r.CA), C: shiftZ(r.C) }));
  const sheetMid = v3((A[0]!.CA.x + A[L.strand - 1]!.CA.x) / 2, -0.78, D_SHEET);

  // --- helix: ideal geometry, axis turned to +x and centred on the origin
  const hraw = regularBackbone(L.helix, HELIX.phi, HELIX.psi);
  const { axis, centre } = helixAxis(hraw);
  const ref = v3(0, 0, 1).sub(axis.clone().multiplyScalar(axis.z)).normalize();
  const hBasis = new THREE.Matrix4().makeBasis(axis, ref, new THREE.Vector3().crossVectors(axis, ref)).setPosition(centre).invert();
  const helixLocal = mapBackbone(hraw, hBasis);
  // in sheet coordinates: runs along −x (back towards strand A's first residue), above strand B
  const placeHelix = (lift: number, spin: number) => {
    const m = new THREE.Matrix4().makeTranslation(sheetMid.x - 0.5, lift, D_SHEET)
      .multiply(new THREE.Matrix4().makeRotationY(Math.PI))
      .multiply(new THREE.Matrix4().makeRotationX(spin));
    return mapBackbone(helixLocal, m);
  };

  // --- world placement of the sheet frame: strands left↔right, sheet normal tilted towards the camera
  const tilt = 0.62;
  const up = v3(0, Math.cos(tilt), Math.sin(tilt));
  const world = new THREE.Matrix4().makeBasis(v3(1, 0, 0), up, v3(0, -Math.sin(tilt), Math.cos(tilt)))
    .multiply(new THREE.Matrix4().makeTranslation(-sheetMid.x, -4, -D_SHEET));
  const W = (c: Backbone[]) => mapBackbone(c, world);

  /** nRes residues joining a to b along a smooth arc whose bulge is sized so Cα atoms are 3.8 Å apart. */
  const link = (a: Backbone, b: Backbone, nRes: number, bulge: V3) => {
    const s = a.CA.clone();
    const e = b.CA.clone();
    const side = new THREE.Vector3().crossVectors(e.clone().sub(s), v3(0, 0, 1)).add(v3(0, 0.01, 0.4));
    const target = (nRes + 1) * 3.8;
    const curveFor = (k: number) => [s, s.clone().lerp(e, 0.5).addScaledVector(bulge.clone().normalize(), k), e];
    let lo = 0, hi = 12;
    for (let it = 0; it < 30; it++) {
      const mid = (lo + hi) / 2;
      const len = new THREE.CatmullRomCurve3(curveFor(mid), false, 'centripetal').getLength();
      if (len < target) lo = mid; else hi = mid;
    }
    return pathBackbone(curveFor(lo), nRes + 2, side).slice(1, -1);
  };
  const assemble = (helix: Backbone[], loopBulge: V3) => {
    const Hs = W(helix), As = W(A), Bs = W(B), Cs = W(C);
    const h0 = Hs[0]!.CA;
    const nStart = h0.clone().add(v3(6.5, 2.5, 2));
    const nTerm = pathBackbone([nStart, nStart.clone().lerp(h0, 0.5).add(v3(0, 1.2, 0.5)), h0], L.nTerm + 1, v3(0, 0, 1)).slice(0, -1);
    const loop = link(Hs[L.helix - 1]!, As[0]!, L.loop, loopBulge);
    const t1 = link(As[L.strand - 1]!, Bs[0]!, L.turn, v3(2.4, 0, 0));
    const t2 = link(Bs[L.strand - 1]!, Cs[0]!, L.turn, v3(-2.4, 0, 0));
    const end = Cs[L.strand - 1]!.CA;
    const cTerm = pathBackbone([end, end.clone().add(v3(3.4, -1.6, 1.4)), end.clone().add(v3(7, -3.6, 2.2))], L.cTerm + 1, v3(0, 0, 1)).slice(1);
    const chain = [...nTerm, ...Hs, ...loop, ...As, ...t1, ...Bs, ...t2, ...Cs, ...cTerm];
    // where a curved segment meets a rigid one, share the gap between the two bonds either side of it
    const rigid = (i: number) => isHelix(i) || isSheet(i);
    for (let i = 0; i + 1 < chain.length; i++) {
      const a = chain[i]!, b = chain[i + 1]!;
      if (rigid(i) && !rigid(i + 1)) b.N = a.C.clone().lerp(b.CA, 1.33 / (1.33 + 1.46));
      else if (!rigid(i) && rigid(i + 1)) a.C = a.CA.clone().lerp(b.N, 1.52 / (1.52 + 1.33));
    }
    return finish(chain);
  };
  const spin = 0.35;
  const tertiary = assemble(placeHelix(HELIX_H, spin), v3(-6, 0, 0));
  const secondary = assemble(placeHelix(HELIX_H + 9, spin), v3(-3, 0, 0));

  // --- primary: the unfolded chain laid out in rows (read like a sequence), N-terminus at the top left
  const rows = 4;
  const rowGap = 9.2;
  const turnR = rowGap / 2;
  const total = (n - 1) * 3.8;
  const rowLen = (total - (rows - 1) * Math.PI * turnR) / rows;
  const at = (s: number) => {
    const seglen = rowLen + Math.PI * turnR;
    const row = Math.min(rows - 1, Math.floor(s / seglen));
    const r = s - row * seglen;
    const dir = row % 2 === 0 ? 1 : -1;
    const y0 = ((rows - 1) / 2) * rowGap - row * rowGap + 2;
    const x0 = dir === 1 ? -rowLen / 2 : rowLen / 2;
    if (r <= rowLen || row === rows - 1) return v3(x0 + dir * r, y0, 0);
    const a = (r - rowLen) / turnR;
    return v3(x0 + dir * rowLen + dir * turnR * Math.sin(a), y0 - turnR + turnR * Math.cos(a), 0);
  };
  const pts = Array.from({ length: 4 * n + 1 }, (_, i) => at((i / (4 * n)) * total));
  const primary = finish(pathBackbone(pts, n, v3(0, 0, 1)));

  // --- R-group classes, decided from the folded state
  const state = tertiary;
  const inCore: boolean[] = state.map((r, i) => {
    const d = r.R.clone().sub(r.CA).normalize();
    if (isHelix(i)) return d.dot(up) < -0.3;
    return isSheet(i) && d.dot(up) > 0.6;
  });
  const cls: RClass[] = inCore.map((c) => (c ? 'hydrophobic' : 'polar'));
  const core = inCore.flatMap((c, i) => (c ? [i] : []));
  const coreCentre = core.reduce((s, i) => s.add(state[i]!.R), new THREE.Vector3()).divideScalar(Math.max(1, core.length));

  // R–R interactions in the folded state: close pairs of surface-side R groups, far apart in the sequence
  const pairs: [number, number, number][] = [];
  for (let i = 0; i < n; i++) for (let j = i + 4; j < n; j++) {
    if (inCore[i] && inCore[j]) continue;
    const d = state[i]!.R.distanceTo(state[j]!.R);
    if (d < 7) pairs.push([i, j, d]);
  }
  pairs.sort((a, b) => a[2] - b[2]);
  const used = new Set<number>();
  const take = (ok: (i: number, j: number) => boolean): [number, number] | null => {
    const pr = pairs.find(([i, j]) => !used.has(i) && !used.has(j) && ok(i, j));
    if (!pr) return null;
    used.add(pr[0]);
    used.add(pr[1]);
    return [pr[0], pr[1]];
  };
  const facing = (i: number) => state[i]!.R.z > coreCentre.z - 2; // on the side towards the camera
  const surface = (i: number) => !inCore[i];
  const segOf = (i: number) => seg.findIndex((s) => inRange(i, s));
  const apart = (i: number, j: number) => segOf(i) !== segOf(j) && j - i > 6;
  const disulfide = take((i, j) => isHelix(i) && isSheet(j) && facing(i) && facing(j));
  const ionic = take((i, j) => apart(i, j) && surface(i) && surface(j) && facing(i) && facing(j)) ?? take((i, j) => apart(i, j) && surface(i) && surface(j));
  const rhb = take((i, j) => apart(i, j) && surface(i) && surface(j) && facing(i) && facing(j)) ?? take((i, j) => apart(i, j) && surface(i) && surface(j));
  const mix: RClass[] = ['polar', 'acidic', 'polar', 'basic', 'polar', 'basic', 'polar', 'acidic'];
  let m = 0;
  for (let i = 0; i < n; i++) if (surface(i) && !used.has(i)) cls[i] = mix[m++ % mix.length]!;
  if (disulfide) { cls[disulfide[0]] = 'cys'; cls[disulfide[1]] = 'cys'; }
  if (ionic) { cls[ionic[0]] = 'basic'; cls[ionic[1]] = 'acidic'; }
  if (rhb) { cls[rhb[0]] = 'polar'; cls[rhb[1]] = 'polar'; }
  // bonded R groups lean towards each other so the bonds have sensible lengths
  const nudge = (pr: [number, number] | null, gap: number) => {
    if (!pr) return;
    const a = state[pr[0]]!;
    const b = state[pr[1]]!;
    const c = a.R.clone().add(b.R).multiplyScalar(0.5);
    const d = b.R.clone().sub(a.R).normalize().multiplyScalar(gap / 2);
    a.R.copy(c).sub(d);
    b.R.copy(c).add(d);
  };
  nudge(disulfide, 3.2);
  nudge(ionic, 3.8);
  nudge(rhb, 3.8);

  // backbone hydrogen bonds: helix C=O(i) → N–H(i+4); sheet: every C=O···H–N closer than 2.5 Å between strands
  const helixHB: [number, number][] = [];
  for (let i = sHelix.from; i + 4 <= sHelix.to; i++) helixHB.push([i, i + 4]);
  const sheetHB: [number, number][] = [];
  const strands = [sA, sB, sC];
  for (const s1 of strands) for (const s2 of strands) {
    if (s1 === s2) continue;
    for (let i = s1.from; i <= s1.to; i++) for (let j = s2.from; j <= s2.to; j++) {
      if (state[i]!.O.distanceTo(state[j]!.H) < 2.5) sheetHB.push([i, j]);
    }
  }
  return { n, seg, cls, states: [primary, secondary, tertiary] as Res[][], helixHB, sheetHB, disulfide, ionic, rhb, core, coreCentre, sLoop };
}
