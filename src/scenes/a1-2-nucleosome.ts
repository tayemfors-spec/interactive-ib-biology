import * as THREE from 'three';
import type { PaletteKey, SceneModule } from '../viewer3d/types';
import { anchorAt, blobGeometry } from '../viewer3d/kit';

/*
 * A1.2.13 Three nucleosomes on a DNA molecule ("beads on a string"). Units are nanometres.
 * Each nucleosome: a histone octamer (two each of H2A, H2B, H3 and H4 — eight proteins, two layers of four
 * related by the dyad axis) with ~147 bp of DNA wound round it in 1.65 turns of a LEFT-handed
 * superhelix (radius 4.2 nm to the DNA axis, pitch 2.4 nm). The DNA itself is a right-handed double
 * helix (2 nm wide, 10.4 bp per turn, minor groove 140° wide). Linker DNA joins neighbouring
 * nucleosomes, and one H1 histone sits on the outside at the dyad, where the DNA enters and leaves,
 * binding the linker DNA and holding the wrap in place.
 */
const R_SH = 4.2;
const PITCH = 2.4;
const TURNS = 1.65;
const BP = 0.34;
const DNA_R = 0.95;
const TWIST = (2 * Math.PI) / 10.4;
const MINOR = (140 * Math.PI) / 180;
const S_MAX = TURNS * Math.PI; // s runs from −S_MAX to +S_MAX: 1.65 turns in all, centred on the dyad

interface Nuc { c: THREE.Vector3; a: THREE.Vector3; d: THREE.Vector3; e: THREE.Vector3 }

const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Left-handed superhelix about axis a, starting from dyad direction d (e = a × d). */
const wrapPoint = (n: Nuc, s: number) =>
  n.c.clone()
    .addScaledVector(n.d, R_SH * Math.cos(s))
    .addScaledVector(n.e, -R_SH * Math.sin(s))
    .addScaledVector(n.a, (PITCH * s) / (2 * Math.PI));

