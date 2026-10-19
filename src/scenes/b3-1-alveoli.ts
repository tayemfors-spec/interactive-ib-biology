import * as THREE from 'three';
import type { SceneModule } from '../viewer3d/types';
import { anchorAt, blobGeometry, rng, setInstance } from '../viewer3d/kit';
import { ease, phase } from '../lib/timeline';
import { along, onSphere, setOriented, tube, vec } from './b3-1-kit';

/*
 * B3.1 alveoli: a cluster of alveoli at the end of a bronchiole, each wrapped in capillaries.
 * The front alveolus is cut in half by the plane z = 0 (the reader looks into its back half), so its wall
 * is seen in section at the rim: type I pneumocytes form the thin wall, type II pneumocytes bulge into the
 * air space and secrete surfactant, and capillaries (endothelium one cell thick, red blood cells in single file)
 * press against the outside of the wall. Proportions are schematic: an alveolus is ≈ 0.2–0.3 mm across, a
 * capillary ≈ 5–8 µm and the air–blood barrier ≈ 0.5 µm, so the wall and capillaries are drawn far too thick.
 * Blood enters from a pulmonary arteriole on the left (deoxygenated) and leaves by a venule on the right.
 * Steps: 0 ventilation · 1 O₂ diffuses into the blood · 2 CO₂ diffuses out · 3 blood flow keeps the gradients.
 */
const R = 3.0; // radius of the cut alveolus
const C0 = new THREE.Vector3(0.5, -0.8, 0);
const WALL = 0.12;
const MOUTH = 0.42; // polar angle of the opening into the alveolar duct (at the top)
const RC = R + 0.15; // capillary centre-line radius
const CAP_R = 0.13;
const RINGS = [0.85, 1.2, 1.55, 1.9, 2.25, 2.6];

