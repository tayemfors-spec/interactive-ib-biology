import * as THREE from 'three';
import type { SceneModule } from '../viewer3d/types';
import { anchorAt, rng } from '../viewer3d/kit';
import { DS, type P2, arc, dnaLoop, instanced, lathe, lollipops, planeFill, planeTube, scatter } from './b2-2-kit';

/*
 * B2.2 chloroplast (AHL), a lens shape cut through by the plane z = 0; long axis along x.
 * Schematic: ≈ 12 units long (≈ 5 µm); the envelope gap, thylakoid lumen, proteins and ribosomes are
 * drawn larger than they are.
 *
 * Topology that matters:
 *  - the envelope is two membranes (outer and inner) around the stroma;
 *  - thylakoids are a third, separate membrane system inside: flattened sacs, each enclosing its own small
 *    lumen, stacked into grana and joined by single stroma lamellae (whose lumen is continuous with them);
 *  - photosystems are in the thylakoid membranes; ATP synthase heads project into the stroma, mainly
 *    from unstacked membrane (lamellae and the ends of grana);
 *  - the stroma holds the Calvin cycle enzymes (e.g. Rubisco), starch grains, 70S ribosomes and DNA.
 */
const RX = 6.2, RY = 2.5, RZ = 3.8, GAP = 0.3;
const IX = RX - GAP, IY = RY - GAP, IZ = RZ - GAP;
const DR = 0.74, DT = 0.2, STEP = 0.27, MEM = 0.055; // thylakoid disc radius, thickness, stacking step, membrane

/** Profile (radius, height) of an ellipsoid standing on the y axis. */
const ellipse = (ry: number, rx: number, n = 40): P2[] =>
  Array.from({ length: n + 1 }, (_, i) => { const t = (i / n) * Math.PI; return [Math.max(1e-4, ry * Math.sin(t)), -rx * Math.cos(t)] as P2; });
const outline = (rx: number, ry: number): P2[] => arc(0, 0, 1, 0, Math.PI * 2, 72).slice(0, -1).map(([x, y]) => [x * rx, y * ry]);
const rect = (w: number, h: number): P2[] => [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];