const scene: SceneModule = {
  camera: { position: [4.5, 8, 41], target: [1.5, -1, 0], fov: 38, minDistance: 10, maxDistance: 70 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);

    const make = (cx: number, cy: number, tilt: number, yawA: number): Nuc => {
      const a = v3(Math.cos(yawA), 0, -Math.sin(yawA)).applyAxisAngle(v3(0, 0, 1), tilt).normalize();
      const d = v3(0, -1, 0).addScaledVector(a, a.y).normalize(); // dyad points down, towards the linkers
      const e = new THREE.Vector3().crossVectors(a, d).normalize();
      return { c: v3(cx, cy, 0), a, d, e };
    };
    const nucs: Nuc[] = [make(-11.5, 0.4, 0.12, 0.75), make(0, 1.2, -0.08, 0.55), make(11.5, 0.2, 0.1, 0.9)];

    // ---------- DNA centre line ----------
    const pts: THREE.Vector3[] = [];
    const h1Pos: THREE.Vector3[] = [];
    pts.push(nucs[0]!.c.clone().add(v3(-6, -6.2, 1)));
    nucs.forEach((n) => {
      const h = n.c.clone().addScaledVector(n.d, R_SH + 1.9);
      h1Pos.push(h);
      // DNA comes in past H1 at the dyad, wraps 1.65 turns, and leaves past H1 again
      pts.push(h.clone().addScaledVector(n.a, -1.4).addScaledVector(n.d, 0.2).addScaledVector(n.e, 1.4));
      const steps = 44;
      for (let k = 0; k <= steps; k++) pts.push(wrapPoint(n, -S_MAX + (2 * S_MAX * k) / steps));
      pts.push(h.clone().addScaledVector(n.a, 1.4).addScaledVector(n.d, 0.2).addScaledVector(n.e, -1.4));
    });
    pts.push(nucs[2]!.c.clone().add(v3(6, -6.2, -1)));
    const centre = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const nbp = Math.round(centre.getLength() / BP);

    // ---------- double helix along the centre line (parallel-transport frames) ----------
    const s1: THREE.Vector3[] = [];
    const s2: THREE.Vector3[] = [];
    let n = new THREE.Vector3();
    for (let i = 0; i <= nbp; i++) {
      const u = i / nbp;
      const c = centre.getPointAt(u);
      const t = centre.getTangentAt(u);
      if (i === 0) n = new THREE.Vector3(0, 0, 1).cross(t).normalize();
      else n.addScaledVector(t, -n.dot(t)).normalize();
      const b = new THREE.Vector3().crossVectors(t, n);
      const ph = i * TWIST;
      s1.push(c.clone().addScaledVector(n, DNA_R * Math.cos(ph)).addScaledVector(b, DNA_R * Math.sin(ph)));
      s2.push(c.clone().addScaledVector(n, DNA_R * Math.cos(ph + MINOR)).addScaledVector(b, DNA_R * Math.sin(ph + MINOR)));
    }
    const mStrand = ctx.material('text', { roughness: 0.45 });
    const tube = (p: THREE.Vector3[]) => {
      const m = new THREE.Mesh(ctx.track(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p), p.length * 2, 0.26, 6)), mStrand);
      root.add(m);
      return m;
    };
    const strand1 = tube(s1);
    const strand2 = tube(s2);
    const rungGeo = ctx.track(new THREE.CylinderGeometry(0.13, 0.13, 1, 5));
    const rungs = new THREE.InstancedMesh(rungGeo, ctx.material('neutral', { roughness: 0.6 }), s1.length);
    const q = new THREE.Quaternion();
    const mtx = new THREE.Matrix4();
    for (let i = 0; i < s1.length; i++) {
      const dlt = s2[i]!.clone().sub(s1[i]!);
      q.setFromUnitVectors(v3(0, 1, 0), dlt.clone().normalize());
      mtx.compose(s1[i]!.clone().add(s2[i]!).multiplyScalar(0.5), q, v3(1, dlt.length(), 1));
      rungs.setMatrixAt(i, mtx);
    }
    rungs.instanceMatrix.needsUpdate = true;
    rungs.computeBoundingSphere();
    root.add(rungs);

    // ---------- histone octamers, tails and H1 ----------
    const types: [PaletteKey, number][] = [['carb', 0.8], ['glucose', 2.35], ['protein', 3.9], ['protein2', 5.45]]; // H3, H4, H2A, H2B
    const mats = Object.fromEntries(types.map(([k]) => [k, ctx.material(k, { roughness: 0.55 })])) as Record<PaletteKey, THREE.MeshStandardMaterial>;
    const mH1 = ctx.material('chol', { roughness: 0.5 });
    const histGeo = ctx.track(blobGeometry(1.3, 2.3, 4, 0.1, 18));
    const h1Geo = ctx.track(blobGeometry(1.05, 2.3, 9, 0.14, 18));
    const tailGeo = (p: THREE.Vector3[]) => ctx.track(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p), 16, 0.16, 5));
    const octamers: THREE.Group[] = [];
    const firstH3: THREE.Mesh[] = [];
    const tails: THREE.Mesh[] = [];
    const h1s: THREE.Mesh[] = [];
    const nucGroups: THREE.Group[] = [];
    nucs.forEach((nu, k) => {
      const g = new THREE.Group();
      const oct = new THREE.Group();
      g.add(oct);
      root.add(g);
      nucGroups.push(g);
      octamers.push(oct);
      const basis = new THREE.Matrix4().makeBasis(nu.d, nu.e, nu.a);
      const up = new THREE.Quaternion().setFromUnitVectors(v3(0, 1, 0), nu.a);
      for (const side of [1, -1]) {
        for (const [key, ang] of types) {
          // the second layer is the first rotated 180° about the dyad axis: (d, e, a) → (d, −e, −a)
          const a2 = side === 1 ? ang : -ang;
          const local = v3(1.75 * Math.cos(a2), 1.75 * Math.sin(a2), side * 1.18).applyMatrix4(basis);
          const m = new THREE.Mesh(histGeo, mats[key]);
          m.position.copy(nu.c).add(local);
          m.quaternion.copy(up);
          oct.add(m);
          if (key === 'carb' && side === 1) firstH3.push(m);
          // N-terminal tails of H3 and H4 leave the core between the two turns of DNA
          if (key === 'carb' || key === 'glucose') {
            const out = v3(Math.cos(a2 + 0.25), Math.sin(a2 + 0.25), 0).applyMatrix4(basis);
            const p0 = m.position.clone();
            const p1 = nu.c.clone().addScaledVector(out, R_SH + 0.2).addScaledVector(nu.a, side * 0.15);
            const p2 = nu.c.clone().addScaledVector(out, R_SH + 1.8).addScaledVector(nu.a, side * 0.9).addScaledVector(nu.e, 0.4);
            const p3 = nu.c.clone().addScaledVector(out, R_SH + 2.6).addScaledVector(nu.a, side * 0.3);
            const t = new THREE.Mesh(tailGeo([p0, p1, p2, p3]), mats[key]);
            g.add(t);
            if (k === 1) tails.push(t);
          }
        }
      }
      const h1 = new THREE.Mesh(h1Geo, mH1);
      h1.position.copy(h1Pos[k]!).addScaledVector(nu.d, 0.9);
      h1.quaternion.copy(up);
      g.add(h1);
      h1s.push(h1);
    });

    // ---------- anchors ----------
    const mid = nucs[1]!;
    const front = (nu: Nuc, s: number, lift = 1.2) => {
      const p = wrapPoint(nu, s);
      return p.add(p.clone().sub(nu.c).setLength(lift).projectOnPlane(nu.a));
    };
    // the wrapped DNA point most towards the camera on the middle nucleosome
    let bestS = 0, bestZ = -Infinity;
    for (let s = -S_MAX; s <= S_MAX; s += 0.05) { const z = wrapPoint(mid, s).z; if (z > bestZ) { bestZ = z; bestS = s; } }
    const linkerMid = h1Pos[0]!.clone().add(h1Pos[1]!).multiplyScalar(0.5);
    const contact = mid.c.clone().addScaledVector(mid.e, -0.1).addScaledVector(mid.d, -2.9).addScaledVector(mid.a, 1.6);
    const at = (name: string, p: THREE.Vector3) => anchorAt(root, p.x, p.y, p.z, name);
    const anchors = {
      octamer: { object: at('octamer', mid.c.clone().addScaledVector(mid.a, 2.2).add(v3(0, 0, 0.4))), highlight: [octamers[1]!] },
      histone: { object: at('histone', firstH3[2]!.position.clone().addScaledVector(nucs[2]!.a, 1.1)), highlight: [firstH3[2]!] },
      wrapped: { object: at('wrapped', front(mid, bestS)), highlight: [strand1, strand2, rungs] },
      linker: { object: at('linker', linkerMid.clone().add(v3(0, 0, 1.1))), highlight: [strand1, strand2, rungs] },
      h1: { object: at('h1', h1s[1]!.position.clone().addScaledVector(mid.d, 1.1)), highlight: [h1s[1]!] },
      nucleosome: { object: at('nucleosome', nucs[0]!.c.clone().add(v3(0, R_SH + 1.6, 0.5))), highlight: [nucGroups[0]!, strand1, strand2] },
      tail: { object: at('tail', tails[0] ? centreOf(tails[0]) : mid.c), highlight: tails },
      contact: { object: at('contact', contact), highlight: [octamers[1]!] },
    };
    return { anchors, dispose() { root.removeFromParent(); } };
  },
};

function centreOf(m: THREE.Mesh) {
  m.geometry.computeBoundingBox();
  return m.geometry.boundingBox!.getCenter(new THREE.Vector3());
}

export default scene;
