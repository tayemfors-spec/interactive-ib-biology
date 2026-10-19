import * as THREE from 'three';
import type { SceneModule } from '../viewer3d/types';
import { anchorAt, rng } from '../viewer3d/kit';
import { DASHES, HALF_ANGLE, OH_LEN, hDirections, hideInstance, placeHBond, placeRod, waterKit } from './a1-1-molecule';

/*
 * A1.1 liquid water: a droplet of ~50 molecules (units: Å). Positions come from deterministic random
 * packing, relaxed so that neighbours sit about 2.75–2.9 Å apart in a roughly tetrahedral arrangement, at roughly the number density of liquid
 * water (≈ 0.033 molecules per Å³, a little denser than ice).
 * Hydrogen bonds (O–H···O) are assigned greedily between close neighbours: each molecule donates at
 * most two (one per H) and accepts at most two (one per lone pair), so it bonds to at most four others.
 * One "featured" molecule near the front is given all four, tetrahedrally, for the labels.
 * Idle motion: molecules jiggle and turn slightly, and most bonds blink off and on again, standing in
 * for hydrogen bonds that last only picoseconds before breaking and re-forming with other neighbours.
 */
const N = 52;
const R = 7.0;
const MIN_OO = 2.55;
const MAX_OO = 3.5;
const FEAT = new THREE.Vector3(0.6, 0.4, 3.3);

interface Mol { c: THREE.Vector3; q: THREE.Quaternion; donates: number[]; accepts: number[] }

