import * as THREE from 'three';
import type { SceneModule } from '../viewer3d/types';
import { anchorAt, blobGeometry, rng } from '../viewer3d/kit';
import {
  DS, type Hole, type P2, frame, instanced, join, lathe, line, mirror, planeFill, planeTube, polar, polarArc, poreMembrane, scatter,
} from './b2-2-kit';

/*
 * B2.2 nucleus, cut in half by the plane z = 0 (the reader looks into the back half).
 * Schematic proportions: the nucleus is ≈ 8 units across (≈ 8 µm). The space between the two membranes
 * (really 20–40 nm), the pores (really ≈ 0.1 µm across) and the ribosomes (≈ 25 nm) are drawn far larger.
 *
 * Topology that matters:
 *  - two membranes (the nuclear envelope) with a narrow perinuclear space between them;
 *  - at every pore the outer and inner membranes are joined (the pore is lined by membrane), and a pore
 *    complex of proteins with eightfold symmetry sits in the opening;
 *  - the outer membrane is continuous with the rough ER, and the perinuclear space with the ER lumen;
 *  - ribosomes sit only on cytoplasmic faces (outer membrane and ER), never on the inner membrane;
 *  - mRNA leaves through a pore and is translated by ribosomes in the cytoplasm.
 */
const RO = 4.0, RI = 3.62;
const RM = (RO + RI) / 2, RHO = (RO - RI) / 2;
const W = RO - RI;          // the ER lumen is drawn as wide as the perinuclear space
const PORE_A = 0.4;         // pore radius at the membrane surfaces
// rough ER sheets (on the right, +x, side of the cut): two cisternae, the first joined to the outer membrane
const S1 = { r: 5.0, a: 0.35, b: 1.45, neck: 0.95 };
const S2 = { r: 6.0, a: 0.55, b: 1.62, neck: 1.25 };
const AZ_ER = Math.PI / 2 + 1.3; // the ER sheets extend round the back from azimuth π/2 to here
const CUT_PORE = 2.1;           // latitude of the pore on the +x cut edge

const n = (d: number) => Math.max(3, Math.ceil(Math.abs(d) / 0.025));
const arcR = (r: number, a: number, b: number) => polarArc(r, a, b, n(b - a));

/** The half-circle end of a sheet of radius rc at latitude phi; `bulge` −1 rounds towards the top pole. */
function cap(rc: number, phi: number, fromInner: boolean, bulge: 1 | -1): P2[] {
  const er: P2 = [Math.sin(phi), Math.cos(phi)];
  const ep: P2 = [Math.cos(phi), -Math.sin(phi)];
  const out: P2[] = [];
  for (let i = 0; i <= 10; i++) {
    const s = (i / 10) * Math.PI;
    const rad = (fromInner ? -1 : 1) * (W / 2) * Math.cos(s);
    const tan = bulge * (W / 2) * Math.sin(s);
    out.push([rc * er[0] + rad * er[0] + tan * ep[0], rc * er[1] + rad * er[1] + tan * ep[1]]);
  }
  return out;
}
/** A neck: two straight walls at latitude phi ± (half-width) between radii r0 and r1. */
const wall = (r0: number, r1: number, phi: number, side: 1 | -1): P2[] =>
  line(polar(r0, phi + (side * W) / 2 / r0), polar(r1, phi + (side * W) / 2 / r1), 4);

/** The outer membrane's profile where it runs out into the two ER sheets (from neck 1 out and back). */
function excursion(): P2[] {
  const i1 = S1.r - W / 2, o1 = S1.r + W / 2, i2 = S2.r - W / 2, o2 = S2.r + W / 2;
  const d = (r: number) => W / 2 / r;
  return join(
    wall(RO, i1, S1.neck, -1),
    arcR(i1, S1.neck - d(i1), S1.a),
    cap(S1.r, S1.a, true, -1),
    arcR(o1, S1.a, S2.neck - d(o1)),
    wall(o1, i2, S2.neck, -1),
    arcR(i2, S2.neck - d(i2), S2.a),
    cap(S2.r, S2.a, true, -1),
    arcR(o2, S2.a, S2.b),
    cap(S2.r, S2.b, false, 1),
    arcR(i2, S2.b, S2.neck + d(i2)),
    wall(i2, o1, S2.neck, 1),
    arcR(o1, S2.neck + d(o1), S1.b),
    cap(S1.r, S1.b, false, 1),
    arcR(i1, S1.b, S1.neck + d(i1)),
    wall(i1, RO, S1.neck, 1),
  );
}

