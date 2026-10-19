import * as THREE from 'three';
import type { SceneModule } from '../viewer3d/types';
import { anchorAt, rng, setInstance } from '../viewer3d/kit';

/*
 * C1.3 chloroplast cut in half. The plane z = 0 is the cut face and only the half behind it (z ≤ 0) is
 * drawn, so the reader looks into the stroma from the +z side. Topology that matters:
 *  - two separate membranes (envelope) with a narrow intermembrane space;
 *  - thylakoids are closed, flattened sacs, each with its own lumen (thylakoid space), stacked into grana;
 *  - lamellae (intergranal thylakoids) join thylakoids in different grana; they never touch the envelope;
 *  - starch grains, 70S ribosomes and a loop of naked DNA lie free in the stroma, outside the thylakoids.
 * Schematic proportions: a real chloroplast is ≈ 5–10 µm long and grana are ≈ 0.5 µm across.
 */
const RX = 6.2, RY = 2.7, RZ = 3.4; // outer membrane semi-axes
const GAP = 0.2; // intermembrane space
const IRX = RX - GAP - 0.12, IRY = RY - GAP - 0.12, IRZ = RZ - GAP - 0.12;
const DISC_R = 0.66, DISC_H = 0.15, DISC_STEP = 0.21;
/** grana: x, z, centre y, number of thylakoids; z = 0 ones are cut in half at the cut face */
const GRANA = [
  { x: -4.1, z: 0, y: 0.15, n: 7 },
  { x: -1.45, z: 0, y: -0.2, n: 10 },
  { x: 1.25, z: 0, y: 0.25, n: 9 },
  { x: 3.85, z: 0, y: -0.1, n: 6 },
  { x: -2.8, z: -1.5, y: 0.1, n: 8 },
  { x: 0, z: -1.6, y: -0.15, n: 9 },
  { x: 2.6, z: -1.5, y: 0.2, n: 7 },
];

const inside = (x: number, y: number, z: number, m = 0) => (x / (IRX - m)) ** 2 + (y / (IRY - m)) ** 2 + (z / (IRZ - m)) ** 2 < 1;

