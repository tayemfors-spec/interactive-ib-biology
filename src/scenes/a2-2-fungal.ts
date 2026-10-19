import * as THREE from 'three';
import type { SceneModule } from '../viewer3d/types';
import { anchorAt, rng } from '../viewer3d/kit';
import { DS, band, cutMitochondrion, cutNucleus, ellipseProfile, halfShell, instanced, pathTube, rim, scatter, tipTubeProfile } from './a2-2-kit';

/*
 * A2.2 fungal hypha (septate, e.g. Penicillium-like), cut lengthways by the plane z = 0, with an uncut,
 * branching hypha behind it for context (hyphae make up the mycelium). Schematic: 1 unit ≈ 2 µm, so the
 * hypha is ≈ 6 µm wide. The wall is chitin; the cross-wall (septum) has a central pore through which
 * cytoplasm, and even nuclei, can pass. The growing tip is packed with vesicles; older parts behind the
 * tip have large vacuoles. Fungi store glycogen (not starch) and have no chloroplasts.
 */
const R = 1.45;                 // outer radius of the wall
const WT = 0.3;                 // chitin wall thickness
const MEM = [R - WT - 0.02, R - WT - 0.1] as const;
const CY = MEM[1] - 0.01;
const X0 = -7, X1 = 4.6;        // open (older) end, and start of the domed tip
const SEPTUM = -2.2;