const scene: SceneModule = {
  camera: { position: [1.0, 1.4, 16.5], target: [0.4, 0.6, -1.2], fov: 38, minDistance: 6, maxDistance: 34 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    const rand = rng(31);
    const DS = THREE.DoubleSide;

    const mWall = ctx.material('tail', { roughness: 0.7, side: DS });
    const mCut = ctx.material('head', { roughness: 0.6, side: DS });
    const mAlv = ctx.material('tail', { roughness: 0.75 });
    const mAir = ctx.material('head', { roughness: 0.55 });
    const mCap = ctx.material('chol', { roughness: 0.45, transparent: true, opacity: 0.62, side: DS });
    const mArt = ctx.material('protein', { roughness: 0.45 });
    const mVen = ctx.material('k', { roughness: 0.45 });
    const mType2 = ctx.material('protein2', { roughness: 0.5 });
    const mGran = ctx.material('glucose', { roughness: 0.4 });
    const mNuc = ctx.material('head', { roughness: 0.6 });
    const mSurf = ctx.material('carb', { roughness: 0.3, transparent: true, opacity: 0.22, side: DS, depthWrite: false });

    // ---------- the cut alveolus: back half of a spherical shell with an opening at the top ----------
    const cut = new THREE.Group();
    const shell = (r: number) => ctx.track(new THREE.SphereGeometry(r, 56, 36, Math.PI, Math.PI, MOUTH, Math.PI - MOUTH));
    const outer = new THREE.Mesh(shell(R), mWall);
    const inner = new THREE.Mesh(shell(R - WALL), mWall);
    // the cut face of the wall, where the plane z = 0 slices through it
    const rimFace = new THREE.Mesh(ctx.track(new THREE.RingGeometry(R - WALL, R, 96, 1, Math.PI / 2 + MOUTH, 2 * Math.PI - 2 * MOUTH)), mCut);
    for (const m of [outer, inner, rimFace]) m.position.copy(C0);
    cut.add(outer, inner, rimFace);
    root.add(cut);
    const surfactant = new THREE.Mesh(shell(R - WALL - 0.035), mSurf);
    surfactant.position.copy(C0);
    root.add(surfactant);

    // type I pneumocyte nuclei: flattened bulges on the inner surface of the thin wall
    const nucGeo = ctx.track(new THREE.SphereGeometry(1, 14, 10));
    const nucDirs = [[-0.45, -0.1, -0.89], [0.35, -0.55, -0.76], [0.1, 0.45, -0.89], [-0.8, -0.45, -0.4], [0.82, -0.1, -0.56], [-0.2, -0.85, -0.48]];
    const type1 = new THREE.InstancedMesh(nucGeo, mNuc, nucDirs.length);
    nucDirs.forEach((d, i) => {
      const n = new THREE.Vector3(...(d as [number, number, number])).normalize();
      setOriented(type1, i, C0.clone().addScaledVector(n, R - WALL - 0.03), n, 0.26, 0.06, 0.18);
    });
    root.add(type1);

    // type II pneumocytes: rounded cells bulging into the air space, with surfactant granules (lamellar bodies)
    const type2 = new THREE.Group();
    const granPts: THREE.Vector3[] = [];
    const t2Dirs = [new THREE.Vector3(-0.62, -0.5, -0.6).normalize(), new THREE.Vector3(0.66, 0.32, -0.68).normalize()];
    for (const [k, n] of t2Dirs.entries()) {
      const cell = new THREE.Mesh(ctx.track(blobGeometry(0.3, 0.62, 60 + k, 0.1, 16)), mType2);
      cell.position.copy(C0).addScaledVector(n, R - WALL - 0.12);
      cell.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
      type2.add(cell);
      for (let g = 0; g < 6; g++) {
        const off = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(0.3);
        granPts.push(C0.clone().addScaledVector(n, R - WALL - 0.36).add(off.projectOnPlane(n)));
      }
    }
    root.add(type2);
    const granules = new THREE.InstancedMesh(ctx.track(new THREE.SphereGeometry(0.065, 10, 8)), mGran, granPts.length);
    granPts.forEach((p, i) => setInstance(granules, i, p));
    root.add(granules);

    // ---------- capillaries around the cut alveolus ----------
    // latitude rings run across the back half and are cut at both ends by the plane z = 0;
    // u = 0 at the left end (from the arteriole) and u = 1 at the right end (to the venule)
    const capillaries = new THREE.Group();
    const ringPaths: THREE.CatmullRomCurve3[] = [];
    for (const [k, th] of RINGS.entries()) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 16; i++) {
        const u = i / 16;
        const wob = i === 0 || i === 16 ? 0 : 0.07 * Math.sin(u * 9 + k * 2);
        pts.push(onSphere(C0, RC, th + wob, 2 * Math.PI - Math.PI * u));
      }
      const { curve, geo } = tube(ctx, pts, CAP_R, 64, 10);
      ringPaths.push(curve);
      capillaries.add(new THREE.Mesh(geo, mCap));
    }
    // meridians join the rings into a network
    for (const ph of [1.2, 1.4, 1.6, 1.8]) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 10; i++) {
        const th = RINGS[0]! + (i / 10) * (RINGS[RINGS.length - 1]! - RINGS[0]!);
        pts.push(onSphere(C0, RC, th, Math.PI * ph + 0.05 * Math.sin(i * 1.7 + ph * 5)));
      }
      capillaries.add(new THREE.Mesh(tube(ctx, pts, CAP_R * 0.85, 48, 8).geo, mCap));
    }
    root.add(capillaries);

    // ---------- the rest of the cluster: whole alveoli, each in a basket of capillaries ----------
    // positions are given relative to the original layout and spread out to fit around the cut alveolus
    const others0: [number, number, number, number][] = [
      [-2.7, 2.3, -1.6, 1.5], [3.7, 2.0, -1.7, 1.5], [-1.2, 4.1, -2.4, 1.35], [2.5, 4.3, -2.5, 1.35], [0.7, 3.2, -3.4, 1.5],
      [-3.6, -0.7, -1.9, 1.6], [4.6, -1.0, -1.9, 1.55], [-1.9, -3.4, -2.4, 1.5], [3.1, -3.6, -2.3, 1.45],
    ];
    const others = others0.map(([x, y, z, r]) => [C0.x + (x - 0.6) * 1.2, C0.y + (y + 0.6) * 1.2, z * 1.1, r] as [number, number, number, number]);
    const alvGeo = ctx.track(new THREE.SphereGeometry(1, 32, 22));
    const alveoli = new THREE.Group();
    const otherCaps = new THREE.Group();
    for (const [x, y, z, r] of others) {
      const a = new THREE.Mesh(alvGeo, mAlv);
      a.position.set(x, y, z);
      a.scale.setScalar(r);
      alveoli.add(a);
      const c = new THREE.Vector3(x, y, z);
      for (let k = 0; k < 6; k++) {
        // a random great circle on the alveolus surface
        const n = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize();
        const e1 = new THREE.Vector3().crossVectors(n, Math.abs(n.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)).normalize();
        const e2 = new THREE.Vector3().crossVectors(n, e1);
        const pts = Array.from({ length: 14 }, (_, i) => {
          const a2 = (i / 14) * Math.PI * 2;
          return c.clone().addScaledVector(e1, Math.cos(a2) * (r + 0.08)).addScaledVector(e2, Math.sin(a2) * (r + 0.08));
        });
        otherCaps.add(new THREE.Mesh(tube(ctx, pts, 0.09, 40, 6, true).geo, mCap));
      }
    }
    root.add(alveoli, otherCaps);

    // ---------- airway: terminal bronchiole → alveolar duct → opening of the cut alveolus ----------
    const ductEnd = onSphere(C0, R - 0.2, 0.05, 1.5 * Math.PI).add(new THREE.Vector3(0, 0, -0.7));
    const airPath = [vec([-6.2, 8.8, -5.2]), vec([-4.2, 6.8, -4.0]), vec([-1.9, 4.8, -2.6]), vec([0.0, 3.4, -1.5]), ductEnd];
    const bronchiole = new THREE.Mesh(tube(ctx, airPath.slice(0, 4), 0.5, 48, 14).geo, mAir);
    const duct = new THREE.Mesh(tube(ctx, airPath.slice(2), 0.4, 32, 14).geo, mAir);
    root.add(bronchiole, duct);

    // ---------- pulmonary arteriole (in, left) and venule (out, right) ----------
    const leftEnd = onSphere(C0, RC, RINGS[2]!, 2 * Math.PI - 0.12);
    const rightEnd = onSphere(C0, RC, RINGS[3]!, Math.PI + 0.12);
    const artPts = [vec([-7.0, 7.0, -4.5]), vec([-5.2, 4.2, -2.8]), vec([-4.2, 1.0, -1.2]), leftEnd];
    const venPts = [rightEnd, vec([4.6, 0.3, -1.0]), vec([6.2, 3.6, -2.8]), vec([7.4, 7.0, -4.4])];
    const arteriole = new THREE.Mesh(tube(ctx, artPts, 0.24, 48, 12).geo, mArt);
    const venule = new THREE.Mesh(tube(ctx, venPts, 0.24, 48, 12).geo, mVen);
    root.add(arteriole, venule);

    // ---------- red blood cells, single file in the cut alveolus's capillaries ----------
    const rbcGeo = ctx.track(new THREE.SphereGeometry(1, 16, 10));
    const PER_RING = 5;
    const N_RBC = RINGS.length * PER_RING;
    const rbcOxy = new THREE.InstancedMesh(rbcGeo, ctx.material('k', { roughness: 0.4 }), N_RBC);
    const rbcDeoxy = new THREE.InstancedMesh(rbcGeo, ctx.material('protein', { roughness: 0.4 }), N_RBC);
    root.add(rbcOxy, rbcDeoxy);
    const rbcU0 = Array.from({ length: N_RBC }, (_, i) => ((i % PER_RING) + 0.15 + 0.5 * rand()) / PER_RING);
    const tmp = new THREE.Vector3();
    const tan = new THREE.Vector3();
    const placeRBCs = (shift: number) => {
      let o = 0, d = 0;
      for (let i = 0; i < N_RBC; i++) {
        const curve = ringPaths[Math.floor(i / PER_RING)]!;
        const u = (rbcU0[i]! + shift) % 1;
        curve.getPointAt(u, tmp);
        curve.getTangentAt(u, tan);
        // blood picks up oxygen within the first third of the capillary
        if (u > 0.33) setOriented(rbcOxy, o++, tmp, tan, 0.115, 0.05);
        else setOriented(rbcDeoxy, d++, tmp, tan, 0.115, 0.05);
      }
      rbcOxy.count = o; rbcDeoxy.count = d;
      rbcOxy.instanceMatrix.needsUpdate = true; rbcDeoxy.instanceMatrix.needsUpdate = true;
    };
    placeRBCs(0);

    // ---------- gas molecules ----------
    const o2Geo = ctx.track(new THREE.CapsuleGeometry(0.075, 0.1, 4, 10));
    const co2Geo = ctx.track(new THREE.CapsuleGeometry(0.07, 0.24, 4, 10));
    const CAP = 60;
    const o2 = new THREE.InstancedMesh(o2Geo, ctx.material('neutral', { roughness: 0.35 }), CAP);
    const co2 = new THREE.InstancedMesh(co2Geo, ctx.material('text', { roughness: 0.4 }), CAP);
    o2.count = 0; co2.count = 0;
    root.add(o2, co2);

    const lumen = () => {
      for (;;) {
        const p = new THREE.Vector3(rand() * 2 - 1, rand() * 2 - 1, -rand()).multiplyScalar(R * 0.72);
        if (p.length() < R * 0.72 && p.z < -0.25) return p.add(C0);
      }
    };
    /** A point on a capillary near the cut (visible at the rim) or across the back wall. */
    const capPoint = (k: number) => {
      const ring = ringPaths[k % RINGS.length]!;
      const us = [0.05, 0.95, 0.5, 0.3, 0.7, 0.12, 0.88, 0.42];
      return ring.getPointAt(us[k % us.length]!);
    };
    const wallPoint = (p: THREE.Vector3) => p.clone().sub(C0).setLength(R - WALL / 2).add(C0);
    type P = { kind: 'o2' | 'co2'; base?: THREE.Vector3; path?: THREE.Vector3[]; t0?: number; t1?: number; ph: number; fade?: boolean };
    const wander = (kind: P['kind'], n: number): P[] => Array.from({ length: n }, () => ({ kind, base: lumen(), ph: rand() * 6.28 }));
    const intoBlood = (k: number) => { const c = capPoint(k); const l = lumen(); return [l, wallPoint(c).lerp(l, 0.06), wallPoint(c), c]; };
    const fromBlood = (k: number) => intoBlood(k).reverse();
    const inflow = () => [...airPath.map((p) => p.clone().add(new THREE.Vector3((rand() - 0.5) * 0.3, 0, (rand() - 0.5) * 0.3))), lumen()];

    const steps: P[][] = [
      // 0 · ventilation: stale air (CO₂-rich) is breathed out, then fresh air (O₂-rich) is breathed in
      [
        ...wander('o2', 6),
        ...Array.from({ length: 9 }, (_, i): P => ({ kind: 'co2', path: inflow().reverse(), t0: 0.02 + i * 0.035, t1: 0.3 + i * 0.035, ph: 0, fade: true })),
        ...Array.from({ length: 14 }, (_, i): P => ({ kind: 'o2', path: inflow(), t0: 0.5 + i * 0.022, t1: 0.7 + i * 0.022, ph: 0 })),
        ...wander('co2', 2),
      ],
      // 1 · O₂ diffuses from the alveolar air into the blood (a few move back: diffusion is a net movement)
      [
        ...wander('o2', 16),
        ...wander('co2', 3),
        ...Array.from({ length: 10 }, (_, i): P => ({ kind: 'o2', path: intoBlood(i), t0: 0.04 + i * 0.05, t1: 0.42 + i * 0.05, ph: 0 })),
        { kind: 'o2', path: fromBlood(11), t0: 0.35, t1: 0.8, ph: 0 },
      ],
      // 2 · CO₂ diffuses from the blood into the alveolar air
      [
        ...wander('o2', 16),
        ...wander('co2', 3),
        ...Array.from({ length: 10 }, (_, i): P => ({ kind: 'co2', path: fromBlood(i + 3), t0: 0.04 + i * 0.05, t1: 0.42 + i * 0.05, ph: 0 })),
        { kind: 'co2', path: intoBlood(2), t0: 0.35, t1: 0.8, ph: 0 },
      ],
      // 3 · blood flow and ventilation keep both gradients steep
      [
        ...wander('o2', 16),
        ...wander('co2', 3),
        ...Array.from({ length: 6 }, (_, i): P => ({ kind: 'o2', path: inflow(), t0: 0.1 + i * 0.1, t1: 0.35 + i * 0.1, ph: 0 })),
      ],
    ];

    const anchors = {
      bronchiole: { object: anchorAt(root, -0.1, 3.5, -1.0, 'bronchiole'), highlight: [bronchiole, duct] },
      alveolus: { object: anchorAt(root, others[1]![0], others[1]![1], others[1]![2] + others[1]![3], 'alveolus'), highlight: [alveoli] },
      air: { object: anchorAt(root, C0.x - 0.4, C0.y + 0.5, -1.3, 'air'), highlight: [cut] },
      capillaries: { object: anchorAt(root, others[5]![0], others[5]![1] - 0.3, others[5]![2] + others[5]![3], 'capillaries'), highlight: [otherCaps, capillaries] },
      arteriole: { object: anchorAt(root, -5.2, 4.2, -2.6, 'arteriole'), highlight: [arteriole] },
      venule: { object: anchorAt(root, 4.1, 0.0, -0.4, 'venule'), highlight: [venule] },
      type1: { object: anchorAt(root, ...onSphere(C0, R - WALL - 0.05, 1.9, 1.38 * Math.PI).toArray(), 'type1'), highlight: [type1, inner] },
      type2: { object: anchorAt(root, ...C0.clone().addScaledVector(t2Dirs[0]!, R - WALL - 0.4).toArray(), 'type2'), highlight: [type2] },
      surfactant: { object: anchorAt(root, ...C0.clone().addScaledVector(t2Dirs[1]!, R - WALL - 0.45).toArray(), 'surfactant'), highlight: [surfactant, granules] },
      endothelium: { object: anchorAt(root, ...onSphere(C0, RC + CAP_R, RINGS[4]!, 2 * Math.PI).toArray(), 'endothelium'), highlight: [capillaries] },
      rbc: { object: anchorAt(root, ...onSphere(C0, RC, RINGS[1]!, Math.PI).add(new THREE.Vector3(0, 0, 0.12)).toArray(), 'rbc'), highlight: [rbcOxy, rbcDeoxy] },
      diffusion: { object: anchorAt(root, ...onSphere(C0, R, RINGS[3]!, Math.PI).toArray(), 'diffusion'), highlight: [rimFace] },
    };

    return {
      anchors,
      durations: [7, 6, 6, 7],
      render(index, t) {
        placeRBCs(index === 3 ? t * 0.5 : 0);
        const counts = { o2: 0, co2: 0 };
        for (const p of steps[index]!) {
          const mesh = p.kind === 'o2' ? o2 : co2;
          const i = counts[p.kind]++;
          if (i >= CAP) continue;
          if (p.path) {
            const u = ease(phase(t, p.t0!, Math.min(1, p.t1!)));
            along(p.path, u, tmp);
            along(p.path, Math.min(1, u + 0.02), tan).sub(tmp);
            if (tan.lengthSq() < 1e-8) tan.set(1, 0.3, 0);
            // exhaled CO₂ leaves the model at the top of the bronchiole
            const s = p.fade ? 1 - phase(t, p.t1! - 0.04, p.t1!) : 1;
            setOriented(mesh, i, tmp, tan, Math.max(0.001, s), Math.max(0.001, s));
          } else {
            const b = p.base!;
            tmp.set(b.x + 0.18 * Math.sin(t * 7 + p.ph), b.y + 0.15 * Math.cos(t * 6 + p.ph * 1.3), b.z + 0.12 * Math.sin(t * 5 + p.ph * 0.7));
            tan.set(Math.sin(p.ph), Math.cos(p.ph * 1.7), Math.sin(p.ph * 0.6));
            setOriented(mesh, i, tmp, tan);
          }
        }
        o2.count = Math.min(CAP, counts.o2); co2.count = Math.min(CAP, counts.co2);
        o2.instanceMatrix.needsUpdate = true; co2.instanceMatrix.needsUpdate = true;
        // the blood vessels stand out in the blood-flow step
        mCap.opacity = index === 3 ? 0.5 : 0.62;
      },
      dispose() { root.removeFromParent(); },
    };
  },
};

export default scene;