const scene: SceneModule = {
  camera: { position: [0.4, 3.3, 13.6], target: [0, -0.2, -1.0], fov: 38, minDistance: 5, maxDistance: 36 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    const rand = rng(71);

    const mOuter = ctx.material('head', { roughness: 0.5, side: DS });
    const mInner = ctx.material('head', { roughness: 0.45, metalness: 0.25, side: DS });
    const mRim = ctx.material('head', { roughness: 0.35, metalness: 0.6 });
    const mGap = ctx.material('neutral', { roughness: 0.7, side: DS });
    const mThy = ctx.material('carb', { roughness: 0.5, side: DS });
    const mLumen = ctx.material('water', { roughness: 0.6, side: DS });
    const mPS = ctx.material('protein2', { roughness: 0.45 });
    const mATPase = ctx.material('protein', { roughness: 0.4 });
    const mStarch = ctx.material('glucose', { roughness: 0.65 });
    const mEnz = ctx.material('tail', { roughness: 0.6 });
    const mRibo = ctx.material('text', { roughness: 0.55 });
    const mDNA = ctx.material('na', { roughness: 0.45 });

    // ---------- the envelope: two membranes ----------
    const shell = (rx: number, ry: number, rz: number, mat: THREE.Material) => {
      const g = lathe(ctx, ellipse(ry, rx), Math.PI / 2, Math.PI * 1.5, 56);
      g.scale(1, 1, rz / ry);
      g.rotateZ(-Math.PI / 2);
      return new THREE.Mesh(g, mat);
    };
    const outer = shell(RX, RY, RZ, mOuter);
    const inner = shell(IX, IY, IZ, mInner);
    const outerLine = outline(RX, RY), innerLine = outline(IX, IY);
    const gap = new THREE.Mesh(planeFill(ctx, outerLine, [innerLine], 0.004), mGap);
    const rimOuter = new THREE.Mesh(planeTube(ctx, outerLine, 0.055, true), mRim);
    const rimInner = new THREE.Mesh(planeTube(ctx, innerLine, 0.05, true), mRim);
    root.add(outer, inner, gap, rimOuter, rimInner);

    // ---------- thylakoids: grana (stacks) cut at the front, whole ones further back ----------
    const halfDisc = ctx.track(new THREE.CylinderGeometry(DR, DR, DT, 24, 1, false, Math.PI / 2, Math.PI));
    const fullDisc = ctx.track(new THREE.CylinderGeometry(DR, DR, DT, 24));
    const faceOuter = planeFill(ctx, rect(2 * DR, DT), [], 0.004);
    const faceLumen = planeFill(ctx, rect(2 * DR - 2 * MEM, DT - 2 * MEM), [], 0.007);
    const grana = new THREE.Group();
    const lumens = new THREE.Group();
    type Stack = { x: number; z: number; y0: number; count: number };
    const stacks: Stack[] = [];
    const addStack = (x: number, yOff: number, z: number, cut: boolean) => {
      const f = 1 - (x / IX) ** 2 - (z / IZ) ** 2;
      const halfH = IY * Math.sqrt(Math.max(0, f)) - 0.3;
      const count = Math.max(3, Math.min(7, Math.floor((2 * halfH * 0.85) / STEP)));
      const y0 = yOff - ((count - 1) * STEP) / 2;
      for (let i = 0; i < count; i++) {
        const y = y0 + i * STEP;
        const d = new THREE.Mesh(cut ? halfDisc : fullDisc, mThy);
        d.position.set(x, y, z);
        grana.add(d);
        if (cut) {
          const o = new THREE.Mesh(faceOuter, mThy); o.position.set(x, y, 0); grana.add(o);
          const l = new THREE.Mesh(faceLumen, mLumen); l.position.set(x, y, 0); lumens.add(l);
        }
      }
      const s = { x, z, y0, count };
      stacks.push(s);
      return s;
    };
    const front = [[-4.0, 0.2], [-1.55, -0.25], [0.95, 0.3], [3.45, -0.15]].map(([x, y]) => addStack(x!, y!, 0, true));
    [[-2.75, -0.1], [0.1, 0.15], [2.75, -0.2]].forEach(([x, y]) => addStack(x!, y!, -2.0, false));

    // stroma lamellae: single thylakoids joining neighbouring grana, cut at the front as well
    const lamellae = new THREE.Group();
    const lamFaces: { x: number; y: number; a: number; len: number }[] = [];
    const LZ = 0.95;
    for (let i = 0; i < front.length - 1; i++) {
      const A = front[i]!, B = front[i + 1]!;
      for (const [ka, kb] of [[1, A.count - 2], [B.count - 2, 1]] as const) {
        const ya = A.y0 + Math.min(A.count - 1, ka) * STEP, yb = B.y0 + Math.min(B.count - 1, kb) * STEP;
        const xa = A.x + DR * 0.55, xb = B.x - DR * 0.55;
        const len = Math.hypot(xb - xa, yb - ya), a = Math.atan2(yb - ya, xb - xa);
        const box = new THREE.Mesh(ctx.track(new THREE.BoxGeometry(len, DT * 0.8, LZ)), mThy);
        box.position.set((xa + xb) / 2, (ya + yb) / 2, -LZ / 2 - 0.002);
        box.rotation.z = a;
        lamellae.add(box);
        const o = new THREE.Mesh(planeFill(ctx, rect(len, DT * 0.8), [], 0.004), mThy);
        const l = new THREE.Mesh(planeFill(ctx, rect(len + 0.02, DT * 0.8 - 2 * MEM), [], 0.007), mLumen);
        for (const m of [o, l]) { m.position.set((xa + xb) / 2, (ya + yb) / 2, 0); m.rotation.z = a; }
        lamellae.add(o);
        lumens.add(l);
        lamFaces.push({ x: (xa + xb) / 2, y: (ya + yb) / 2, a, len });
      }
    }
    root.add(grana, lamellae, lumens);

    // ---------- proteins in the thylakoid membranes ----------
    const psPts: THREE.Vector3[] = [];
    const atpItems: { at: THREE.Vector3; dir: THREE.Vector3 }[] = [];
    for (const s of stacks) {
      const top = s.y0 + (s.count - 1) * STEP + DT / 2;
      const cut = s.z === 0;
      for (let k = 0, tries = 0; k < 7 && tries < 200; tries++) {
        const r = 0.12 + rand() * (DR - 0.25), t = rand() * Math.PI * 2;
        const z = s.z + r * Math.cos(t);
        if (cut && z > -0.1) continue;
        const p = new THREE.Vector3(s.x + r * Math.sin(t), top + 0.02, z);
        if ([...psPts, ...atpItems.map((a) => a.at)].some((q) => q.distanceTo(p) < 0.24)) continue;
        if (k < 4) psPts.push(p); else atpItems.push({ at: p, dir: new THREE.Vector3(0, 1, 0) });
        k++;
      }
    }
    lamellae.children.forEach((m) => {
      if (!(m instanceof THREE.Mesh) || !(m.geometry instanceof THREE.BoxGeometry)) return;
      const len = (m.geometry.parameters as { width: number }).width;
      const nrm = new THREE.Vector3(-Math.sin(m.rotation.z), Math.cos(m.rotation.z), 0);
      const along = new THREE.Vector3(Math.cos(m.rotation.z), Math.sin(m.rotation.z), 0);
      for (let k = 0; k < 5; k++) {
        const u = (k + 0.5) / 5 - 0.5;
        const z = -0.2 - rand() * (LZ - 0.35);
        const side = k % 2 === 0 ? 1 : -1;
        const at = m.position.clone().addScaledVector(along, u * len * 0.8).addScaledVector(nrm, side * DT * 0.4).setZ(z);
        if (k === 2) psPts.push(at.clone().addScaledVector(nrm, side * 0.02));
        else atpItems.push({ at, dir: nrm.clone().multiplyScalar(side) });
      }
    });
    const psGeo = ctx.track(new THREE.SphereGeometry(0.1, 10, 8).scale(1, 0.55, 1));
    const photosystems = instanced(psGeo, mPS, psPts);
    const atp = lollipops(ctx, atpItems, mATPase, mATPase, 0.9);
    root.add(photosystems, atp.group);

    // ---------- the stroma: starch, Calvin cycle enzymes, 70S ribosomes, DNA ----------
    const starch = new THREE.Group();
    const starchDefs = [[-2.8, -1.25, -1.05, 0.42, 0.32, 0.5], [2.2, 1.18, -1.1, 0.42, 0.3, 0.5]] as const;
    for (const [x, y, z, a, b, c] of starchDefs) {
      const s = new THREE.Mesh(ctx.track(new THREE.SphereGeometry(1, 20, 14).scale(a, b, c)), mStarch);
      s.position.set(x, y, z);
      starch.add(s);
    }
    const dna = new THREE.Group();
    const dnaDefs = [[-5.0, -0.1, -0.9, 2], [0.0, -1.45, -1.5, 9]] as const;
    for (const [x, y, z, seed] of dnaDefs) {
      const loop = new THREE.Mesh(dnaLoop(ctx, 0.32, 0.03, seed), mDNA);
      loop.position.set(x, y, z);
      dna.add(loop);
    }
    root.add(starch, dna);
    const inStroma = (p: THREE.Vector3, pad: number) => {
      if ((p.x / (IX - pad)) ** 2 + (p.y / (IY - pad)) ** 2 + (p.z / (IZ - pad)) ** 2 >= 1) return false;
      for (const s of stacks) {
        const top = s.y0 + (s.count - 1) * STEP + DT / 2 + 0.3, bot = s.y0 - DT / 2 - 0.1;
        if (Math.hypot(p.x - s.x, p.z - s.z) < DR + pad + 0.05 && p.y > bot - pad && p.y < top + pad) return false;
      }
      for (const f of lamFaces) {
        const dx = p.x - f.x, dy = p.y - f.y;
        const u = dx * Math.cos(f.a) + dy * Math.sin(f.a), v = -dx * Math.sin(f.a) + dy * Math.cos(f.a);
        if (Math.abs(u) < f.len / 2 + 0.1 && Math.abs(v) < DT + 0.2 + pad && p.z > -LZ - 0.2) return false;
      }
      for (const [x, y, z, a, b, c] of starchDefs) if (((p.x - x) / (a + pad)) ** 2 + ((p.y - y) / (b + pad)) ** 2 + ((p.z - z) / (c + pad)) ** 2 < 1) return false;
      for (const [x, y, z] of dnaDefs) if (Math.hypot(p.x - x, p.y - y, p.z - z) < 0.45) return false;
      return true;
    };
    const box: [THREE.Vector3, THREE.Vector3] = [new THREE.Vector3(-IX, -IY, -IZ), new THREE.Vector3(IX, IY, -0.12)];
    const enzPts = scatter(rand, 380, box, (p) => inStroma(p, 0.08), 0.13);
    const enzymes = instanced(ctx.track(new THREE.IcosahedronGeometry(0.045, 0)), mEnz, enzPts);
    const riboPts = scatter(rand, 36, box, (p) => inStroma(p, 0.14) && p.z < -0.35, 0.5);
    const ribosomes = instanced(ctx.track(new THREE.SphereGeometry(0.085, 10, 8)), mRibo, riboPts);
    root.add(enzymes, ribosomes);

    // ---------- anchors ----------
    const nearest = (pts: THREE.Vector3[], t: THREE.Vector3) => pts.reduce((b, p) => (p.distanceTo(t) < b.distanceTo(t) ? p : b), pts[0]!);
    const g1 = front[1]!, g2 = front[2]!, g0 = front[0]!, g3 = front[3]!;
    const psP = nearest(psPts, new THREE.Vector3(g1.x - 0.2, 2, -0.4));
    const atpP = nearest(atpItems.map((a) => a.at.clone().addScaledVector(a.dir, 0.22)), new THREE.Vector3(-0.3, 0.6, -0.3));
    const riboP = nearest(riboPts, new THREE.Vector3(1.8, -1.0, -1.0));
    const lam = lamFaces[3]!;
    // the DNA label sits on the strand of the loop lying free in the stroma between the middle grana (the other
    // loop is tucked beside the left granum): its vertex nearest the viewer
    const loopMesh = dna.children[1] as THREE.Mesh;
    const lp = loopMesh.geometry.getAttribute('position');
    const dnaP = new THREE.Vector3(-Infinity, 0, -Infinity);
    for (let i = 0; i < lp.count; i++) if (lp.getZ(i) > dnaP.z) dnaP.set(lp.getX(i), lp.getY(i), lp.getZ(i));
    dnaP.add(loopMesh.position);
    const anchors = {
      outer: { object: anchorAt(root, -1.0, RY * Math.sqrt(1 - (1 / RX) ** 2), 0.06, 'outer'), highlight: [outer, rimOuter] },
      inner: { object: anchorAt(root, 1.5, -IY * Math.sqrt(1 - (1.5 / IX) ** 2), 0.06, 'inner'), highlight: [inner, rimInner] },
      stroma: { object: anchorAt(root, -0.35, 1.2, -1.4, 'stroma'), highlight: [enzymes] },
      granum: { object: anchorAt(root, g2.x - DR, g2.y0 + Math.floor(g2.count / 2) * STEP, 0.06, 'granum'), highlight: [grana] },
      thylakoid: { object: anchorAt(root, g0.x + 0.2, g0.y0 + (g0.count - 1) * STEP + DT / 2, -0.25, 'thylakoid'), highlight: [grana, lamellae] },
      lumen: { object: anchorAt(root, g3.x + 0.25, g3.y0 + 2 * STEP, 0.08, 'lumen'), highlight: [lumens] },
      lamella: { object: anchorAt(root, lam.x, lam.y, 0.08, 'lamella'), highlight: [lamellae] },
      photosystem: { object: anchorAt(root, psP.x, psP.y + 0.05, psP.z, 'photosystem'), highlight: [photosystems] },
      'atp-synthase': { object: anchorAt(root, atpP.x, atpP.y, atpP.z, 'atp-synthase'), highlight: [atp.group] },
      starch: { object: anchorAt(root, -2.8, -1.25, -0.5, 'starch'), highlight: [starch] },
      ribosomes: { object: anchorAt(root, riboP.x, riboP.y, riboP.z, 'ribosomes'), highlight: [ribosomes] },
      dna: { object: anchorAt(root, dnaP.x, dnaP.y, dnaP.z + 0.03, 'dna'), highlight: [dna] },
    };
    return { anchors, dispose() { root.removeFromParent(); } };
  },
};

export default scene;
