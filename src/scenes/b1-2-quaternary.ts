import * as THREE from 'three';
import type { SceneModule } from '../viewer3d/types';
import { anchorAt, setInstance } from '../viewer3d/kit';
import { v3, type V3 } from './b1-2-kit';

/*
 * B1.2.11–B1.2.12 The three named examples, drawn to the same scale (units: Å) as cartoon models.
 *
 * Haemoglobin (upper left): a conjugated protein with quaternary structure — two α chains (blue) and two
 * β chains (purple), each folded into the all-helical globin fold (drawn as two layers of three α-helices)
 * with one haem group (red disc, iron ion at its centre) in a pocket near its surface. The four subunits
 * are related by three perpendicular two-fold axes; the true two-fold axis (vertical) relates α1 to α2
 * and β1 to β2, and there is a central cavity along it. About 6.5 × 5.5 × 5 nm in all.
 *
 * Insulin (upper right): a small globular protein of two polypeptides (A chain 21 amino acids, B chain 30)
 * shown as Cα traces. The A chain has two short helices; the B chain has a central helix and an extended
 * C-terminal part. Three disulfide bonds (yellow): A6–A11 within the A chain, A7–B7 and A20–B19 between
 * the chains. No prosthetic group: non-conjugated.
 *
 * Collagen (bottom): a fibrous protein — a segment of the triple helix. Three polypeptides (two identical
 * α1 chains and one α2 chain in type I collagen) are each a LEFT-handed helix with three residues per
 * turn; together they wind into a RIGHT-handed triple helix. Every third residue is glycine (small grey
 * beads), the only R group small enough to fit at the centre where the chains touch. The real molecule is
 * ~300 nm long and 1.5 nm wide; only ~11 nm is drawn.
 */

const HB_C = v3(-30, 15, 0);
const INS_C = v3(34, 14, 0);
const COL_C = v3(0, -31, 0);

/** Points along a right-handed α-helix (3.6 residues per turn, 1.5 Å rise) round an axis from a, n residues. */
function helixPoints(a: V3, dir: V3, n: number, phase = 0, radius = 2.3, perRes = 3) {
  const d = dir.clone().normalize();
  const u = new THREE.Vector3().crossVectors(d, Math.abs(d.y) < 0.9 ? v3(0, 1, 0) : v3(1, 0, 0)).normalize();
  const w = new THREE.Vector3().crossVectors(d, u); // (u, w, d) right-handed, so increasing angle is a right-handed screw along d
  const pts: V3[] = [];
  for (let k = 0; k <= (n - 1) * perRes; k++) {
    const s = k / perRes;
    const ang = phase + (s * 100 * Math.PI) / 180;
    pts.push(a.clone().addScaledVector(d, 1.5 * s).addScaledVector(u, radius * Math.cos(ang)).addScaledVector(w, radius * Math.sin(ang)));
  }
  return pts;
}