const scene: SceneModule = {
  camera: { position: [1.2, 6.2, 12.6], target: [0, -0.5, -1.0], fov: 38, minDistance: 6, maxDistance: 30 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    const DS = THREE.DoubleSide;
    const rand = rng(13);

    // ---------- envelope: two half-ellipsoid shells with rims at the cut face ----------
    const mOuter = ctx.material('carb', { roughness: 0.6, side: DS, transparent: true, opacity: 0.55, depthWrite: false });
    const mInner = ctx.material('carb', { roughness: 0.7, side: DS });
    const mStroma = ctx.material('neutral', { roughness: 0.9, side: DS });
    const mRim = ctx.material('carb', { roughness: 0.5 });
    const half = (rx: number, ry: number, rz: number) => ctx.track(new THREE.SphereGeometry(1, 64, 32, Math.PI, Math.PI).scale(rx, ry, rz));
    const outer = new THREE.Mesh(half(RX, RY, RZ), mOuter);
    const inner = new THREE.Mesh(half(RX - GAP, RY - GAP, RZ - GAP), mInner);
    // a slightly smaller pale shell behind the inner membrane gives the stroma its colour
    const stromaShell = new THREE.Mesh(half(IRX + 0.02, IRY + 0.02, IRZ + 0.02), mStroma);
    stromaShell.renderOrder = -1;
    const rim = (rx: number, ry: number, r: number) => {
      const pts = Array.from({ length: 96 }, (_, i) => { const a = (i / 96) * Math.PI * 2; return new THREE.Vector3(rx * Math.cos(a), ry * Math.sin(a), 0); });
      return new THREE.Mesh(ctx.track(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 192, r, 8, true)), mRim);
    };
    const outerRim = rim(RX, RY, 0.07);
    const innerRim = rim(RX - GAP, RY - GAP, 0.07);
    root.add(stromaShell, inner, outer, outerRim, innerRim);

    // ---------- grana: stacks of thylakoids (membrane sac + lumen) ----------
    const mThy = ctx.material('carb', { roughness: 0.45, metalness: 0.2, side: DS });
    const mLumen = ctx.material('water', { roughness: 0.6, side: DS });
    const cutDisc = ctx.track(new THREE.CylinderGeometry(DISC_R, DISC_R, DISC_H, 28, 1, false, Math.PI / 2, Math.PI));
    const cutLumen = ctx.track(new THREE.CylinderGeometry(DISC_R - 0.07, DISC_R - 0.07, DISC_H * 0.45, 28, 1, false, Math.PI / 2, Math.PI));
    const fullDisc = ctx.track(new THREE.CylinderGeometry(DISC_R, DISC_R, DISC_H, 28));
    const nCut = GRANA.filter((g) => g.z === 0).reduce((s, g) => s + g.n, 0);
    const nFull = GRANA.filter((g) => g.z !== 0).reduce((s, g) => s + g.n, 0);
    const cutThy = new THREE.InstancedMesh(cutDisc, mThy, nCut);
    const cutLum = new THREE.InstancedMesh(cutLumen, mLumen, nCut);
    const fullThy = new THREE.InstancedMesh(fullDisc, mThy, nFull);
    // flat cut faces of the thylakoids: a membrane-coloured rim around the lumen
    const faceGeo = ctx.track(new THREE.PlaneGeometry(DISC_R * 2, DISC_H));
    const faceLumenGeo = ctx.track(new THREE.PlaneGeometry(DISC_R * 2 - 0.14, DISC_H * 0.45));
    const faces = new THREE.InstancedMesh(faceGeo, mThy, nCut);
    const faceLumens = new THREE.InstancedMesh(faceLumenGeo, mLumen, nCut);
    const discY: Record<number, number[]> = {};
    let ic = 0, iff = 0;
    GRANA.forEach((g, gi) => {
      const y0 = g.y - ((g.n - 1) * DISC_STEP) / 2;
      discY[gi] = [];
      for (let k = 0; k < g.n; k++) {
        const y = y0 + k * DISC_STEP;
        discY[gi]!.push(y);
        const p = new THREE.Vector3(g.x, y, g.z);
        if (g.z === 0) {
          setInstance(cutThy, ic, p);
          setInstance(cutLum, ic, p);
          setInstance(faces, ic, new THREE.Vector3(g.x, y, 0.001));
          setInstance(faceLumens, ic, new THREE.Vector3(g.x, y, 0.003));
          ic++;
        } else setInstance(fullThy, iff++, p);
      }
    });
    const grana = new THREE.Group();
    grana.add(cutThy, cutLum, fullThy, faces, faceLumens);
    root.add(grana);

    // ---------- lamellae: flat single thylakoids joining grana ----------
    const lamellae = new THREE.Group();
    const lamella = (a: number, ak: number, b: number, bk: number) => {
      const A = GRANA[a]!, B = GRANA[b]!;
      const pa = new THREE.Vector3(A.x, discY[a]![ak]!, A.z === 0 ? -0.35 : A.z);
      const pb = new THREE.Vector3(B.x, discY[b]![bk]!, B.z === 0 ? -0.35 : B.z);
      const dir = pb.clone().sub(pa);
      const len = dir.length();
      const m = new THREE.Mesh(ctx.track(new THREE.BoxGeometry(len, DISC_H * 0.6, 0.55)), mThy);
      m.position.copy(pa).add(pb).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir.normalize());
      lamellae.add(m);
    };
    lamella(0, 2, 1, 4); lamella(1, 7, 2, 5); lamella(2, 2, 3, 3); lamella(0, 5, 4, 3); lamella(4, 6, 5, 7);
    lamella(5, 2, 6, 1); lamella(1, 1, 5, 1); lamella(6, 5, 2, 7); lamella(5, 5, 2, 3);
    root.add(lamellae);

    // ---------- starch grains ----------
    const mStarch = ctx.material('glucose', { roughness: 0.65 });
    const starchGeo = ctx.track(new THREE.SphereGeometry(1, 24, 16));
    const starch = new THREE.Group();
    for (const [x, y, z, sx, sy] of [[-2.75, -1.25, -0.75, 0.62, 0.36], [2.55, -1.15, -0.55, 0.5, 0.32]] as const) {
      const s = new THREE.Mesh(starchGeo, mStarch);
      s.position.set(x, y, z);
      s.scale.set(sx, sy, 0.5);
      starch.add(s);
    }
    root.add(starch);

    // ---------- 70S ribosomes (free in the stroma) ----------
    const ribGeo = ctx.track(new THREE.SphereGeometry(0.07, 8, 6));
    const mRib = ctx.material('text', { roughness: 0.6 });
    const nearGrana = (x: number, y: number, z: number) => GRANA.some((g) => Math.hypot(x - g.x, z - g.z) < DISC_R + 0.2 && Math.abs(y - g.y) < 1.4);
    const ribPts: THREE.Vector3[] = [];
    while (ribPts.length < 70) {
      const p = new THREE.Vector3((rand() * 2 - 1) * IRX, (rand() * 2 - 1) * IRY, -rand() * IRZ);
      if (!inside(p.x, p.y, p.z, 0.2) || nearGrana(p.x, p.y, p.z) || p.z > -0.12) continue;
      if (Math.hypot(p.x - 0.1, p.y + 1.55, p.z + 0.9) < 0.6) continue; // keep clear of the DNA
      ribPts.push(p);
    }
    const ribosomes = new THREE.InstancedMesh(ribGeo, mRib, ribPts.length);
    ribPts.forEach((p, i) => setInstance(ribosomes, i, p));
    root.add(ribosomes);

    // ---------- naked circular DNA ----------
    const dnaPts = Array.from({ length: 60 }, (_, i) => {
      const a = (i / 60) * Math.PI * 2;
      const r = 0.42 + 0.08 * Math.sin(5 * a);
      return new THREE.Vector3(0.1 + r * Math.cos(a), -1.55 + 0.18 * Math.sin(3 * a), -0.9 + r * Math.sin(a) * 0.8);
    });
    const dna = new THREE.Mesh(ctx.track(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(dnaPts, true), 160, 0.035, 6, true)), ctx.material('na', { roughness: 0.5 }));
    root.add(dna);

    const ribTarget = new THREE.Vector3(4.7, -0.9, -0.6);
    const rib = ribPts.reduce((a, b) => (b.distanceTo(ribTarget) < a.distanceTo(ribTarget) ? b : a));
    const g1 = GRANA[1]!, g2 = GRANA[2]!;
    const anchors = {
      'outer-membrane': { object: anchorAt(root, -RX * 0.62, RY * 0.79, 0.02, 'outer-membrane'), highlight: [outer, outerRim] },
      'inner-membrane': { object: anchorAt(root, -(RX - GAP) * 0.93, -(RY - GAP) * 0.36, 0.02, 'inner-membrane'), highlight: [inner, innerRim] },
      stroma: { object: anchorAt(root, -1.9, 1.75, -1.4, 'stroma'), highlight: [stromaShell] },
      granum: { object: anchorAt(root, g2.x - DISC_R, discY[2]![g2.n - 1]! + 0.1, 0.02, 'granum'), highlight: [grana] },
      thylakoid: { object: anchorAt(root, GRANA[0]!.x - DISC_R + 0.05, discY[0]![GRANA[0]!.n - 1]! + 0.08, 0.02, 'thylakoid'), highlight: [cutThy, faces] },
      lumen: { object: anchorAt(root, g1.x + 0.35, discY[1]![4]!, 0.01, 'lumen'), highlight: [cutLum, faceLumens] },
      lamella: { object: anchorAt(root, (GRANA[0]!.x + g1.x) / 2, (discY[0]![2]! + discY[1]![4]!) / 2, -0.25, 'lamella'), highlight: [lamellae] },
      starch: { object: anchorAt(root, -2.75, -1.25, -0.2, 'starch'), highlight: [starch] },
      ribosomes: { object: anchorAt(root, rib.x, rib.y, rib.z, 'ribosomes'), highlight: [ribosomes] },
      dna: { object: anchorAt(root, 0.52, -1.55, -0.9, 'dna'), highlight: [dna] },
      'light-dependent': { object: anchorAt(root, GRANA[6]!.x, discY[6]![GRANA[6]!.n - 1]! + 0.1, GRANA[6]!.z, 'light-dependent'), highlight: [cutThy, fullThy, faces, lamellae] },
      'light-independent': { object: anchorAt(root, 4.7, 0.6, -0.5, 'light-independent'), highlight: [stromaShell] },
    };

    return { anchors, dispose() { root.removeFromParent(); } };
  },
};

export default scene;