const scene: SceneModule = {
  camera: { position: [0.4, 6.0, 17.5], target: [-0.5, -1.2, -1.5], fov: 38, minDistance: 5, maxDistance: 40 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    const rand = rng(23);
    const ax = { axis: 'x' as const };

    const mWall = ctx.material('tail', { roughness: 0.8 });
    const mWallCut = ctx.material('tail', { roughness: 0.8, metalness: 0.3, side: DS });
    const mMem = ctx.material('head', { roughness: 0.5, side: DS });
    const mCyto = ctx.material('neutral', { roughness: 0.9, side: THREE.BackSide });
    const mVac = ctx.material('water', { roughness: 0.3, transparent: true, opacity: 0.3, depthWrite: false, side: DS });
    const mTono = ctx.material('water', { roughness: 0.4 });
    const mNuc = ctx.material('na', { roughness: 0.5, side: DS });
    const mDense = ctx.material('text', { roughness: 0.6 });
    const mChrom = ctx.material('na', { roughness: 0.5, metalness: 0.35 });
    const mMito = ctx.material('chol', { roughness: 0.5, side: DS });
    const mCrista = ctx.material('chol', { roughness: 0.5, metalness: 0.35, side: DS });
    const mVes = ctx.material('glucose', { roughness: 0.5 });
    const mER = ctx.material('protein', { roughness: 0.5 });
    const mBack = ctx.material('tail', { roughness: 0.85, metalness: 0.15 });

    // ---------- chitin wall, plasma membrane and cytoplasm of the cut hypha ----------
    const wallP = tipTubeProfile(R, X0, X1);
    const wallInP = tipTubeProfile(R - WT, X0, X1);
    const memOutP = tipTubeProfile(MEM[0], X0, X1);
    const memInP = tipTubeProfile(MEM[1], X0, X1);
    const cytoP = tipTubeProfile(CY, X0, X1);
    const wall = new THREE.Group();
    wall.add(new THREE.Mesh(halfShell(ctx, wallP, ax, 48), mWall), band(ctx, wallP, wallInP, mWallCut, ax));
    const membrane = band(ctx, memOutP, memInP, mMem, ax);
    membrane.add(new THREE.Mesh(halfShell(ctx, memOutP, ax, 48), mMem));
    const cytoplasm = new THREE.Mesh(halfShell(ctx, cytoP, ax, 48), mCyto);
    root.add(wall, membrane, cytoplasm);

    // open end: the hypha continues to the left (half rings show the wall and membrane in section)
    const endRing = (r0: number, r1: number, mat: THREE.Material) => {
      const g = new THREE.RingGeometry(r0, r1, 40, 1, -Math.PI / 2, Math.PI);
      g.rotateY(Math.PI / 2);
      g.translate(X0, 0, 0);
      return new THREE.Mesh(ctx.track(g), mat);
    };
    wall.add(endRing(R - WT, R, mWallCut));
    membrane.add(endRing(MEM[1], MEM[0], mMem));

    // ---------- septum: a cross-wall of chitin with a central pore, lined by plasma membrane ----------
    const septum = new THREE.Group();
    const sT = 0.22, pore = 0.24, sR = R - WT + 0.01;
    const sP = [new THREE.Vector2(pore, -sT / 2), new THREE.Vector2(sR, -sT / 2), new THREE.Vector2(sR, sT / 2), new THREE.Vector2(pore, sT / 2), new THREE.Vector2(pore, -sT / 2)];
    const sGeo = new THREE.LatheGeometry(sP, 40, Math.PI / 2, Math.PI);
    sGeo.rotateZ(-Math.PI / 2);
    sGeo.translate(SEPTUM, 0, 0);
    septum.add(new THREE.Mesh(ctx.track(sGeo), mWallCut));
    const face = (y0: number, y1: number, x: number, w: number, mat: THREE.Material, z = 0.004) => {
      const m = new THREE.Mesh(ctx.track(new THREE.PlaneGeometry(w, Math.abs(y1 - y0))), mat);
      m.position.set(x, (y0 + y1) / 2, z);
      return m;
    };
    for (const s of [1, -1]) {
      septum.add(face(s * pore, s * sR, SEPTUM, sT, mWallCut));
      // the plasma membrane lines both faces of the septum and continues through the pore
      membrane.add(face(s * (pore - 0.04), s * MEM[1], SEPTUM - sT / 2 - 0.04, 0.07, mMem, 0.006));
      membrane.add(face(s * (pore - 0.04), s * MEM[1], SEPTUM + sT / 2 + 0.04, 0.07, mMem, 0.006));
    }
    root.add(septum);

    // ---------- vacuoles: large in the older compartment, small nearer the tip ----------
    const vacuoles = new THREE.Group();
    const tonoplast = new THREE.Group();
    for (const [x, y, rx, ry] of [[-5.0, 0.18, 1.65, 0.74], [-0.95, 0.4, 0.6, 0.4]] as const) {
      const p = ellipseProfile(ry, rx);
      const o = { axis: 'x' as const, zScale: 0.9 };
      const v = new THREE.Mesh(halfShell(ctx, p, o, 36), mVac);
      v.position.set(x, y, 0);
      v.renderOrder = 2;
      vacuoles.add(v);
      const t = rim(ctx, p, 0.04, mTono, o);
      t.position.set(x, y, 0);
      tonoplast.add(t);
    }
    root.add(vacuoles, tonoplast);

    // ---------- nuclei (one or more per compartment) ----------
    const nuclei = new THREE.Group();
    const nucPos: [number, number][] = [[-2.95, -0.36], [0.6, -0.42], [2.75, 0.36]];
    const nucParts = nucPos.map(([x, y], i) => {
      const n = cutNucleus(ctx, 0.46, { envelope: mNuc, pore: mDense, nucleolus: mDense, chromatin: mChrom }, 30 + i);
      n.group.position.set(x, y, 0);
      nuclei.add(n.group);
      return n;
    });
    root.add(nuclei);

    // ---------- mitochondria ----------
    const mitos = new THREE.Group();
    const mitoDefs = [[-4.25, -0.74, 0.05], [-1.0, -0.6, -0.1], [1.75, -0.5, 0.2], [3.85, -0.42, -0.25], [-6.1, -0.72, 0.1]] as const;
    for (const [x, y, rot] of mitoDefs) {
      const m = cutMitochondrion(ctx, 0.95, 0.22, mMito, mCrista);
      m.group.position.set(x, y, 0);
      m.group.rotation.z = rot;
      mitos.add(m.group);
    }
    root.add(mitos);

    // ---------- ER tubules behind the cut ----------
    const er = new THREE.Group();
    for (const p of [
      [[-1.7, 0.45, -0.62], [-0.4, 0.6, -0.65], [1.0, 0.4, -0.7], [2.2, 0.6, -0.6]],
      [[0.2, -0.2, -0.8], [1.2, 0.05, -0.85], [2.0, -0.2, -0.75], [3.3, 0.05, -0.7]],
    ] as [number, number, number][][]) er.add(new THREE.Mesh(pathTube(ctx, p, 0.07, 50), mER));
    root.add(er);

    // ---------- vesicles packed into the growing tip ----------
    const inTip = (p: THREE.Vector3) => p.x > 3.6 && Math.hypot(Math.max(0, p.x - X1), p.y, p.z) < CY - 0.12 && p.z < -0.08;
    const vesPts = scatter(rand, 46, inTip, [new THREE.Vector3(3.6, -CY, -CY), new THREE.Vector3(X1 + CY, CY, -0.08)], [
      { c: new THREE.Vector3(3.85, -0.42, 0), r: 0.6 },
    ]);
    const vesicles = instanced(ctx.track(new THREE.SphereGeometry(0.1, 10, 8)), mVes, vesPts);
    root.add(vesicles);

    // ---------- glycogen granules ----------
    const inHypha = (p: THREE.Vector3) => p.x > X0 + 0.2 && p.x < X1 && Math.hypot(p.y, p.z) < CY - 0.1 && p.z < -0.06;
    const avoid = [
      ...nucPos.map(([x, y]) => ({ c: new THREE.Vector3(x, y, 0), r: 0.62 })),
      ...mitoDefs.map(([x, y]) => ({ c: new THREE.Vector3(x, y, 0), r: 0.62 })),
      { c: new THREE.Vector3(-5.0, 0.18, 0), r: 1.75 }, { c: new THREE.Vector3(-0.95, 0.4, 0), r: 0.7 },
      { c: new THREE.Vector3(SEPTUM, 0, 0), r: 0.3 },
    ];
    const glyPts = scatter(rand, 70, (p) => inHypha(p) && Math.abs(p.x - SEPTUM) > 0.22, [new THREE.Vector3(X0, -CY, -CY), new THREE.Vector3(X1, CY, -0.06)], avoid);
    const glycogen = instanced(ctx.track(new THREE.SphereGeometry(0.06, 8, 6)), mDense, glyPts);
    root.add(glycogen);

    // ---------- a branching hypha behind (uncut), part of the mycelium ----------
    const mycelium = new THREE.Group();
    const main: [number, number, number][] = [[-12, -5.3, -4.8], [-6, -5.5, -4.5], [0, -5.6, -4.6], [6, -5.2, -4.4], [12, -4.9, -4.7]];
    const branch: [number, number, number][] = [[1.0, -5.6, -4.6], [2.6, -6.6, -4.2], [4.4, -7.5, -3.8], [5.6, -8.0, -3.6]];
    mycelium.add(new THREE.Mesh(pathTube(ctx, main, 0.9, 60), mBack), new THREE.Mesh(pathTube(ctx, branch, 0.8, 40), mBack));
    const tip = new THREE.Mesh(ctx.track(new THREE.SphereGeometry(0.8, 20, 14)), mBack);
    tip.position.set(...branch[branch.length - 1]!);
    mycelium.add(tip);
    root.add(mycelium);

    // ---------- anchors ----------
    const ves = vesPts.reduce((b, p) => (p.distanceTo(new THREE.Vector3(5.1, -0.3, -0.2)) < b.distanceTo(new THREE.Vector3(5.1, -0.3, -0.2)) ? p : b), vesPts[0]!);
    const glyT = new THREE.Vector3(-0.4, -0.8, -0.3);
    const gly = glyPts.reduce((b, p) => (p.distanceTo(glyT) < b.distanceTo(glyT) ? p : b), glyPts[0]!);
    const n1 = nucParts[1]!;
    const anchors = {
      wall: { object: anchorAt(root, -6.5, R - WT / 2, 0.02, 'wall'), highlight: [wall] },
      membrane: { object: anchorAt(root, 3.2, -(MEM[0] + MEM[1]) / 2, 0.02, 'membrane'), highlight: [membrane] },
      septum: { object: anchorAt(root, SEPTUM, 1.0, 0.03, 'septum'), highlight: [septum] },
      pore: { object: anchorAt(root, SEPTUM, -0.05, -0.15, 'pore'), highlight: [septum] },
      nucleus: { object: anchorAt(root, nucPos[1]![0] + 0.2, nucPos[1]![1] + 0.4, 0.02, 'nucleus'), highlight: [nuclei] },
      vacuole: { object: anchorAt(root, -5.0, 0.25, -0.45, 'vacuole'), highlight: [vacuoles, tonoplast] },
      tip: { object: anchorAt(root, X1 + R * Math.cos(1.0), R * Math.sin(1.0), 0.02, 'tip'), highlight: [wall] },
      vesicles: { object: anchorAt(root, ves.x, ves.y, ves.z, 'vesicles'), highlight: [vesicles] },
      mitochondrion: { object: anchorAt(root, -4.25 - 0.22 * Math.sin(0.05), -0.74 + 0.22 * Math.cos(0.05), 0.02, 'mitochondrion'), highlight: [mitos] },
      glycogen: { object: anchorAt(root, gly.x, gly.y, gly.z, 'glycogen'), highlight: [glycogen] },
      mycelium: { object: anchorAt(root, 3.4, -7.05 + 0.8, -4.0, 'mycelium'), highlight: [mycelium] },
    };
    void n1;
    return { anchors, dispose() { root.removeFromParent(); } };
  },
};

export default scene;