/** Concatenate non-indexed geometries with position and normal attributes. */
function mergeNonIndexed(parts: THREE.BufferGeometry[]) {
  const pos: number[] = [];
  const nor: number[] = [];
  for (const g of parts) {
    pos.push(...(g.getAttribute('position').array as Float32Array));
    nor.push(...(g.getAttribute('normal').array as Float32Array));
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.computeBoundingSphere();
  return out;
}

/**
 * Globin fold in local coordinates, drawn in the "cylinder" cartoon style: six α-helices (cylinders,
 * ≈ the A, B, E, F, G and H helices) in two crossed layers, joined by loops. The haem lies flat in the
 * gap between the layers with its edge reaching the +x surface, as the real haem sits in a surface pocket.
 */
function globin() {
  const layers = [
    { z: 4.4, dir: v3(Math.cos(0.5), Math.sin(0.5), 0) },
    { z: -4.4, dir: v3(Math.cos(-0.5), Math.sin(-0.5), 0) },
  ];
  const lengths = [16, 12, 15, 12, 13, 18]; // residues per helix
  const helices: { a: V3; b: V3 }[] = [];
  const loops: V3[][] = [];
  for (let h = 0; h < 6; h++) {
    const layer = layers[h % 2]!;
    const along = h % 2 === 0 ? 1 : -1;
    const off = [-6.6, 0, 6.6][Math.floor(h / 2)]! * (h % 2 === 0 ? 1 : -1);
    const perp = v3(-layer.dir.y, layer.dir.x, 0);
    const len = 1.5 * (lengths[h]! - 1);
    const a = perp.clone().multiplyScalar(off).addScaledVector(layer.dir, (-along * len) / 2).setZ(layer.z);
    const b = a.clone().addScaledVector(layer.dir, along * len);
    if (helices.length) {
      const p = helices[helices.length - 1]!.b;
      const m = p.clone().add(a).multiplyScalar(0.5);
      m.add(v3(m.x, m.y, 0).setLength(2.8));
      loops.push([p, m, a]);
    }
    helices.push({ a, b });
  }
  return { helices, loops, haem: v3(11, 0.5, 0), haemNormal: v3(0, 0.35, 1).normalize() };
}

const scene: SceneModule = {
  camera: { position: [2, 12, 166], target: [-1, -3, 0], fov: 38, minDistance: 40, maxDistance: 260 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);

    // ---------- haemoglobin ----------
    const hb = new THREE.Group();
    hb.position.copy(HB_C);
    root.add(hb);
    const fold = globin();
    // one merged geometry per subunit: helix cylinders plus loop tubes
    const parts: THREE.BufferGeometry[] = [];
    for (const { a, b } of fold.helices) {
      const d = b.clone().sub(a);
      const g = new THREE.CylinderGeometry(2.3, 2.3, d.length(), 18, 1);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v3(0, 1, 0), d.clone().normalize()));
      g.translate(...a.clone().add(b).multiplyScalar(0.5).toArray());
      parts.push(g.toNonIndexed());
      g.dispose();
    }
    for (const l of fold.loops) {
      const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(l), 12, 0.75, 6);
      parts.push(g.toNonIndexed());
      g.dispose();
    }
    const tubeGeo = ctx.track(mergeNonIndexed(parts));
    const haemGeo = ctx.track(new THREE.CylinderGeometry(4.2, 4.2, 1.0, 20));
    const feGeo = ctx.track(new THREE.SphereGeometry(1.1, 14, 10));
    const mA = ctx.material('protein', { roughness: 0.5 });
    const mB = ctx.material('protein2', { roughness: 0.5 });
    const mHaem = ctx.material('k', { roughness: 0.4 });
    const mFe = ctx.material('head', { roughness: 0.3, metalness: 0.2 });
    // α1 placed off-centre with its haem pocket facing outwards; the others by two-fold rotations
    const p1 = v3(12.5, 10.5, 9.5);
    const out = p1.clone().normalize();
    const zl = new THREE.Vector3().crossVectors(out, v3(0, 1, 0)).normalize();
    const yl = new THREE.Vector3().crossVectors(zl, out);
    const base = new THREE.Matrix4().makeBasis(out, yl, zl).setPosition(p1);
    const ops = {
      a1: new THREE.Matrix4(),
      a2: new THREE.Matrix4().makeRotationY(Math.PI),
      b1: new THREE.Matrix4().makeRotationZ(Math.PI),
      b2: new THREE.Matrix4().makeRotationX(Math.PI),
    };
    const subunit = (op: THREE.Matrix4, mat: THREE.Material) => {
      const g = new THREE.Group();
      g.applyMatrix4(op.clone().multiply(base));
      const chain = new THREE.Mesh(tubeGeo, mat);
      const haem = new THREE.Group();
      const disc = new THREE.Mesh(haemGeo, mHaem);
      const fe = new THREE.Mesh(feGeo, mFe);
      haem.add(disc, fe);
      haem.position.copy(fold.haem);
      haem.quaternion.setFromUnitVectors(v3(0, 1, 0), fold.haemNormal);
      g.add(chain, haem);
      hb.add(g);
      return { g, chain, haem };
    };
    const a1 = subunit(ops.a1, mA);
    const a2 = subunit(ops.a2, mA);
    const b1 = subunit(ops.b1, mB);
    const b2 = subunit(ops.b2, mB);

    // ---------- insulin (Cα traces) ----------
    const ins = new THREE.Group();
    ins.position.copy(INS_C);
    root.add(ins);
    const path = (ctrl: V3[], n: number) => {
      const c = new THREE.CatmullRomCurve3(ctrl, false, 'centripetal');
      return Array.from({ length: n }, (_, i) => c.getPointAt(n === 1 ? 0 : i / (n - 1)));
    };
    const caHelix = (a: V3, dir: V3, n: number, phase: number) => helixPoints(a, dir, n, phase, 2.3, 1);
    // B chain: B1–B8 extended, B9–B19 helix (up), B20–B23 turn, B24–B30 extended (down)
    const bHelix = caHelix(v3(0, -7.5, 0), v3(0, 1, 0), 11, 3.4);
    const bN = path([v3(-14, -15, 5), v3(-10, -11.5, 4), v3(-6.2, -9.6, 2.5), bHelix[0]!.clone().add(v3(-3.4, -1.6, 0))], 8);
    const bTurn = path([bHelix[10]!.clone().add(v3(2.6, 2.2, 0.5)), v3(6, 11, 2), v3(8.5, 8.8, 2.5), v3(9.2, 5.5, 2.2)], 4);
    const bC = path([v3(9.5, 2, 2), v3(9.2, -6, 1.2), v3(6.8, -12.5, -0.5), v3(1.5, -14.5, -2.5)], 7);
    const B = [...bN, ...bHelix, ...bTurn, ...bC];
    // A chain: A1–A8 helix (down), A9–A11 loop, A12–A18 helix (up), A19–A21 extended towards B19
    const aH1 = caHelix(v3(-8.3, 6.2, -3.4), v3(0, -1, 0), 8, 0.6);
    const aLoop = path([aH1[7]!.clone().add(v3(-2.4, -2.6, 0)), v3(-12.6, -7.2, -1.5), v3(-15.2, -5.4, -0.2)], 3);
    const aH2 = caHelix(v3(-16.6, -2.6, 0.4), v3(0.1, 1, 0.12), 7, 2.5);
    const aC = path([aH2[6]!.clone().add(v3(2.2, 2.6, 0.6)), v3(-8.5, 11.5, 2), v3(-4.6, 10.6, 2.4)], 3);
    const Ach = [...aH1, ...aLoop, ...aH2, ...aC];
    const mInsA = ctx.material('protein', { roughness: 0.5 });
    const mInsB = ctx.material('protein2', { roughness: 0.5 });
    const mS = ctx.material('glucose', { roughness: 0.35 });
    const caGeo = ctx.track(new THREE.SphereGeometry(1.15, 12, 8));
    const trace = (pts: V3[], mat: THREE.Material) => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(ctx.track(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), pts.length * 6, 0.55, 6)), mat));
      const im = new THREE.InstancedMesh(caGeo, mat, pts.length);
      pts.forEach((p, i) => setInstance(im, i, p));
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
      g.add(im);
      ins.add(g);
      return g;
    };
    const insA = trace(Ach, mInsA);
    const insB = trace(B, mInsB);
    // disulfide bonds: two S atoms on the line between the paired cysteine Cα atoms, and the S–S bond
    const ssGroup = new THREE.Group();
    ins.add(ssGroup);
    const sGeo = ctx.track(new THREE.SphereGeometry(1.0, 12, 8));
    const bondGeo = ctx.track(new THREE.CylinderGeometry(0.42, 0.42, 1, 8));
    const ssPairs: [V3, V3][] = [[Ach[5]!, Ach[10]!], [Ach[6]!, B[6]!], [Ach[19]!, B[18]!]];
    for (const [p, q] of ssPairs) {
      const s1 = p.clone().lerp(q, 0.3);
      const s2 = p.clone().lerp(q, 0.7);
      for (const s of [s1, s2]) { const m = new THREE.Mesh(sGeo, mS); m.position.copy(s); ssGroup.add(m); }
      for (const [x, y] of [[p, s1], [s1, s2], [s2, q]] as const) {
        const d = y.clone().sub(x);
        const m = new THREE.Mesh(bondGeo, mS);
        m.position.copy(x).add(y).multiplyScalar(0.5);
        m.scale.set(1, d.length(), 1);
        m.quaternion.setFromUnitVectors(v3(0, 1, 0), d.normalize());
        ssGroup.add(m);
      }
    }

    // ---------- collagen triple helix (axis along x) ----------
    const col = new THREE.Group();
    col.position.copy(COL_C);
    col.rotation.z = -Math.PI / 2; // local +y → world +x
    root.add(col);
    const N = 39; // residues per chain shown (13 Gly–X–Y repeats)
    const RISE = 2.86;
    const R_SUPER = 3.1;
    const r = 1.75;
    const omega = (2 * Math.PI) / (30 * RISE); // right-handed supercoil: one turn per ~30 residues
    const chains: V3[][] = [0, 1, 2].map((k) => Array.from({ length: N }, (_, n) => {
      const y = (n + k / 3) * RISE - (N * RISE) / 2;
      const T = omega * y + (k * 2 * Math.PI) / 3;
      const radial = v3(Math.sin(T), 0, Math.cos(T));
      const azim = v3(Math.cos(T), 0, -Math.sin(T));
      // left-handed minor helix, three residues per turn, phased so every third residue (Gly) faces the axis
      const a = (n * 2 * Math.PI) / 3;
      return radial.clone().multiplyScalar(R_SUPER).addScaledVector(radial, -r * Math.cos(a)).addScaledVector(azim, r * Math.sin(a)).setY(y);
    }));
    const mC1 = ctx.material('protein', { roughness: 0.5 });
    const mC2 = ctx.material('protein2', { roughness: 0.5 });
    const mGly = ctx.material('neutral', { roughness: 0.5 });
    const bigGeo = ctx.track(new THREE.SphereGeometry(1.45, 12, 8));
    const glyGeo = ctx.track(new THREE.SphereGeometry(0.85, 10, 8));
    const gly = new THREE.InstancedMesh(glyGeo, mGly, 3 * Math.ceil(N / 3));
    let ng = 0;
    const colChains = chains.map((pts, k) => {
      const mat = k === 2 ? mC2 : mC1;
      const g = new THREE.Group();
      g.add(new THREE.Mesh(ctx.track(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), N * 6, 0.5, 6)), mat));
      const xy = pts.filter((_, n) => n % 3 !== 0);
      const im = new THREE.InstancedMesh(bigGeo, mat, xy.length);
      xy.forEach((p, i) => setInstance(im, i, p));
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
      g.add(im);
      pts.forEach((p, n) => { if (n % 3 === 0) setInstance(gly, ng++, p); });
      col.add(g);
      return g;
    });
    gly.count = ng;
    gly.instanceMatrix.needsUpdate = true;
    gly.computeBoundingSphere();
    col.add(gly);

    // ---------- anchors ----------
    const world = (o: THREE.Object3D, p: V3) => { o.updateMatrixWorld(true); return p.clone().applyMatrix4(o.matrixWorld); };
    root.updateMatrixWorld(true);
    // anchors are children of the group they label, so they follow it when "Animate movement" spins it
    const at = (name: string, p: V3) => {
      const parent = ['haemoglobin', 'alpha-chain', 'beta-chain', 'haem'].includes(name) ? hb : name.startsWith('insulin') ? ins : col;
      const local = parent.worldToLocal(p.clone());
      return anchorAt(parent, local.x, local.y, local.z, name);
    };
    const haemFront = [a1, a2, b1, b2].map((s) => world(s.haem, v3(0, 0, 0))).sort((p, q) => q.z - p.z)[0]!;
    const frontA = world(a1.g, v3(0, 3, 6));
    const frontB = world(b1.g, v3(0, -3, 6));
    const glyFront = (() => {
      let best = v3(0, 0, -1e9);
      for (let n = 9; n < 30; n += 3) for (const c of chains) { const p = world(col, c[n]!); if (p.z > best.z) best = p; }
      return best;
    })();
    const anchors = {
      haemoglobin: { object: at('haemoglobin', HB_C.clone().add(v3(-4, 27, 4))), highlight: [hb] },
      'alpha-chain': { object: at('alpha-chain', frontA), highlight: [a1.chain, a2.chain] },
      'beta-chain': { object: at('beta-chain', frontB), highlight: [b1.chain, b2.chain] },
      haem: { object: at('haem', haemFront.clone().add(v3(0, 0, 1.5))), highlight: [a1.haem, a2.haem, b1.haem, b2.haem] },
      'insulin-a': { object: at('insulin-a', world(ins, Ach[2]!).add(v3(-2.5, 0, 3))), highlight: [insA] },
      'insulin-b': { object: at('insulin-b', world(ins, B[14]!).add(v3(0, 0, 3))), highlight: [insB] },
      'insulin-ss': { object: at('insulin-ss', world(ins, ssPairs[1]![0].clone().lerp(ssPairs[1]![1], 0.5)).add(v3(0, -1, 3))), highlight: [ssGroup] },
      collagen: { object: at('collagen', world(col, v3(0, -44, 0)).add(v3(0, 6, 3))), highlight: colChains },
      'collagen-chain': { object: at('collagen-chain', world(col, chains[2]![24]!).add(v3(0, 1.5, 2))), highlight: [colChains[2]!] },
      glycine: { object: at('glycine', glyFront.clone().add(v3(0, 0, 1))), highlight: [gly] },
    };

    return {
      anchors,
      idle(dt) { hb.rotation.y += dt * 0.25; ins.rotation.y += dt * 0.3; col.rotation.x += dt * 0.4; },
      dispose() { root.removeFromParent(); },
    };
  },
};

export default scene;