/** Lathe direction (three.js convention) for latitude phi and azimuth az. */
const dir = (phi: number, az: number) => new THREE.Vector3(Math.sin(phi) * Math.sin(az), Math.cos(phi), Math.sin(phi) * Math.cos(az));

const scene: SceneModule = {
  camera: { position: [2.4, 2.3, 15.4], target: [0.9, 0.6, -1.2], fov: 38, minDistance: 6, maxDistance: 40 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    const rand = rng(29);

    const mMem = ctx.material('head', { roughness: 0.5, side: DS });
    const mRim = ctx.material('head', { roughness: 0.35, metalness: 0.6 });
    const mLumen = ctx.material('water', { roughness: 0.6, side: DS });
    const mNPC = ctx.material('protein', { roughness: 0.45 });
    const mChrom = ctx.material('na', { roughness: 0.55 });
    const mHetero = ctx.material('na', { roughness: 0.5, metalness: 0.55 });
    const mNucleolus = ctx.material('text', { roughness: 0.7 });
    const mRibo = ctx.material('text', { roughness: 0.55 });
    const mRNA = ctx.material('glucose', { roughness: 0.4 });

    // ---------- pores: directions on the back half, avoiding the region under the ER sheets ----------
    const poreDirs: THREE.Vector3[] = [];
    const cutPore = dir(CUT_PORE, Math.PI / 2);
    for (let tries = 0; poreDirs.length < 13 && tries < 4000; tries++) {
      const phi = 0.35 + rand() * 2.45;
      const az = Math.PI / 2 + 0.2 + rand() * (Math.PI - 0.4);
      if (az < AZ_ER + 0.25 && phi < S2.b + 0.2) continue;
      const u = dir(phi, az);
      if (u.z > -0.3) continue; // keep them well behind the cut so they face the reader
      if ([...poreDirs, cutPore].some((v) => v.angleTo(u) < 0.42)) continue;
      poreDirs.push(u);
    }
    const holes: Hole[] = [...poreDirs, cutPore].map((axis) => ({ axis, r: PORE_A }));

    // ---------- the nuclear envelope ----------
    const inner = arcR(RI, 0, Math.PI);
    const plainOuter = arcR(RO, 0, Math.PI);
    const exc = excursion();
    const d0 = W / 2 / RO;
    const outerER = join(arcR(RO, 0, S1.neck - d0), exc, arcR(RO, S1.neck + d0, Math.PI));

    const envelope = new THREE.Group();
    const innerMem = new THREE.Mesh(lathe(ctx, inner, Math.PI / 2, Math.PI * 1.5, 128, holes), mMem);
    const outerMem = new THREE.Group();
    outerMem.add(
      new THREE.Mesh(lathe(ctx, plainOuter, AZ_ER, Math.PI * 1.5, 96, holes), mMem),
      new THREE.Mesh(lathe(ctx, outerER, Math.PI / 2, AZ_ER, 52, holes), mMem),
    );
    envelope.add(innerMem, outerMem);
    root.add(envelope);

    // cut face, right (+x) side: the envelope runs straight into the ER, so the two lumens are one space;
    // lower down, a pore interrupts the envelope where the two membranes join
    const rimR = 0.06;
    const eo = Math.asin(PORE_A / RO), ei = Math.asin(PORE_A / RI);
    const outerA = join(arcR(RO, 0, S1.neck - d0), exc, arcR(RO, S1.neck + d0, CUT_PORE - eo)), outerB = arcR(RO, CUT_PORE + eo, Math.PI);
    const innerA = arcR(RI, 0, CUT_PORE - ei), innerB = arcR(RI, CUT_PORE + ei, Math.PI);
    const cutFace = new THREE.Group();
    cutFace.add(
      new THREE.Mesh(planeFill(ctx, [...outerA, ...innerA.slice().reverse()], [], 0.004), mLumen),
      new THREE.Mesh(planeFill(ctx, [...outerB, ...innerB.slice().reverse()], [], 0.004), mLumen),
    );
    const rimOuterR = new THREE.Group();
    rimOuterR.add(new THREE.Mesh(planeTube(ctx, outerA, rimR), mRim), new THREE.Mesh(planeTube(ctx, outerB, rimR), mRim));
    const rimInnerR = new THREE.Group();
    rimInnerR.add(new THREE.Mesh(planeTube(ctx, innerA, rimR), mRim), new THREE.Mesh(planeTube(ctx, innerB, rimR), mRim));
    cutFace.add(rimOuterR, rimInnerR);

    // cut face, left (−x) side: plain envelope
    cutFace.add(new THREE.Mesh(planeFill(ctx, mirror([...plainOuter, ...inner.slice().reverse()]), [], 0.004), mLumen));
    const rimOuterL = new THREE.Mesh(planeTube(ctx, mirror(plainOuter), rimR), mRim);
    const rimInnerL = new THREE.Mesh(planeTube(ctx, mirror(inner), rimR), mRim);
    cutFace.add(rimOuterL, rimInnerL);
    root.add(cutFace);

    // the end of the ER sheets at azimuth AZ_ER: a cut face of its own
    const erEnd = new THREE.Group();
    const endPoly = [...exc, ...arcR(RO, S1.neck + d0, S1.neck - d0)];
    erEnd.add(new THREE.Mesh(planeFill(ctx, endPoly, [], 0), mLumen), new THREE.Mesh(planeTube(ctx, exc, rimR), mRim));
    erEnd.rotation.y = AZ_ER - Math.PI / 2;
    root.add(erEnd);

    // ---------- pores: membrane lining joins outer to inner; a pore complex sits in the opening ----------
    const pores = new THREE.Group();
    const complexes = new THREE.Group();
    const ringGeo = ctx.track(new THREE.TorusGeometry(PORE_A - 0.05, 0.075, 8, 28).rotateX(Math.PI / 2));
    const halfRingGeo = ctx.track(new THREE.TorusGeometry(PORE_A - 0.05, 0.075, 8, 14, Math.PI).rotateX(Math.PI / 2));
    const spokeGeo = ctx.track(new THREE.SphereGeometry(0.085, 10, 8));
    const fullPore = poreMembrane(ctx, PORE_A, RHO, false);
    const halfPore = poreMembrane(ctx, PORE_A, RHO, true);
    const addPore = (u: THREE.Vector3, half: boolean) => {
      const f = frame(u);
      const p0 = u.clone().multiplyScalar(RM);
      const lining = new THREE.Mesh(half ? halfPore.geometry : fullPore.geometry, mMem);
      lining.applyMatrix4(f);
      lining.position.copy(p0);
      pores.add(lining);
      const npc = new THREE.Group();
      for (const y of [-(RHO + 0.03), RHO + 0.03]) {
        const ring = new THREE.Mesh(half ? halfRingGeo : ringGeo, mNPC);
        ring.position.y = y;
        npc.add(ring);
      }
      for (let k = 0; k < 8; k++) {
        const psi = (k * Math.PI) / 4 + Math.PI / 8;
        if (half && Math.cos(psi) < 0) continue;
        const s = new THREE.Mesh(spokeGeo, mNPC);
        const rr = PORE_A - RHO - 0.02;
        s.position.set(rr * Math.sin(psi), 0, rr * Math.cos(psi));
        npc.add(s);
      }
      npc.applyMatrix4(f);
      npc.position.copy(p0);
      complexes.add(npc);
      return { f, p0 };
    };
    poreDirs.forEach((u) => addPore(u, false));
    const cut = addPore(cutPore, true);
    // where the pore lining meets the cut plane: the two membranes visibly join
    const X = new THREE.Vector3().setFromMatrixColumn(cut.f, 0);
    for (const sgn of [1, -1]) {
      const pts: P2[] = halfPore.profile.map(([rr, y]) => {
        const p = cut.p0.clone().addScaledVector(X, sgn * rr).addScaledVector(cutPore, y);
        return [p.x, p.y];
      });
      pores.add(new THREE.Mesh(planeTube(ctx, pts, rimR), mRim));
    }
    root.add(pores, complexes);

    // ---------- chromatin, heterochromatin and the nucleolus ----------
    const chromatin = new THREE.Group();
    for (let k = 0; k < 7; k++) {
      const pts: THREE.Vector3[] = [];
      let p = new THREE.Vector3((rand() - 0.5) * 3.4, (rand() - 0.5) * 3.4, -0.7 - rand() * 2);
      for (let i = 0; i < 9; i++) {
        pts.push(p.clone());
        p = p.clone().add(new THREE.Vector3((rand() - 0.5) * 1.6, (rand() - 0.5) * 1.6, (rand() - 0.5) * 1.0));
        if (p.length() > 2.9) p.multiplyScalar(2.6 / p.length());
        p.z = Math.min(-0.4, p.z);
      }
      chromatin.add(new THREE.Mesh(ctx.track(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), 70, 0.045, 5, false)), mChrom));
    }
    const hetero = new THREE.Group();
    const heteroDirs: THREE.Vector3[] = [];
    for (let tries = 0; heteroDirs.length < 10 && tries < 2000; tries++) {
      const u = dir(0.4 + rand() * 2.3, Math.PI / 2 + 0.25 + rand() * (Math.PI - 0.5));
      if (u.z > -0.35) continue;
      if ([...heteroDirs, ...poreDirs].some((v) => v.angleTo(u) < 0.36)) continue;
      heteroDirs.push(u);
    }
    heteroDirs.forEach((u, i) => {
      const b = new THREE.Mesh(ctx.track(blobGeometry(0.28 + rand() * 0.12, 0.7 + rand() * 0.35, 60 + i, 0.18, 12)), mHetero);
      b.position.copy(u.clone().multiplyScalar(RI - 0.22));
      b.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3().crossVectors(u, new THREE.Vector3(0.3, 1, 0.2)).normalize());
      b.scale.set(1, 1, 0.5);
      hetero.add(b);
    });
    chromatin.add(hetero);
    root.add(chromatin);

    const NUCLEOLUS = new THREE.Vector3(-0.9, 0.95, -1.7);
    const nucleolus = new THREE.Mesh(ctx.track(blobGeometry(0.95, 1.9, 11, 0.1, 20)), mNucleolus);
    nucleolus.position.copy(NUCLEOLUS);
    nucleolus.rotation.z = 0.5;
    root.add(nucleolus);

    // ---------- mRNA leaving through the cut pore, translated by ribosomes in the cytoplasm ----------
    const P0 = cut.p0, U = cutPore;
    const zb = (z: number) => new THREE.Vector3(0, 0, z);
    const mPts = [
      P0.clone().addScaledVector(U, -2.3).addScaledVector(X, 0.6).add(zb(-0.9)),
      P0.clone().addScaledVector(U, -1.3).addScaledVector(X, -0.25).add(zb(-0.5)),
      P0.clone().addScaledVector(U, -0.5).add(zb(-0.14)),
      P0.clone().add(zb(-0.12)),
      P0.clone().addScaledVector(U, 0.6).add(zb(-0.15)),
      P0.clone().addScaledVector(U, 1.35).addScaledVector(X, 0.45).add(zb(-0.3)),
      P0.clone().addScaledVector(U, 2.15).addScaledVector(X, -0.15).add(zb(-0.45)),
      P0.clone().addScaledVector(U, 2.95).addScaledVector(X, 0.55).add(zb(-0.35)),
    ];
    const mCurve = new THREE.CatmullRomCurve3(mPts, false, 'centripetal');
    const mrna = new THREE.Group();
    mrna.add(new THREE.Mesh(ctx.track(new THREE.TubeGeometry(mCurve, 80, 0.05, 6, false)), mRNA));
    const bigSub = ctx.track(new THREE.SphereGeometry(0.17, 12, 8));
    const smallSub = ctx.track(new THREE.SphereGeometry(0.12, 10, 8));
    const polysome = new THREE.Group();
    for (const s of [0.66, 0.8, 0.94]) {
      const p = mCurve.getPointAt(s);
      const big = new THREE.Mesh(bigSub, mRibo); big.position.copy(p).add(new THREE.Vector3(0.05, 0.16, 0.06));
      const small = new THREE.Mesh(smallSub, mRibo); small.position.copy(p).add(new THREE.Vector3(-0.04, -0.12, 0.05));
      polysome.add(big, small);
    }
    mrna.add(polysome);
    root.add(mrna);

    // ---------- ribosomes ----------
    const riboGeo = ctx.track(new THREE.SphereGeometry(0.08, 7, 5));
    // bound to the outer membrane (cytoplasmic face only)
    const onNucleus: THREE.Vector3[] = [];
    for (let tries = 0; onNucleus.length < 230 && tries < 9000; tries++) {
      const phi = Math.acos(1 - 2 * rand());
      const az = Math.PI / 2 + rand() * Math.PI;
      const u = dir(phi, az);
      if (holes.some((h) => h.axis.angleTo(u) < (PORE_A + 0.14) / RO)) continue;
      if (az < AZ_ER && Math.abs(phi - S1.neck) < 0.09) continue;
      onNucleus.push(u.multiplyScalar(RO + 0.09));
    }
    // bound to both faces of each ER sheet (both face the cytoplasm)
    const onER: THREE.Vector3[] = [];
    for (const [S, face, count] of [[S1, -1, 70], [S1, 1, 90], [S2, -1, 80], [S2, 1, 110]] as const) {
      for (let i = 0, tries = 0; i < count && tries < 3000; tries++) {
        const phi = S.a + 0.04 + rand() * (S.b - S.a - 0.08);
        const az = Math.PI / 2 + 0.01 + rand() * (AZ_ER - Math.PI / 2 - 0.02);
        const nk = face === 1 ? (S === S1 ? S2.neck : -9) : S.neck;
        if (Math.abs(phi - nk) < 0.08) continue;
        onER.push(dir(phi, az).multiplyScalar(S.r + face * (W / 2 + 0.09)));
        i++;
      }
    }
    const bound = instanced(riboGeo, mRibo, [...onNucleus, ...onER]);
    // free ribosomes in the cytoplasm, clear of the nucleus and the ER
    const inSheet = (p: THREE.Vector3) => {
      const r = p.length();
      const phi = Math.acos(p.y / r);
      const az = Math.atan2(p.x, p.z);
      const azN = az < 0 ? az + Math.PI * 2 : az;
      return azN <= AZ_ER + 0.15 && [S1, S2].some((S) => Math.abs(r - S.r) < W / 2 + 0.3 && phi > S.a - 0.1 && phi < S.b + 0.1);
    };
    const freePts = scatter(rand, 120, [new THREE.Vector3(-6.6, -5.0, -3.6), new THREE.Vector3(7.4, 6.2, -0.15)], (p) => {
      if (p.length() < RO + 0.35) return false;
      if (inSheet(p)) return false;
      if (mPts.some((q) => q.distanceTo(p) < 0.45)) return false;
      return (p.x / 7.6) ** 2 + ((p.y - 0.5) / 6.2) ** 2 < 1;
    }, 0.3);
    const free = instanced(riboGeo, mRibo, freePts);
    root.add(bound, free);

    // ---------- anchors ----------
    const nearest = (pts: THREE.Vector3[], t: THREE.Vector3) => pts.reduce((b, p) => (p.distanceTo(t) < b.distanceTo(t) ? p : b), pts[0]!);
    const at3 = (p: P2, z = 0.05): [number, number, number] => [p[0], p[1], z];
    const complexPore = poreDirs.reduce((b, u) => (u.z < b.z ? u : b), poreDirs[0]!);
    const cpx = complexPore.clone().multiplyScalar(RI - 0.1);
    const freeP = nearest(freePts, new THREE.Vector3(-5.2, 2.6, -1));
    const mrnaP = mCurve.getPointAt(0.72).add(new THREE.Vector3(0, 0, 0.1));
    const chromP = heteroDirs.reduce((b, u) => (u.y < b.y && u.x > -0.2 ? u : b), heteroDirs[0]!).clone().multiplyScalar(RI - 0.5);
    const anchors = {
      envelope: { object: anchorAt(root, ...at3(mirror([polar(RM, 0.62)])[0]!), 'envelope'), highlight: [envelope, cutFace] },
      outer: { object: anchorAt(root, ...at3(polar(RO + 0.45, S1.neck)), 'outer'), highlight: [outerMem, rimOuterR, rimOuterL] },
      inner: { object: anchorAt(root, ...at3(mirror([polar(RI, 2.75)])[0]!), 'inner'), highlight: [innerMem, rimInnerR, rimInnerL] },
      space: { object: anchorAt(root, ...at3(mirror([polar(RM, 1.35)])[0]!), 'space'), highlight: [cutFace] },
      pore: { object: anchorAt(root, P0.x + X.x * (PORE_A + 0.15) + U.x * 0.3, P0.y + X.y * (PORE_A + 0.15) + U.y * 0.3, 0.1, 'pore'), highlight: [pores] },
      complex: { object: anchorAt(root, cpx.x, cpx.y, cpx.z, 'complex'), highlight: [complexes] },
      chromatin: { object: anchorAt(root, chromP.x, chromP.y, chromP.z, 'chromatin'), highlight: [chromatin] },
      nucleolus: { object: anchorAt(root, NUCLEOLUS.x + 0.2, NUCLEOLUS.y + 0.1, NUCLEOLUS.z + 0.9, 'nucleolus'), highlight: [nucleolus] },
      rer: { object: anchorAt(root, ...at3(polar(S2.r, 1.05)), 'rer'), highlight: [outerMem, erEnd] },
      bound: { object: anchorAt(root, ...at3(polar(S1.r + W / 2 + 0.1, 0.62), 0.08), 'bound'), highlight: [bound] },
      mrna: { object: anchorAt(root, mrnaP.x, mrnaP.y, mrnaP.z, 'mrna'), highlight: [mrna] },
      free: { object: anchorAt(root, freeP.x, freeP.y, freeP.z, 'free'), highlight: [free] },
      cytoplasm: { object: anchorAt(root, -5.4, -3.9, -2.2, 'cytoplasm'), highlight: [] },
    };
    return { anchors, dispose() { root.removeFromParent(); } };
  },
};

export default scene;