const scene: SceneModule = {
  camera: { position: [4, 5, 25], target: [0, 0, 0], fov: 38, minDistance: 8, maxDistance: 45 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    const kit = waterKit(ctx);
    const rand = rng(1101);

    // ---------- positions ----------
    const mols: Mol[] = [];
    const add = (c: THREE.Vector3) => { mols.push({ c, q: new THREE.Quaternion(), donates: [], accepts: [] }); return mols.length - 1; };
    // Featured molecule (index 0) with four tetrahedral neighbours (1–4).
    add(FEAT.clone());
    const tet = [new THREE.Vector3(1, 1, 1), new THREE.Vector3(-1, -1, 1), new THREE.Vector3(-1, 1, -1), new THREE.Vector3(1, -1, -1)].map((v) => v.normalize());
    // Tilt the tetrahedron so that all four neighbours are visible from the camera.
    const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.35, 0.5, 0.2));
    for (const t of tet) add(FEAT.clone().addScaledVector(t.clone().applyQuaternion(tilt), 2.8));
    // The featured molecule donates to 1 and 2 and accepts from 3 and 4.
    mols[0]!.donates.push(1, 2); mols[1]!.accepts.push(0); mols[2]!.accepts.push(0);
    mols[3]!.donates.push(0); mols[4]!.donates.push(0); mols[0]!.accepts.push(3, 4);

    const blockedView = (p: THREE.Vector3) => p.z > FEAT.z + 0.8 && Math.hypot(p.x - FEAT.x, p.y - FEAT.y) < 3.2;
    let tries = 0;
    while (mols.length < N && tries++ < 200000) {
      const p = new THREE.Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).multiplyScalar(R);
      if (p.length() > R || blockedView(p)) continue; // keep a clear line of sight to the featured molecule
      if (mols.every((m) => m.c.distanceTo(p) >= 2.2)) add(p);
    }
    // Relax the packing with a simple water-like potential (in the spirit of the Stillinger–Weber model):
    // neighbours closer than 2.75 Å push apart, those up to 3.5 Å attract weakly towards ≈2.85 Å, and
    // pairs of neighbours of the same molecule are pushed towards the tetrahedral angle (cos θ = −1/3),
    // which is what hydrogen bonding favours. The featured five stay fixed.
    const force = mols.map(() => new THREE.Vector3());
    const d = new THREE.Vector3();
    const va = new THREE.Vector3(), vb = new THREE.Vector3(), ga = new THREE.Vector3(), gb = new THREE.Vector3();
    for (let it = 0; it < 900; it++) {
      force.forEach((f) => f.set(0, 0, 0));
      const nb: number[][] = mols.map(() => []);
      for (let i = 0; i < mols.length; i++) for (let j = i + 1; j < mols.length; j++) {
        d.subVectors(mols[j]!.c, mols[i]!.c);
        const r = d.length();
        if (r > 3.5) continue;
        if (r < 3.3) { nb[i]!.push(j); nb[j]!.push(i); }
        const k = r < MIN_OO + 0.2 ? 1.0 * (MIN_OO + 0.2 - r) : -0.08 * (r - 2.85);
        d.multiplyScalar(k / Math.max(r, 1e-3));
        force[i]!.sub(d);
        force[j]!.add(d);
      }
      for (let i = 0; i < mols.length; i++) {
        const list = nb[i]!;
        for (let x = 0; x < list.length; x++) for (let y = x + 1; y < list.length; y++) {
          const j = list[x]!, k = list[y]!;
          va.subVectors(mols[j]!.c, mols[i]!.c); vb.subVectors(mols[k]!.c, mols[i]!.c);
          const la = va.length(), lb = vb.length();
          const cos = va.dot(vb) / (la * lb);
          const w = 0.4 * (cos + 1 / 3);
          // d(cos)/d(va) and d(cos)/d(vb)
          ga.copy(vb).divideScalar(la * lb).addScaledVector(va, -cos / (la * la)).multiplyScalar(-w);
          gb.copy(va).divideScalar(la * lb).addScaledVector(vb, -cos / (lb * lb)).multiplyScalar(-w);
          force[j]!.add(ga); force[k]!.add(gb); force[i]!.sub(ga).sub(gb);
        }
      }
      for (let i = 5; i < mols.length; i++) {
        const c = mols[i]!.c;
        c.addScaledVector(force[i]!.clampLength(0, 0.3), 0.5);
        if (c.length() > R) c.setLength(R);
        if (blockedView(c)) {
          const rx = c.x - FEAT.x, ry = c.y - FEAT.y, rr = Math.hypot(rx, ry) || 1;
          c.x = FEAT.x + (rx / rr) * 3.2; c.y = FEAT.y + (ry / rr) * 3.2;
        }
      }
    }

    // ---------- hydrogen-bond network ----------
    const dirTo = (i: number, j: number) => new THREE.Vector3().subVectors(mols[j]!.c, mols[i]!.c).normalize();
    const partners = (i: number) => [...mols[i]!.donates, ...mols[i]!.accepts];
    // Bonds at one molecule must point in clearly different directions (≈ tetrahedral arrangement).
    const fits = (i: number, j: number) => partners(i).every((k) => dirTo(i, k).angleTo(dirTo(i, j)) > THREE.MathUtils.degToRad(75));
    const pairs: [number, number, number][] = [];
    for (let i = 0; i < mols.length; i++) for (let j = i + 1; j < mols.length; j++) {
      const d = mols[i]!.c.distanceTo(mols[j]!.c);
      if (d <= MAX_OO) pairs.push([i, j, d]);
    }
    pairs.sort((a, b) => a[2] - b[2]);
    for (const [i, j] of pairs) {
      if (i === 0 || j === 0) continue; // featured molecule already has its four
      if (partners(i).includes(j)) continue;
      if (!fits(i, j) || !fits(j, i)) continue;
      const [d, a] = rand() < 0.5 ? [i, j] : [j, i];
      if (mols[d]!.donates.length < 2 && mols[a]!.accepts.length < 2) { mols[d]!.donates.push(a); mols[a]!.accepts.push(d); }
      else if (mols[a]!.donates.length < 2 && mols[d]!.accepts.length < 2) { mols[a]!.donates.push(d); mols[d]!.accepts.push(a); }
    }

    // ---------- orientations: point each O–H at the molecule it donates to ----------
    const hLocal: [THREE.Vector3, THREE.Vector3] = hDirections(new THREE.Vector3(0, -1, 0), new THREE.Vector3(1, 0, 0));
    const hDirs: [THREE.Vector3, THREE.Vector3][] = mols.map((m, i) => {
      if (m.donates.length === 2) {
        const u1 = dirTo(i, m.donates[0]!), u2 = dirTo(i, m.donates[1]!);
        const b = u1.clone().add(u2).normalize();
        const e = u1.clone().sub(u2).normalize();
        return hDirections(b, e);
      }
      const away = new THREE.Vector3();
      for (const k of m.accepts) away.sub(dirTo(i, k));
      if (m.donates.length === 1) {
        const u1 = dirTo(i, m.donates[0]!);
        const w = m.accepts.length ? away.clone().negate() : new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5);
        const axis = new THREE.Vector3().crossVectors(u1, w);
        if (axis.lengthSq() < 1e-6) axis.set(u1.y, -u1.x, 0.3);
        axis.normalize();
        // rotate away from the acceptor directions (the lone pairs point at the donors)
        const u2 = u1.clone().applyAxisAngle(axis, -2 * HALF_ANGLE);
        return [u1, u2];
      }
      // no donations: H atoms point away from any molecules this one accepts from
      const b = away.lengthSq() > 1e-6 ? away.normalize() : new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize();
      const e = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).projectOnPlane(b).normalize();
      return hDirections(b, e);
    });
    // Store each orientation as a quaternion from the local frame, so idle motion can wobble it.
    const basis = (a: THREE.Vector3, b: THREE.Vector3) => {
      const x = a.clone().sub(b).normalize();
      const y = a.clone().add(b).normalize().negate();
      const z = new THREE.Vector3().crossVectors(x, y);
      return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
    };
    const local = basis(hLocal[0], hLocal[1]).invert();
    mols.forEach((m, i) => m.q.copy(basis(hDirs[i]![0], hDirs[i]![1]).multiply(local)));

    // ---------- meshes ----------
    type Bond = { d: number; h: 0 | 1; a: number; phase: number; speed: number };
    const bonds: Bond[] = [];
    mols.forEach((m, i) => m.donates.forEach((a, k) => bonds.push({ d: i, h: k as 0 | 1, a, phase: rand() * Math.PI * 2, speed: 0.5 + rand() * 0.9 })));
    const featBonds = bonds.filter((b) => b.d === 0 || b.a === 0);
    const otherBonds = bonds.filter((b) => b.d !== 0 && b.a !== 0);

    const others = mols.length - 1;
    const oMesh = new THREE.InstancedMesh(kit.oGeo, kit.mO, others);
    const hMesh = new THREE.InstancedMesh(kit.hGeo, kit.mH, others * 2);
    const sticks = new THREE.InstancedMesh(kit.rodGeo, kit.mBond, others * 2);
    const dashes = new THREE.InstancedMesh(kit.dashGeo, kit.mHB, Math.max(1, otherBonds.length * DASHES));
    dashes.count = otherBonds.length * DASHES;
    // the featured molecule and its four bonds are separate meshes so they can be highlighted alone
    const featGroup = new THREE.Group();
    const fO = new THREE.Mesh(kit.oGeo, kit.mO);
    const fH = [new THREE.Mesh(kit.hGeo, kit.mH), new THREE.Mesh(kit.hGeo, kit.mH)];
    const fSticks = new THREE.InstancedMesh(kit.rodGeo, kit.mBond, 2);
    featGroup.add(fO, fH[0]!, fH[1]!, fSticks);
    const featDashes = new THREE.InstancedMesh(kit.dashGeo, kit.mHB, featBonds.length * DASHES);
    root.add(oMesh, hMesh, sticks, dashes, featGroup, featDashes);

    // ---------- drawing (static or with idle motion) ----------
    const wob = mols.map(() => ({ p: [rand() * 6.3, rand() * 6.3, rand() * 6.3], axis: new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize(), w: 0.8 + rand() * 0.8 }));
    const cNow = mols.map((m) => m.c.clone());
    const qNow = mols.map((m) => m.q.clone());
    const hPos = mols.map(() => [new THREE.Vector3(), new THREE.Vector3()] as [THREE.Vector3, THREE.Vector3]);
    const tmpQ = new THREE.Quaternion();
    const tmpM = new THREE.Matrix4();
    const one = new THREE.Vector3(1, 1, 1);

    const draw = (time: number, moving: boolean) => {
      mols.forEach((m, i) => {
        const w = wob[i]!;
        const amp = moving && i !== 0 ? 0.13 : 0;
        cNow[i]!.set(m.c.x + amp * Math.sin(time * w.w + w.p[0]!), m.c.y + amp * Math.sin(time * w.w * 1.1 + w.p[1]!), m.c.z + amp * Math.sin(time * w.w * 0.9 + w.p[2]!));
        tmpQ.setFromAxisAngle(w.axis, moving && i !== 0 ? 0.16 * Math.sin(time * w.w * 1.3 + w.p[0]!) : 0);
        qNow[i]!.copy(tmpQ).multiply(m.q);
        for (const k of [0, 1] as const) hPos[i]![k].copy(hLocal[k]).applyQuaternion(qNow[i]!).multiplyScalar(OH_LEN).add(cNow[i]!);
      });
      for (let i = 1; i < mols.length; i++) {
        tmpM.compose(cNow[i]!, qNow[i]!, one);
        oMesh.setMatrixAt(i - 1, tmpM);
        for (const k of [0, 1] as const) {
          tmpM.compose(hPos[i]![k], qNow[i]!, one);
          hMesh.setMatrixAt(2 * (i - 1) + k, tmpM);
          placeRod(sticks, 2 * (i - 1) + k, cNow[i]!, hPos[i]![k]);
        }
      }
      fO.position.copy(cNow[0]!);
      fH.forEach((h, k) => h.position.copy(hPos[0]![k]!));
      placeRod(fSticks, 0, cNow[0]!, hPos[0]![0]);
      placeRod(fSticks, 1, cNow[0]!, hPos[0]![1]);
      featBonds.forEach((b, n) => placeHBond(featDashes, n * DASHES, hPos[b.d]![b.h], cNow[b.a]!));
      otherBonds.forEach((b, n) => {
        // a bond is "broken" for part of each cycle while the reader has motion turned on
        const on = !moving || Math.sin(time * b.speed + b.phase) > -0.45;
        if (on) placeHBond(dashes, n * DASHES, hPos[b.d]![b.h], cNow[b.a]!);
        else for (let k = 0; k < DASHES; k++) hideInstance(dashes, n * DASHES + k);
      });
      for (const im of [oMesh, hMesh, sticks, dashes, fSticks, featDashes]) im.instanceMatrix.needsUpdate = true;
    };
    draw(0, false);

    // ---------- anchors ----------
    const f = mols[0]!.c;
    // a front-facing ordinary bond for the "hydrogen bond" label
    const front = otherBonds.reduce((best, b) => {
      const z = (hPos[b.d]![b.h].z + mols[b.a]!.c.z) / 2;
      const bz = (hPos[best.d]![best.h].z + mols[best.a]!.c.z) / 2;
      return z - 0.25 * Math.abs(hPos[b.d]![b.h].x + 4) > bz - 0.25 * Math.abs(hPos[best.d]![best.h].x + 4) ? b : best;
    }, otherBonds[0]!);
    const hbMid = hPos[front.d]![front.h].clone().lerp(mols[front.a]!.c, 0.5);
    // ordinary molecules/bonds for the general labels, spread around the droplet away from the featured one
    const frontish = (p: THREE.Vector3, x: number, y: number) => p.z - 0.35 * Math.hypot(p.x - x, p.y - y);
    const cov = mols.map((m, i) => ({ m, i })).filter(({ i }) => i > 4).reduce((b, o) => (frontish(o.m.c, -4, -3.5) > frontish(b.m.c, -4, -3.5) ? o : b), { m: mols[5]!, i: 5 });
    const stickMid = cov.m.c.clone().lerp(hPos[cov.i]![0], 0.5);
    const da = otherBonds.reduce((b, o) => (frontish(hPos[o.d]![o.h], 4, -2.5) > frontish(hPos[b.d]![b.h], 4, -2.5) ? o : b), otherBonds[0]!);
    const dH = hPos[da.d]![da.h];
    const accBond = featBonds.find((b) => b.a === 0)!;
    const accMid = hPos[accBond.d]![accBond.h].clone().lerp(f, 0.5);

    const anchors = {
      molecule: { object: anchorAt(root, f.x + 0.1, f.y + 0.35, f.z + 0.3, 'molecule'), highlight: [featGroup] },
      'four-bonds': { object: anchorAt(root, accMid.x, accMid.y, accMid.z + 0.1, 'four-bonds'), highlight: [featDashes] },
      covalent: { object: anchorAt(root, stickMid.x, stickMid.y, stickMid.z + 0.1, 'covalent'), highlight: [sticks, fSticks] },
      'delta-attraction': { object: anchorAt(root, dH.x, dH.y, dH.z + 0.2, 'delta-attraction'), highlight: [dashes] },
      hbond: { object: anchorAt(root, hbMid.x, hbMid.y, hbMid.z + 0.1, 'hbond'), highlight: [dashes, featDashes] },
      network: { object: anchorAt(root, -R * 0.55, R * 0.85, 1.5, 'network'), highlight: [dashes] },
    };

    let time = 0;
    return {
      anchors,
      idle(dt) { time += dt; draw(time, true); },
      dispose() { root.removeFromParent(); },
    };
  },
};

export default scene;
